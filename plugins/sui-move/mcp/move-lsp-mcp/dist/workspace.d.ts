/**
 * Workspace resolution with LRU caching
 * Finds the workspace root (directory containing Move.toml) for a given file
 */
/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
    hits: number;
    misses: number;
    size: number;
}
/**
 * Workspace resolver with LRU caching
 * Resolves file paths to their Move workspace root (directory containing Move.toml)
 * Caches by workspace root (not file path) per the contract: "max 3 workspace roots"
 */
export declare class WorkspaceResolver {
    private readonly maxCacheSize;
    private cache;
    private accessCounter;
    private hits;
    private misses;
    constructor(maxCacheSize?: number);
    /**
     * Resolve a file path to its workspace root
     * Returns the directory containing Move.toml
     * @throws NoWorkspaceError if no Move.toml is found in any parent directory
     */
    resolve(filePath: string): string;
    /**
     * Get cache statistics
     */
    getCacheStats(): CacheStats;
    /**
     * Clear the cache and reset statistics
     */
    clear(): void;
    /**
     * Find workspace root by traversing parent directories
     */
    private findWorkspaceRoot;
    /**
     * Evict the least recently used cache entry
     */
    private evictLRU;
}
