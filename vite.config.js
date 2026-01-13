import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
import {resolve} from 'path';
import {copyFileSync, existsSync, mkdirSync} from 'fs';

// Copy SQLite WASM files to public directory before build
const sqliteWasmPath = 'node_modules/@sqlite.org/sqlite-wasm/sqlite-wasm/jswasm';
const publicSqlitePath = 'public/sqlite-wasm';

if (!existsSync(publicSqlitePath)) {
    mkdirSync(publicSqlitePath, {recursive: true});
}

// Copy all necessary SQLite files
['sqlite3.wasm', 'sqlite3.js', 'sqlite3-worker1.js', 'sqlite3.mjs', 'sqlite3-worker1.mjs', 'sqlite3-worker1-promiser.mjs'].forEach(file => {
    const sourcePath = `${sqliteWasmPath}/${file}`;
    if (existsSync(sourcePath)) {
        copyFileSync(sourcePath, `${publicSqlitePath}/${file}`);
    }
});

// Plugin to serve WASM files with correct MIME type
const wasmContentTypePlugin = {
    name: 'wasm-content-type-plugin',
    configureServer(server) {
        server.middlewares.use((req, res, next) => {
            if (req.url.endsWith('.wasm')) {
                res.setHeader('Content-Type', 'application/wasm');
            }
            next();
        });
    },
    configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
            if (req.url.endsWith('.wasm')) {
                res.setHeader('Content-Type', 'application/wasm');
            }
            next();
        });
    }
};

export default defineConfig({
    plugins: [vue(), wasmContentTypePlugin],
    root: 'src',
    server: {
        port: 3000,
        open: true,
        headers: {
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Embedder-Policy": "require-corp",
        }
    },
    preview: {
        port: 4173,
        headers: {
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Embedder-Policy": "require-corp",
        }
    },
    assetsInclude: ['**/*.wasm'],
    worker: {
        format: 'es'
    },
    publicDir: resolve(__dirname, 'public'),
    build: {
        outDir: resolve(__dirname, 'dist'),
        assetsDir: 'assets',
        emptyOutDir: true,
        rollupOptions: {
            external: ['/sqlite-wasm/sqlite3.mjs'],
            output: {
                manualChunks: {
                    'vue': ['vue']
                }
            }
        }
    }
});
