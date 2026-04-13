/**
 * Document store for tracking open/changed/closed documents
 * Implements a subset of the LSP text document synchronization protocol
 */

/**
 * Stored document state
 */
export interface StoredDocument {
  uri: string;
  content: string;
  version: number;
}

/**
 * Document store for tracking open documents
 * Used to support unsaved buffer diagnostics
 */
export class DocumentStore {
  private documents = new Map<string, StoredDocument>();

  /**
   * Track a newly opened document
   */
  didOpen(uri: string, content: string, version: number): void {
    this.documents.set(uri, { uri, content, version });
  }

  /**
   * Update content and version for an open document
   */
  didChange(uri: string, content: string, version: number): void {
    const existing = this.documents.get(uri);
    if (existing) {
      existing.content = content;
      existing.version = version;
    } else {
      // Handle change without prior open (edge case)
      this.documents.set(uri, { uri, content, version });
    }
  }

  /**
   * Remove a closed document from tracking
   */
  didClose(uri: string): void {
    this.documents.delete(uri);
  }

  /**
   * Get stored document state, or undefined if not tracked
   */
  get(uri: string): StoredDocument | undefined {
    return this.documents.get(uri);
  }

  /**
   * Get number of tracked documents
   */
  get size(): number {
    return this.documents.size;
  }

  /**
   * Clear all tracked documents
   */
  clear(): void {
    this.documents.clear();
  }
}
