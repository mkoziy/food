import {ref} from 'vue';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

// Shared state across component instances
let db = null;
let sqlite3 = null;
const loading = ref(false);
const loadingMessage = ref('');
const dbStats = ref({count: 0});

// Cache configuration
const CACHE_NAME = 'food-database-cache';
const CACHE_VERSION = 1;
const DB_CACHE_KEY = 'database-data';

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
     * Open IndexedDB for caching
     */
    async function openCacheDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(CACHE_NAME, CACHE_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('databases')) {
                    db.createObjectStore('databases');
                }
            };
        });
    }

    /**
     * Get cached database
     */
    async function getCachedDatabase() {
        try {
            const cacheDB = await openCacheDB();
            return new Promise((resolve, reject) => {
                const transaction = cacheDB.transaction(['databases'], 'readonly');
                const store = transaction.objectStore('databases');
                const request = store.get(DB_CACHE_KEY);

                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
            });
        } catch (error) {
            console.error('Error getting cached database:', error);
            return null;
        }
    }

    /**
     * Cache database
     */
    async function cacheDatabase(data) {
        try {
            const cacheDB = await openCacheDB();
            return new Promise((resolve, reject) => {
                const transaction = cacheDB.transaction(['databases'], 'readwrite');
                const store = transaction.objectStore('databases');
                const request = store.put(data, DB_CACHE_KEY);

                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(true);
            });
        } catch (error) {
            console.error('Error caching database:', error);
            return false;
        }
    }

    /**
     * Clear database cache
     */
    async function clearDatabaseCache() {
        try {
            const cacheDB = await openCacheDB();
            return new Promise((resolve, reject) => {
                const transaction = cacheDB.transaction(['databases'], 'readwrite');
                const store = transaction.objectStore('databases');
                const request = store.delete(DB_CACHE_KEY);

                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(true);
            });
        } catch (error) {
            console.error('Error clearing cache:', error);
            return false;
        }
    }

    /**
     * Load database from static file server
     */
    async function loadData() {
        loading.value = true;
        loadingMessage.value = 'Initializing database...';

        try {
            // Initialize SQLite if not already done
            await initSqlite();

            // Check for cached database first
            loadingMessage.value = 'Checking cache...';
            const cachedData = await getCachedDatabase();

            let uint8Array;

            if (cachedData) {
                console.log('Loading database from cache');
                loadingMessage.value = 'Loading from cache...';
                uint8Array = new Uint8Array(cachedData);
            } else {
                console.log('Downloading database from server');
                loadingMessage.value = 'Downloading database...';

                // Fetch the database file from public directory
                const response = await fetch('/data.sqlite');
                if (!response.ok) {
                    throw new Error(`Failed to fetch database: ${response.statusText}`);
                }

                const arrayBuffer = await response.arrayBuffer();
                uint8Array = new Uint8Array(arrayBuffer);

                // Cache the downloaded database
                loadingMessage.value = 'Caching database...';
                await cacheDatabase(arrayBuffer);
                console.log('Database cached successfully');
            }

            loadingMessage.value = 'Loading database...';

            // Close existing database if any
            if (db) {
                db.close();
                db = null;
            }

            // Create in-memory database
            db = new sqlite3.oo1.DB(':memory:');

            // Use the lower-level API to load the data
            const pMem = sqlite3.wasm.alloc(uint8Array.length);

            // Copy data in chunks to avoid detached buffer issues
            const chunkSize = 1024 * 1024; // 1MB chunks
            for (let i = 0; i < uint8Array.length; i += chunkSize) {
                const end = Math.min(i + chunkSize, uint8Array.length);
                const chunk = uint8Array.slice(i, end);
                sqlite3.wasm.heap8().set(chunk, pMem + i);
            }

            // Deserialize the database
            const rc = sqlite3.capi.sqlite3_deserialize(
                db.pointer,
                'main',
                pMem,
                uint8Array.length,
                uint8Array.length,
                sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE |
                sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE
            );

            if (rc !== 0) {
                sqlite3.wasm.dealloc(pMem);
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
    async function queryProducts(filters, page = 1, limit = 21, sort = null) {
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
                    JOIN food f ON f.id = fts.rowid
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

            // Build ORDER BY clause
            let orderByClause;
            if (sort && Array.isArray(sort) && sort.length > 0) {
                // Use custom multi-field sort
                const orderByClauses = sort.map(s => {
                    const direction = s.direction.toUpperCase();
                    return `f.${s.field} ${direction} NULLS LAST`;
                });
                orderByClause = `ORDER BY ${orderByClauses.join(', ')}`;
            } else if (filters.search && filters.search.trim()) {
                // Use FTS rank when searching
                orderByClause = 'ORDER BY fts.rank';
            } else {
                // Default to name
                orderByClause = 'ORDER BY f.name';
            }

            // Get paginated results
            const dataSql = `
                SELECT
                    f.id,
                    f.name,
                    f.url,
                    f.image_url,
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
                ${orderByClause}
                LIMIT :limit OFFSET :offset
            `;

            console.log(dataSql);

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
     * Clear database and cache
     */
    async function clearDatabase() {
        if (db) {
            db.close();
            db = null;
            dbStats.value = {count: 0};
        }
        // Also clear the cache
        await clearDatabaseCache();
        console.log('Database and cache cleared');
        return true;
    }

    return {
        loading,
        loadingMessage,
        dbStats,
        loadData,
        clearDatabase,
        clearDatabaseCache,
        updateStats,
        queryProducts,
        getUniqueBrands,
        getUniqueCategories,
        getUniqueStores,
        hasData
    };
}
