/**
 * Unit tests for WorkspaceResolver
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { resolve, join } from 'path';
import { WorkspaceResolver } from '../../src/workspace.js';
import { NoWorkspaceError } from '../../src/errors.js';

// Mock logger to avoid noise during tests
vi.mock('../../src/logger.js', () => ({
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

describe('WorkspaceResolver', () => {
  let resolver: WorkspaceResolver;
  const fixturesDir = resolve(__dirname, '../fixtures');
  const simplePackage = join(fixturesDir, 'simple-package');
  const exampleMove = join(simplePackage, 'sources/example.move');

  beforeEach(() => {
    resolver = new WorkspaceResolver();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('resolve', () => {
    test('should find workspace root containing Move.toml', () => {
      const workspaceRoot = resolver.resolve(exampleMove);
      expect(workspaceRoot).toBe(simplePackage);
    });

    test('should throw NoWorkspaceError for file outside workspace', () => {
      // /tmp is unlikely to have a Move.toml
      expect(() => resolver.resolve('/tmp/some-file.move')).toThrow(NoWorkspaceError);
    });

    test('should handle deeply nested files', () => {
      // Even though this path doesn't exist, resolution walks up to find Move.toml
      const deepPath = join(simplePackage, 'sources/deep/nested/file.move');
      const workspaceRoot = resolver.resolve(deepPath);
      expect(workspaceRoot).toBe(simplePackage);
    });
  });

  describe('cache behavior', () => {
    test('should increment misses on first access', () => {
      resolver.resolve(exampleMove);

      const stats = resolver.getCacheStats();
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(0);
    });

    test('should increment hits on subsequent access', () => {
      resolver.resolve(exampleMove);
      resolver.resolve(exampleMove); // Second access should hit cache

      const stats = resolver.getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    test('should report correct cache size', () => {
      resolver.resolve(exampleMove);

      const stats = resolver.getCacheStats();
      expect(stats.size).toBe(1);
    });
  });

  describe('LRU eviction', () => {
    test('should evict LRU entry when cache exceeds max size', () => {
      // Create resolver with max size 3 (default)
      const lruResolver = new WorkspaceResolver(3);

      // Mock filesystem for this test to create 4 distinct "workspaces"
      // We'll use the actual fixture path but with different file names
      // The cache key is the full resolved file path

      const path1 = join(simplePackage, 'sources/file1.move');
      const path2 = join(simplePackage, 'sources/file2.move');
      const path3 = join(simplePackage, 'sources/file3.move');
      const path4 = join(simplePackage, 'sources/file4.move');

      // Access paths 1, 2, 3 (fills cache)
      lruResolver.resolve(path1);
      lruResolver.resolve(path2);
      lruResolver.resolve(path3);

      expect(lruResolver.getCacheStats().size).toBe(3);

      // Access path 4 - should evict path1 (LRU)
      lruResolver.resolve(path4);

      expect(lruResolver.getCacheStats().size).toBe(3);
      expect(lruResolver.getCacheStats().misses).toBe(4);

      // Access path1 again - should be a cache miss (was evicted)
      lruResolver.resolve(path1);
      expect(lruResolver.getCacheStats().misses).toBe(5);
    });

    test('should preserve recently accessed entries during eviction', () => {
      const lruResolver = new WorkspaceResolver(3);

      const path1 = join(simplePackage, 'sources/file1.move');
      const path2 = join(simplePackage, 'sources/file2.move');
      const path3 = join(simplePackage, 'sources/file3.move');
      const path4 = join(simplePackage, 'sources/file4.move');

      // Fill cache
      lruResolver.resolve(path1); // access order: 1
      lruResolver.resolve(path2); // access order: 2
      lruResolver.resolve(path3); // access order: 3

      // Access path1 again to make it most recent
      lruResolver.resolve(path1); // access order: 4 (hit)

      // Now add path4 - should evict path2 (now the LRU)
      lruResolver.resolve(path4);

      // path1 should still be in cache (hit)
      const beforeStats = lruResolver.getCacheStats();
      lruResolver.resolve(path1);
      const afterStats = lruResolver.getCacheStats();

      expect(afterStats.hits).toBe(beforeStats.hits + 1);
    });
  });

  describe('clear', () => {
    test('should reset cache and statistics', () => {
      resolver.resolve(exampleMove);
      resolver.resolve(exampleMove);

      resolver.clear();

      const stats = resolver.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });
});
