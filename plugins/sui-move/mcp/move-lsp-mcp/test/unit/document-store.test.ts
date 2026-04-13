/**
 * Unit tests for DocumentStore
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { DocumentStore } from '../../src/document-store.js';

describe('DocumentStore', () => {
  let store: DocumentStore;

  beforeEach(() => {
    store = new DocumentStore();
  });

  describe('didOpen', () => {
    test('should store document on open', () => {
      const uri = 'file:///path/to/file.move';
      const content = 'module test {}';
      const version = 1;

      store.didOpen(uri, content, version);

      const doc = store.get(uri);
      expect(doc).toBeDefined();
      expect(doc!.uri).toBe(uri);
      expect(doc!.content).toBe(content);
      expect(doc!.version).toBe(version);
    });

    test('should store multiple documents', () => {
      store.didOpen('file:///a.move', 'module a {}', 1);
      store.didOpen('file:///b.move', 'module b {}', 1);

      expect(store.size).toBe(2);
      expect(store.get('file:///a.move')).toBeDefined();
      expect(store.get('file:///b.move')).toBeDefined();
    });
  });

  describe('didChange', () => {
    test('should update content and version on change', () => {
      const uri = 'file:///path/to/file.move';
      store.didOpen(uri, 'module test {}', 1);

      store.didChange(uri, 'module test { fun x() {} }', 2);

      const doc = store.get(uri);
      expect(doc!.content).toBe('module test { fun x() {} }');
      expect(doc!.version).toBe(2);
    });

    test('should handle change without prior open', () => {
      const uri = 'file:///new/file.move';
      store.didChange(uri, 'content', 1);

      const doc = store.get(uri);
      expect(doc).toBeDefined();
      expect(doc!.content).toBe('content');
    });
  });

  describe('didClose', () => {
    test('should remove document on close', () => {
      const uri = 'file:///path/to/file.move';
      store.didOpen(uri, 'module test {}', 1);
      expect(store.get(uri)).toBeDefined();

      store.didClose(uri);
      expect(store.get(uri)).toBeUndefined();
    });

    test('should handle close for non-existent document', () => {
      // Should not throw
      expect(() => store.didClose('file:///nonexistent.move')).not.toThrow();
    });
  });

  describe('get', () => {
    test('should return undefined for unknown URI', () => {
      expect(store.get('file:///unknown.move')).toBeUndefined();
    });

    test('should return stored document', () => {
      const uri = 'file:///test.move';
      store.didOpen(uri, 'content', 1);

      const doc = store.get(uri);
      expect(doc).toBeDefined();
      expect(doc!.content).toBe('content');
    });
  });

  describe('clear', () => {
    test('should remove all documents', () => {
      store.didOpen('file:///a.move', 'a', 1);
      store.didOpen('file:///b.move', 'b', 1);
      expect(store.size).toBe(2);

      store.clear();
      expect(store.size).toBe(0);
    });
  });
});
