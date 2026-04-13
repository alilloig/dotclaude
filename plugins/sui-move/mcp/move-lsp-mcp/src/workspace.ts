/**
 * Workspace resolution with LRU caching
 * Finds the workspace root (directory containing Move.toml) for a given file
 */

import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { NoWorkspaceError } from './errors.js';
import { log } from './logger.js';

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

/**
 * LRU cache entry with access order tracking
 */
interface CacheEntry {
  workspaceRoot: string;
  lastAccess: number;
}

/**
 * Workspace resolver with LRU caching
 * Resolves file paths to their Move workspace root (directory containing Move.toml)
 */
export class WorkspaceResolver {
  private cache = new Map<string, CacheEntry>();
  private accessCounter = 0;
  private hits = 0;
  private misses = 0;

  constructor(private readonly maxCacheSize = 3) {}

  /**
   * Resolve a file path to its workspace root
   * Returns the directory containing Move.toml
   * @throws NoWorkspaceError if no Move.toml is found in any parent directory
   */
  resolve(filePath: string): string {
    const resolvedPath = resolve(filePath);

    // Check cache first
    const cached = this.cache.get(resolvedPath);
    if (cached) {
      this.hits++;
      cached.lastAccess = ++this.accessCounter;
      log('debug', 'Workspace cache hit', {
        event: 'workspace_cache_hit',
        filePath: resolvedPath,
        workspaceRoot: cached.workspaceRoot,
      });
      return cached.workspaceRoot;
    }

    // Cache miss - find workspace root
    this.misses++;
    const workspaceRoot = this.findWorkspaceRoot(resolvedPath);

    log('debug', 'Workspace cache miss', {
      event: 'workspace_cache_miss',
      filePath: resolvedPath,
      workspaceRoot,
    });

    // Evict LRU entry if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      this.evictLRU();
    }

    // Store in cache
    this.cache.set(resolvedPath, {
      workspaceRoot,
      lastAccess: ++this.accessCounter,
    });

    return workspaceRoot;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
    };
  }

  /**
   * Clear the cache and reset statistics
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.accessCounter = 0;
  }

  /**
   * Find workspace root by traversing parent directories
   */
  private findWorkspaceRoot(filePath: string): string {
    let currentDir = dirname(filePath);

    while (currentDir !== '/' && currentDir !== '.') {
      const moveTomlPath = resolve(currentDir, 'Move.toml');
      if (existsSync(moveTomlPath)) {
        return currentDir;
      }
      const parentDir = dirname(currentDir);
      if (parentDir === currentDir) break; // Reached filesystem root
      currentDir = parentDir;
    }

    throw new NoWorkspaceError(filePath);
  }

  /**
   * Evict the least recently used cache entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
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
