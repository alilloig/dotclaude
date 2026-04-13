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
export declare class DocumentStore {
    private documents;
    /**
     * Track a newly opened document
     */
    didOpen(uri: string, content: string, version: number): void;
    /**
     * Update content and version for an open document
     */
    didChange(uri: string, content: string, version: number): void;
    /**
     * Remove a closed document from tracking
     */
    didClose(uri: string): void;
    /**
     * Get stored document state, or undefined if not tracked
     */
    get(uri: string): StoredDocument | undefined;
    /**
     * Get number of tracked documents
     */
    get size(): number;
    /**
     * Clear all tracked documents
     */
    clear(): void;
    /**
     * Get all tracked documents (for reopening after LSP restart)
     * Returns a copy of all stored documents
     */
    getAll(): StoredDocument[];
    /**
     * Get all documents for a specific workspace root
     * Filters documents whose URI starts with the workspace root
     * @param workspaceRoot The workspace root path (e.g., /path/to/project)
     */
    getAllForWorkspace(workspaceRoot: string): StoredDocument[];
    /**
     * Increment versions for all documents in a workspace
     * Used after restart to ensure LSP sees fresh documents
     * @param workspaceRoot The workspace root path
     */
    incrementVersionsForWorkspace(workspaceRoot: string): void;
}
