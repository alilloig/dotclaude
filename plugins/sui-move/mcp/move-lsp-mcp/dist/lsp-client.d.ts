/**
 * LSP client for communicating with move-analyzer
 */
import { TextDocumentContentChangeEvent } from 'vscode-languageserver-protocol';
import { Config } from './config.js';
/**
 * LSP Client for move-analyzer
 */
export declare class MoveLspClient {
    private readonly binaryPath;
    private readonly config;
    private process;
    private nextId;
    private pendingRequests;
    private isInitialized;
    private restartCount;
    constructor(binaryPath: string, config: Config);
    /**
     * Start the LSP server process
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
     */
    private sendRequest;
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
     * Handle process exit
     */
    private handleProcessExit;
    /**
     * Shutdown the LSP server gracefully
     */
    shutdown(): Promise<void>;
    /**
     * Check if the client is ready for requests
     */
    isReady(): boolean;
}
