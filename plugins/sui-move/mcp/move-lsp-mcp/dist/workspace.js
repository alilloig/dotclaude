/**
 * Workspace resolution with LRU caching
 * Finds the workspace root (directory containing Move.toml) for a given file
 */
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { NoWorkspaceError } from './errors.js';
import { log } from './logger.js';
/**
 * Workspace resolver with LRU caching
 * Resolves file paths to their Move workspace root (directory containing Move.toml)
 * Caches by workspace root (not file path) per the contract: "max 3 workspace roots"
 */
export class WorkspaceResolver {
    maxCacheSize;
    // Cache maps workspace root -> access metadata (LRU cache of workspace roots)
    cache = new Map();
    accessCounter = 0;
    hits = 0;
    misses = 0;
    constructor(maxCacheSize = 3) {
        this.maxCacheSize = maxCacheSize;
    }
    /**
     * Resolve a file path to its workspace root
     * Returns the directory containing Move.toml
     * @throws NoWorkspaceError if no Move.toml is found in any parent directory
     */
    resolve(filePath) {
        const resolvedPath = resolve(filePath);
        // First, find the workspace root for this file
        const workspaceRoot = this.findWorkspaceRoot(resolvedPath);
        // Check if this workspace root is already cached
        const cached = this.cache.get(workspaceRoot);
        if (cached) {
            this.hits++;
            cached.lastAccess = ++this.accessCounter;
            log('debug', 'Workspace cache hit', {
                event: 'workspace_cache_hit',
                filePath: resolvedPath,
                workspaceRoot,
            });
            return workspaceRoot;
        }
        // Cache miss - this is a new workspace root
        this.misses++;
        log('debug', 'Workspace cache miss', {
            event: 'workspace_cache_miss',
            filePath: resolvedPath,
            workspaceRoot,
        });
        // Evict LRU entry if cache is full
        if (this.cache.size >= this.maxCacheSize) {
            this.evictLRU();
        }
        // Store workspace root in cache (keyed by workspace root, not file path)
        this.cache.set(workspaceRoot, {
            workspaceRoot,
            lastAccess: ++this.accessCounter,
        });
        return workspaceRoot;
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            hits: this.hits,
            misses: this.misses,
            size: this.cache.size,
        };
    }
    /**
     * Clear the cache and reset statistics
     */
    clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
        this.accessCounter = 0;
    }
    /**
     * Find workspace root by traversing parent directories
     */
    findWorkspaceRoot(filePath) {
        let currentDir = dirname(filePath);
        while (currentDir !== '/' && currentDir !== '.') {
            const moveTomlPath = resolve(currentDir, 'Move.toml');
            if (existsSync(moveTomlPath)) {
                return currentDir;
            }
            const parentDir = dirname(currentDir);
            if (parentDir === currentDir)
                break; // Reached filesystem root
            currentDir = parentDir;
        }
        throw new NoWorkspaceError(filePath);
    }
    /**
     * Evict the least recently used cache entry
     */
    evictLRU() {
        let lruKey = null;
        let lruAccess = Infinity;
        for (const [key, entry] of this.cache) {
            if (entry.lastAccess < lruAccess) {
                lruAccess = entry.lastAccess;
                lruKey = key;
            }
        }
        if (lruKey) {
            this.cache.delete(lruKey);
        }
    }
}
//# sourceMappingURL=workspace.js.map