/**
 * Document store for tracking open/changed/closed documents
 * Implements a subset of the LSP text document synchronization protocol
 */
/**
 * Document store for tracking open documents
 * Used to support unsaved buffer diagnostics
 */
export class DocumentStore {
    documents = new Map();
    /**
     * Track a newly opened document
     */
    didOpen(uri, content, version) {
        this.documents.set(uri, { uri, content, version });
    }
    /**
     * Update content and version for an open document
     */
    didChange(uri, content, version) {
        const existing = this.documents.get(uri);
        if (existing) {
            existing.content = content;
            existing.version = version;
        }
        else {
            // Handle change without prior open (edge case)
            this.documents.set(uri, { uri, content, version });
        }
    }
    /**
     * Remove a closed document from tracking
     */
    didClose(uri) {
        this.documents.delete(uri);
    }
    /**
     * Get stored document state, or undefined if not tracked
     */
    get(uri) {
        return this.documents.get(uri);
    }
    /**
     * Get number of tracked documents
     */
    get size() {
        return this.documents.size;
    }
    /**
     * Clear all tracked documents
     */
    clear() {
        this.documents.clear();
    }
    /**
     * Get all tracked documents (for reopening after LSP restart)
     * Returns a copy of all stored documents
     */
    getAll() {
        return Array.from(this.documents.values());
    }
    /**
     * Get all documents for a specific workspace root
     * Filters documents whose URI starts with the workspace root
     * @param workspaceRoot The workspace root path (e.g., /path/to/project)
     */
    getAllForWorkspace(workspaceRoot) {
        // Ensure workspace URI ends with / to avoid matching partial paths
        // e.g., /workspace should not match /workspace-other
        const workspaceUri = `file://${workspaceRoot}`;
        const workspaceUriWithSlash = workspaceUri.endsWith('/') ? workspaceUri : `${workspaceUri}/`;
        return Array.from(this.documents.values()).filter(doc => doc.uri.startsWith(workspaceUriWithSlash) || doc.uri === workspaceUri);
    }
    /**
     * Increment versions for all documents in a workspace
     * Used after restart to ensure LSP sees fresh documents
     * @param workspaceRoot The workspace root path
     */
    incrementVersionsForWorkspace(workspaceRoot) {
        const workspaceUri = `file://${workspaceRoot}`;
        const workspaceUriWithSlash = workspaceUri.endsWith('/') ? workspaceUri : `${workspaceUri}/`;
        for (const doc of this.documents.values()) {
            if (doc.uri.startsWith(workspaceUriWithSlash) || doc.uri === workspaceUri) {
                doc.version++;
            }
        }
    }
}
//# sourceMappingURL=document-store.js.map