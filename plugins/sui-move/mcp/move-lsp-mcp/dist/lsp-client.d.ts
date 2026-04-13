/**
 * LSP client for communicating with move-analyzer
 */
import { TextDocumentContentChangeEvent } from 'vscode-languageserver-protocol';
import { Config } from './config.js';
/**
 * Diagnostic from LSP publishDiagnostics notification
 */
export interface LspDiagnostic {
    uri: string;
    diagnostics: Array<{
        range: {
            start: {
                line: number;
                character: number;
            };
            end: {
                line: number;
                character: number;
            };
        };
        severity?: number;
        code?: string | number;
        source?: string;
        message: string;
    }>;
}
/**
 * Hover result from LSP
 */
export interface HoverResult {
    contents: string;
}
/**
 * Completion result from LSP
 */
export interface CompletionResult {
    completions: Array<{
        label: string;
        kind: string;
        detail?: string;
    }>;
}
/**
 * Location result from LSP goto-definition
 */
export interface LocationResult {
    filePath: string;
    line: number;
    character: number;
}
/**
 * LSP Client for move-analyzer
 *
 * Handles crash recovery, timeout handling, and automatic restart with configurable limits.
 * After MOVE_LSP_MAX_RESTARTS consecutive crashes, the client enters a "hard failed" state.
 */
export declare class MoveLspClient {
    private readonly binaryPath;
    private readonly config;
    private process;
    private nextId;
    private pendingRequests;
    private isInitialized;
    private consecutiveCrashes;
    private hardFailed;
    private isUnhealthy;
    private currentWorkspaceRoot;
    private diagnosticsStore;
    private timeoutTimers;
    private killTimer;
    constructor(binaryPath: string, config: Config);
    /**
     * Get the current child process PID (for testing/monitoring)
     */
    getPid(): number | null;
    /**
     * Check if the client has exceeded max restarts
     */
    hasHardFailed(): boolean;
    /**
     * Get current restart count
     */
    getConsecutiveCrashes(): number;
    /**
     * Reset hard failed state (for testing)
     */
    resetHardFailed(): void;
    /**
     * Get cached diagnostics for a URI
     */
    getDiagnostics(uri: string): LspDiagnostic['diagnostics'];
    /**
     * Get all cached diagnostics
     */
    getAllDiagnostics(): Map<string, LspDiagnostic['diagnostics']>;
    /**
     * Clear diagnostics for a URI
     */
    clearDiagnostics(uri?: string): void;
    /**
     * Start the LSP server process
     * @throws LspStartFailedError if max restarts exceeded or startup fails
     */
    start(workspaceRoot: string): Promise<void>;
    /**
     * Initialize the LSP server
     */
    private initialize;
    /**
     * Set up message handling for LSP communication
     */
    private setupMessageHandling;
    /**
     * Handle incoming LSP messages
     */
    private handleMessage;
    /**
     * Send an LSP request and wait for response
     * On timeout: sends SIGTERM, waits 2s, sends SIGKILL if still alive
     */
    private sendRequest;
    /**
     * Kill child process with SIGTERM, escalate to SIGKILL after 2000ms
     */
    private killWithEscalation;
    /**
     * Force kill the child process immediately
     */
    private forceKill;
    /**
     * Send an LSP notification (no response expected)
     */
    private sendNotification;
    /**
     * Send a message to the LSP server
     */
    private sendMessage;
    /**
     * Open a document in the LSP server
     */
    didOpen(uri: string, content: string, languageId?: string): Promise<void>;
    /**
     * Notify document changes
     */
    didChange(uri: string, version: number, changes: TextDocumentContentChangeEvent[]): Promise<void>;
    /**
     * Request hover information for a position
     * @param uri Document URI
     * @param line 0-based line number
     * @param character 0-based character offset
     */
    hover(uri: string, line: number, character: number): Promise<HoverResult | null>;
    /**
     * Request completion candidates for a position
     * @param uri Document URI
     * @param line 0-based line number
     * @param character 0-based character offset
     */
    completion(uri: string, line: number, character: number): Promise<CompletionResult>;
    /**
     * Request goto-definition for a position
     * Cross-package goto-definition may not resolve due to move-analyzer limitations on multi-package workspaces
     * @param uri Document URI
     * @param line 0-based line number
     * @param character 0-based character offset
     */
    gotoDefinition(uri: string, line: number, character: number): Promise<LocationResult[]>;
    /**
     * Handle process exit
     * Rejects all pending requests immediately with LSP_CRASHED error
     */
    private handleProcessExit;
    /**
     * Shutdown the LSP server gracefully
     */
    shutdown(): Promise<void>;
    /**
     * Check if the client is ready for requests
     * Returns false if uninitialized, no process, unhealthy, or hard failed
     */
    isReady(): boolean;
    /**
     * Check if the client needs restart (unhealthy but not hard failed)
     */
    needsRestart(): boolean;
    /**
     * Get current workspace root
     */
    getWorkspaceRoot(): string | null;
    /**
     * Reopen documents after restart
     * Called by server after restart to restore document state
     * @param documents Array of documents to reopen with incremented versions
     */
    reopenDocuments(documents: Array<{
        uri: string;
        content: string;
        version: number;
    }>): Promise<void>;
}
