package main

import (
	"context"
	"database/sql"
	"encoding/csv"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"math"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	_ "modernc.org/sqlite"
)

type row struct {
	name, url, imageUrl, brands, categories, stores sql.NullString
	fat, protein, carbs, energy                     sql.NullFloat64
	proteinFatIndex                                 sql.NullFloat64
}

func main() {
	csvPath := flag.String("csv", "", "path to input CSV file")
	sqlitePath := flag.String("sqlite", "", "path to output sqlite file")
	batchSize := flag.Int("batch", 10000, "number of rows per batch to insert")
	flag.Parse()

	if *csvPath == "" || *sqlitePath == "" {
		flag.Usage()
		os.Exit(2)
	}

	ctx := context.Background()

	absCSV := expandPath(*csvPath)
	absSQLite := expandPath(*sqlitePath)

	log.Printf("CSV: %s", absCSV)
	log.Printf("SQLite: %s", absSQLite)

	// Open SQLite database
	db, err := sql.Open("sqlite", absSQLite)
	if err != nil {
		log.Fatalf("open sqlite: %v", err)
	}
	defer func() { _ = db.Close() }()

	// Drop all tables (including pivot tables and FTS5 indexes) to start fresh
	dropSQL := `
DROP TABLE IF EXISTS food_fts;
DROP TABLE IF EXISTS brands_fts;
DROP TABLE IF EXISTS categories_fts;
DROP TABLE IF EXISTS stores_fts;
DROP TABLE IF EXISTS brand_food;
DROP TABLE IF EXISTS category_food;
DROP TABLE IF EXISTS store_food;
DROP TABLE IF EXISTS food;
DROP TABLE IF EXISTS brands;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS stores;`
	if _, err := db.Exec(dropSQL); err != nil {
		log.Fatalf("drop tables: %v", err)
	}

	createSQL := `
CREATE TABLE food (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT,
	url TEXT,
	image_url TEXT,
	brands JSON,
	categories JSON,
	stores JSON,
	fat DOUBLE NOT NULL,
	protein DOUBLE NOT NULL,
	carbs DOUBLE NOT NULL,
	energy DOUBLE NOT NULL,
	protein_fat_index DOUBLE
);`
	if _, err := db.Exec(createSQL); err != nil {
		log.Fatalf("create food: %v", err)
	}

	// Read and process CSV file
	csvFile, err := os.Open(absCSV)
	if err != nil {
		log.Fatalf("open csv: %v", err)
	}
	defer csvFile.Close()

	reader := csv.NewReader(csvFile)
	reader.Comma = '\t'         // OpenFoodFacts uses tab-separated values
	reader.LazyQuotes = true    // Handle improperly quoted fields
	reader.FieldsPerRecord = -1 // Allow variable number of fields
	reader.ReuseRecord = true   // Reuse backing array for better performance

	// Read header to get column indices
	header, err := reader.Read()
	if err != nil {
		log.Fatalf("read csv header: %v", err)
	}

	// Find column indices
	colIndex := make(map[string]int)
	for i, name := range header {
		colIndex[name] = i
	}

	// Required columns
	requiredCols := []string{
		"product_name", "url", "image_url", "brands", "categories", "stores",
		"countries_en", "completeness",
		"fat_100g", "proteins_100g", "carbohydrates_100g", "energy-kcal_100g",
	}

	for _, col := range requiredCols {
		if _, exists := colIndex[col]; !exists {
			log.Printf("Warning: column %s not found in CSV", col)
		}
	}

	var batch []row
	lineNum := 1 // Start at 1 (header is line 0)

	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			log.Printf("Warning: skipping malformed line %d: %v", lineNum+1, err)
			lineNum++
			continue
		}
		lineNum++

		countriesEn := getColumn(record, colIndex, "countries_en")
		if !strings.Contains(countriesEn, "Germany") {
			continue
		}

		completeness, err := strconv.ParseFloat(getColumn(record, colIndex, "completeness"), 64)
		if err != nil || completeness < 0.8 {
			continue
		}

		// Get required fields
		name := getColumn(record, colIndex, "product_name")

		url := getColumn(record, colIndex, "url")
		imageUrl := getColumn(record, colIndex, "image_url")
		brands := getColumn(record, colIndex, "brands")
		categories := getColumn(record, colIndex, "categories")
		stores := getColumn(record, colIndex, "stores")

		if name == "" {
			name = brands
		}

		fat, err := parseFloat(getColumn(record, colIndex, "fat_100g"))
		if err != nil || !fat.Valid {
			fat = sql.NullFloat64{Valid: true, Float64: 0}
		}
		fat = fixOcrIssues(fat)

		protein, err := parseFloat(getColumn(record, colIndex, "proteins_100g"))
		if err != nil || !protein.Valid {
			protein = sql.NullFloat64{Valid: true, Float64: 0}
		}
		protein = fixOcrIssues(protein)

		carbs, err := parseFloat(getColumn(record, colIndex, "carbohydrates_100g"))
		if err != nil || !carbs.Valid {
			carbs = sql.NullFloat64{Valid: true, Float64: 0}
		}
		carbs = fixOcrIssues(carbs)

		energy, err := parseFloat(getColumn(record, colIndex, "energy-kcal_100g"))
		if err != nil || !energy.Valid {
			energy = sql.NullFloat64{Valid: true, Float64: 0}
		}

		// Calculate protein/fat index
		var proteinFatIndex sql.NullFloat64
		proteinFatIndex.Valid = false
		if fat.Valid && fat.Float64 != 0 && protein.Valid {
			proteinFatIndex.Float64 = protein.Float64 / fat.Float64
			proteinFatIndex.Valid = true
		}

		// Format JSON arrays
		brandsJSON := formatJSONArray(brands)
		categoriesJSON := formatJSONArray(categories)
		storesJSON := formatJSONArray(stores)

		batch = append(batch, row{
			name:            toNullString(name),
			url:             toNullString(url),
			imageUrl:        toNullString(imageUrl),
			brands:          brandsJSON,
			categories:      categoriesJSON,
			stores:          storesJSON,
			fat:             fat,
			protein:         protein,
			carbs:           carbs,
			energy:          energy,
			proteinFatIndex: proteinFatIndex,
		})

		if len(batch) >= *batchSize {
			if err := flushRows(db, batch); err != nil {
				log.Fatalf("flush batch: %v", err)
			}
			log.Printf("Inserted %d rows (batch)", *batchSize)
			batch = batch[:0]
		}
	}

	// Flush remaining rows
	if len(batch) > 0 {
		if err := flushRows(db, batch); err != nil {
			log.Fatalf("final flush: %v", err)
		}
		log.Printf("Inserted %d rows (final)", len(batch))
	}

	log.Printf("Creating indexes...")
	err = createIndexes(db)
	if err != nil {
		log.Fatalf("create indexes: %v", err)
	}
	log.Printf("Done!")

	_ = ctx
}

// Can be more than 100 but should not. It means OCR errors. 10,3g was parsed as 103g
func fixOcrIssues(n sql.NullFloat64) sql.NullFloat64 {
	if n.Valid && n.Float64 > 100 {
		return sql.NullFloat64{Float64: n.Float64 / 10.0, Valid: true}
	}

	return n
}

func createIndexes(db *sql.DB) error {
	arrayIndexesSQL := `
BEGIN;

-- distinct lookup tables with auto-increment IDs
CREATE TABLE IF NOT EXISTS brands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store TEXT NOT NULL UNIQUE
);

-- populate lookup tables
INSERT OR IGNORE INTO brands (brand)
SELECT DISTINCT trim(value) AS brand
FROM food
CROSS JOIN json_each(food.brands)
WHERE food.brands IS NOT NULL
  AND value IS NOT NULL
  AND trim(value) <> '';

INSERT OR IGNORE INTO categories (category)
SELECT DISTINCT trim(value) AS category
FROM food
CROSS JOIN json_each(food.categories)
WHERE food.categories IS NOT NULL
  AND value IS NOT NULL
  AND trim(value) <> '';

INSERT OR IGNORE INTO stores (store)
SELECT DISTINCT trim(value) AS store
FROM food
CROSS JOIN json_each(food.stores)
WHERE food.stores IS NOT NULL
  AND value IS NOT NULL
  AND trim(value) <> '';

-- pivot tables with foreign keys
CREATE TABLE IF NOT EXISTS brand_food (
  brand_id INTEGER NOT NULL,
  food_id INTEGER NOT NULL,
  FOREIGN KEY (brand_id) REFERENCES brands(id),
  FOREIGN KEY (food_id) REFERENCES food(id)
);

CREATE TABLE IF NOT EXISTS category_food (
  category_id INTEGER NOT NULL,
  food_id INTEGER NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (food_id) REFERENCES food(id)
);

CREATE TABLE IF NOT EXISTS store_food (
  store_id INTEGER NOT NULL,
  food_id INTEGER NOT NULL,
  FOREIGN KEY (store_id) REFERENCES stores(id),
  FOREIGN KEY (food_id) REFERENCES food(id)
);

-- populate pivot tables (use DISTINCT to avoid duplicates)
INSERT INTO brand_food (brand_id, food_id)
SELECT DISTINCT
  b.id AS brand_id,
  food.id AS food_id
FROM food
CROSS JOIN json_each(food.brands)
JOIN brands b ON b.brand = trim(value)
WHERE food.brands IS NOT NULL
  AND value IS NOT NULL
  AND trim(value) <> '';

INSERT INTO category_food (category_id, food_id)
SELECT DISTINCT
  c.id AS category_id,
  food.id AS food_id
FROM food
CROSS JOIN json_each(food.categories)
JOIN categories c ON c.category = trim(value)
WHERE food.categories IS NOT NULL
  AND value IS NOT NULL
  AND trim(value) <> '';

INSERT INTO store_food (store_id, food_id)
SELECT DISTINCT
  s.id AS store_id,
  food.id AS food_id
FROM food
CROSS JOIN json_each(food.stores)
JOIN stores s ON s.store = trim(value)
WHERE food.stores IS NOT NULL
  AND value IS NOT NULL
  AND trim(value) <> '';

-- create indexes on pivot tables
CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_food_unique ON brand_food(brand_id, food_id);
CREATE INDEX IF NOT EXISTS idx_brand_food_brand_id ON brand_food(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_food_food_id ON brand_food(food_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_category_food_unique ON category_food(category_id, food_id);
CREATE INDEX IF NOT EXISTS idx_category_food_category_id ON category_food(category_id);
CREATE INDEX IF NOT EXISTS idx_category_food_food_id ON category_food(food_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_store_food_unique ON store_food(store_id, food_id);
CREATE INDEX IF NOT EXISTS idx_store_food_store_id ON store_food(store_id);
CREATE INDEX IF NOT EXISTS idx_store_food_food_id ON store_food(food_id);

-- FTS5 full-text search indexes
-- Food search by name
CREATE VIRTUAL TABLE IF NOT EXISTS food_fts USING fts5(
  name,
  content='food',
  content_rowid='id'
);

INSERT INTO food_fts(rowid, name)
SELECT id, name FROM food WHERE name IS NOT NULL;

-- Brand search
CREATE VIRTUAL TABLE IF NOT EXISTS brands_fts USING fts5(
  brand,
  content='brands',
  content_rowid='id'
);

INSERT INTO brands_fts(rowid, brand)
SELECT id, brand FROM brands;

-- Category search
CREATE VIRTUAL TABLE IF NOT EXISTS categories_fts USING fts5(
  category,
  content='categories',
  content_rowid='id'
);

INSERT INTO categories_fts(rowid, category)
SELECT id, category FROM categories;

-- Store search
CREATE VIRTUAL TABLE IF NOT EXISTS stores_fts USING fts5(
  store,
  content='stores',
  content_rowid='id'
);

INSERT INTO stores_fts(rowid, store)
SELECT id, store FROM stores;

COMMIT;`

	if _, err := db.Exec(arrayIndexesSQL); err != nil {
		return fmt.Errorf("exec array indexes: %v", err)
	}

	return nil
}

func expandPath(p string) string {
	if strings.HasPrefix(p, "~") {
		home, err := os.UserHomeDir()
		if err == nil {
			return filepath.Join(home, strings.TrimPrefix(p, "~"))
		}
	}
	abs, err := filepath.Abs(p)
	if err != nil {
		return p
	}
	return abs
}

func sqlEscape(p string) string {
	return strings.ReplaceAll(p, "'", "''")
}

func buildInsertSQL(n int) string {
	if n <= 0 {
		return ""
	}

	const perRow = `(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	vals := make([]string, n)

	for i := 0; i < n; i++ {
		vals[i] = perRow
	}

	return `INSERT INTO food (name, url, image_url, brands, categories, stores, fat, protein, carbs, energy, protein_fat_index) VALUES ` + strings.Join(vals, ",") + `;`
}

func valString(ns sql.NullString) interface{} {
	if ns.Valid {
		return ns.String
	}
	return nil
}

func valFloat(nf sql.NullFloat64) interface{} {
	if nf.Valid {
		return nf.Float64
	}
	return nil
}

func flushRows(db *sql.DB, rows []row) error {
	if len(rows) == 0 {
		return nil
	}

	// SQLite has a limit of ~999 bind parameters
	// Each row has 10 fields, so max ~99 rows per insert
	const maxRowsPerInsert = 90 // Conservative limit to stay well under 999

	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	// Split into chunks if needed
	for i := 0; i < len(rows); i += maxRowsPerInsert {
		end := i + maxRowsPerInsert
		if end > len(rows) {
			end = len(rows)
		}
		chunk := rows[i:end]

		insertSQL := buildInsertSQL(len(chunk))
		args := make([]interface{}, 0, len(chunk)*10)
		for _, r := range chunk {
			args = append(args,
				valString(r.name),
				valString(r.url),
				valString(r.imageUrl),
				valString(r.brands),
				valString(r.categories),
				valString(r.stores),
				valFloat(r.fat),
				valFloat(r.protein),
				valFloat(r.carbs),
				valFloat(r.energy),
				valFloat(r.proteinFatIndex),
			)
		}

		if _, err := tx.Exec(insertSQL, args...); err != nil {
			return fmt.Errorf("exec batch insert: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}
	return nil
}

// Helper functions for CSV processing
func getColumn(record []string, colIndex map[string]int, name string) string {
	if idx, exists := colIndex[name]; exists && idx < len(record) {
		return record[idx]
	}
	return ""
}

func parseFloat(s string) (sql.NullFloat64, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return sql.NullFloat64{Valid: false}, nil
	}

	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return sql.NullFloat64{Valid: false}, err
	}

	// Round to 2 decimal places
	f = math.Round(f*100) / 100

	return sql.NullFloat64{Float64: f, Valid: true}, nil
}

func toNullString(s string) sql.NullString {
	if s == "" {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: s, Valid: true}
}

func formatJSONArray(s string) sql.NullString {
	s = strings.TrimSpace(s)
	if s == "" {
		return sql.NullString{Valid: false}
	}

	// Split by comma and clean up parts
	parts := strings.Split(s, ",")
	var cleanParts []string
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			cleanParts = append(cleanParts, part)
		}
	}

	// If no valid parts, return NULL
	if len(cleanParts) == 0 {
		return sql.NullString{Valid: false}
	}

	// Properly encode as JSON array without HTML escaping
	var buf strings.Builder
	encoder := json.NewEncoder(&buf)
	encoder.SetEscapeHTML(false) // Don't escape &, <, > as \uXXXX

	if err := encoder.Encode(cleanParts); err != nil {
		// Fallback to empty array if encoding fails
		return sql.NullString{String: "[]", Valid: true}
	}

	// Encoder adds a newline, trim it
	jsonStr := strings.TrimSpace(buf.String())
	return sql.NullString{String: jsonStr, Valid: true}
}
