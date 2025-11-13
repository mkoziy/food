import {ref} from 'vue';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

// Shared state across component instances
let db = null;
let sqlite3 = null;
const loading = ref(false);
const loadingMessage = ref('');
const dbStats = ref({count: 0});

export function useDatabase() {
    /**
     * Initialize SQLite wasm module
     */
    async function initSqlite() {
        if (sqlite3) return sqlite3;

        try {
            sqlite3 = await sqlite3InitModule({
                print: console.log,
                printErr: console.error,
            });
            console.log('SQLite wasm initialized:', sqlite3.version.libVersion);
            return sqlite3;
        } catch (err) {
            console.error('Failed to initialize SQLite:', err);
            throw err;
        }
    }

    /**
     * Load database from static file server
     */
    async function loadData() {
        loading.value = true;
        loadingMessage.value = 'Initializing SQLite...';

        try {
            // Initialize SQLite if not already done
            await initSqlite();

            loadingMessage.value = 'Downloading database...';

            // Fetch the database file from public directory
            const response = await fetch('/data.sqlite');
            if (!response.ok) {
                throw new Error(`Failed to fetch database: ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            loadingMessage.value = 'Loading database...';

            // Close existing database if any
            if (db) {
                db.close();
            }

            // Create database from downloaded file
            const p = sqlite3.wasm.allocFromTypedArray(uint8Array);
            db = new sqlite3.oo1.DB();

            const rc = sqlite3.capi.sqlite3_deserialize(
                db.pointer,
                'main',
                p,
                uint8Array.byteLength,
                uint8Array.byteLength,
                sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE
            );

            if (rc !== 0) {
                throw new Error(`Failed to deserialize database: ${sqlite3.capi.sqlite3_errstr(rc)}`);
            }

            console.log('Database loaded successfully');

            // Update stats
            await updateStats();

            return true;
        } catch (error) {
            console.error('Error loading database:', error);
            throw error;
        } finally {
            loading.value = false;
            loadingMessage.value = '';
        }
    }

    /**
     * Update database statistics
     */
    async function updateStats() {
        if (!db) {
            dbStats.value = {count: 0};
            return;
        }

        try {
            const result = db.exec({
                sql: 'SELECT COUNT(*) as count FROM food',
                returnValue: 'resultRows',
                rowMode: 'object'
            });

            if (result && result.length > 0) {
                dbStats.value = {count: result[0].count};
            }
        } catch (error) {
            console.error('Error updating stats:', error);
            dbStats.value = {count: 0};
        }
    }

    /**
     * Query products with filters and pagination
     */
    async function queryProducts(filters, page = 1, limit = 20) {
        if (!db) {
            return {products: [], totalCount: 0, totalPages: 0};
        }

        try {
            const offset = (page - 1) * limit;
            const params = {};
            let fromClause = 'FROM food f';
            const whereConditions = [];

            // Use FTS for search if provided
            if (filters.search && filters.search.trim()) {
                fromClause = `
                    FROM food_fts fts
                    JOIN food f ON f.id = fts.id
                `;
                whereConditions.push('food_fts MATCH :search');
                params[':search'] = filters.search.trim() + '*';
            }

            // Filter by brands (using brand IDs)
            if (filters.brands && filters.brands.length > 0) {
                const brandIds = filters.brands.map(b => typeof b === 'object' ? b.id : b);
                const brandPlaceholders = brandIds.map((id, idx) => {
                    const key = `:brand${idx}`;
                    params[key] = id;
                    return key;
                }).join(',');

                whereConditions.push(`f.id IN (
                    SELECT food_id FROM brand_food
                    WHERE brand_id IN (${brandPlaceholders})
                )`);
            }

            // Filter by categories (using category IDs)
            if (filters.categories && filters.categories.length > 0) {
                const categoryIds = filters.categories.map(c => typeof c === 'object' ? c.id : c);
                const categoryPlaceholders = categoryIds.map((id, idx) => {
                    const key = `:category${idx}`;
                    params[key] = id;
                    return key;
                }).join(',');

                whereConditions.push(`f.id IN (
                    SELECT food_id FROM category_food
                    WHERE category_id IN (${categoryPlaceholders})
                )`);
            }

            // Filter by stores (using store IDs)
            if (filters.stores && filters.stores.length > 0) {
                const storeIds = filters.stores.map(s => typeof s === 'object' ? s.id : s);
                const storePlaceholders = storeIds.map((id, idx) => {
                    const key = `:store${idx}`;
                    params[key] = id;
                    return key;
                }).join(',');

                whereConditions.push(`f.id IN (
                    SELECT food_id FROM store_food
                    WHERE store_id IN (${storePlaceholders})
                )`);
            }

            const whereClause = whereConditions.length > 0
                ? `WHERE ${whereConditions.join(' AND ')}`
                : '';

            // Get total count
            const countSql = `
                SELECT COUNT(*) as count
                ${fromClause}
                ${whereClause}
            `;

            const countResult = db.exec({
                sql: countSql,
                bind: params,
                returnValue: 'resultRows',
                rowMode: 'object'
            });

            const totalCount = countResult && countResult.length > 0
                ? countResult[0].count
                : 0;

            // Get paginated results
            const dataSql = `
                SELECT
                    f.id,
                    f.name,
                    f.url,
                    f.brands,
                    f.categories,
                    f.stores,
                    f.fat,
                    f.protein,
                    f.carbs,
                    f.energy,
                    f.protein_fat_index
                ${fromClause}
                ${whereClause}
                ${filters.search && filters.search.trim() ? 'ORDER BY fts.rank' : 'ORDER BY f.name'}
                LIMIT :limit OFFSET :offset
            `;

            const products = db.exec({
                sql: dataSql,
                bind: {...params, ':limit': limit, ':offset': offset},
                returnValue: 'resultRows',
                rowMode: 'object'
            });

            return {
                products: products || [],
                totalCount,
                totalPages: Math.ceil(totalCount / limit)
            };
        } catch (error) {
            console.error('Error querying products:', error);
            return {products: [], totalCount: 0, totalPages: 0};
        }
    }

    /**
     * Get unique brands with optional search
     */
    async function getUniqueBrands(searchQuery = '') {
        if (!db) return [];

        try {
            let sql, params = {};

            if (searchQuery && searchQuery.trim()) {
                // Use FTS table for search
                sql = `
                    SELECT rowid as id, brand
                    FROM brands_fts
                    WHERE brand MATCH :search
                    ORDER BY rank
                    LIMIT 100
                `;
                params[':search'] = searchQuery.trim() + '*';
            } else {
                // Return all brands when no search query
                sql = `
                    SELECT id, brand
                    FROM brands
                    ORDER BY brand ASC
                    LIMIT 100
                `;
            }

            const results = db.exec({
                sql,
                bind: params,
                returnValue: 'resultRows',
                rowMode: 'object'
            });

            return results ? results.filter(row => row.brand) : [];
        } catch (error) {
            console.error('Error getting unique brands:', error);
            return [];
        }
    }

    /**
     * Get unique categories with optional search
     */
    async function getUniqueCategories(searchQuery = '') {
        if (!db) return [];

        try {
            let sql, params = {};

            if (searchQuery && searchQuery.trim()) {
                // Use FTS table for search
                sql = `
                    SELECT rowid as id, category
                    FROM categories_fts
                    WHERE category MATCH :search
                    ORDER BY rank
                    LIMIT 100
                `;
                params[':search'] = searchQuery.trim() + '*';
            } else {
                // Return all categories when no search query
                sql = `
                    SELECT id, category
                    FROM categories
                    ORDER BY category ASC
                    LIMIT 100
                `;
            }

            const results = db.exec({
                sql,
                bind: params,
                returnValue: 'resultRows',
                rowMode: 'object'
            });

            return results ? results.filter(row => row.category) : [];
        } catch (error) {
            console.error('Error getting unique categories:', error);
            return [];
        }
    }

    /**
     * Get unique stores with optional search
     */
    async function getUniqueStores(searchQuery = '') {
        if (!db) return [];

        try {
            let sql, params = {};

            if (searchQuery && searchQuery.trim()) {
                // Use FTS table for search
                sql = `
                    SELECT rowid as id, store
                    FROM stores_fts
                    WHERE store MATCH :search
                    ORDER BY rank
                    LIMIT 100
                `;
                params[':search'] = searchQuery.trim() + '*';
            } else {
                // Return all stores when no search query
                sql = `
                    SELECT id, store
                    FROM stores
                    ORDER BY store ASC
                    LIMIT 100
                `;
            }

            const results = db.exec({
                sql,
                bind: params,
                returnValue: 'resultRows',
                rowMode: 'object'
            });

            return results ? results.filter(row => row.store) : [];
        } catch (error) {
            console.error('Error getting unique stores:', error);
            return [];
        }
    }

    /**
     * Check if database has data
     */
    async function hasData() {
        return db !== null && dbStats.value.count > 0;
    }

    /**
     * Clear database
     */
    async function clearDatabase() {
        if (db) {
            db.close();
            db = null;
            dbStats.value = {count: 0};
            return true;
        }
        return false;
    }

    return {
        loading,
        loadingMessage,
        dbStats,
        loadData,
        clearDatabase,
        updateStats,
        queryProducts,
        getUniqueBrands,
        getUniqueCategories,
        getUniqueStores,
        hasData
    };
}
