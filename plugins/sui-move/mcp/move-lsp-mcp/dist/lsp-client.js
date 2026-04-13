/**
 * LSP client for communicating with move-analyzer
 */
import { spawn } from 'child_process';
import { LspStartFailedError } from './errors.js';
import { log } from './logger.js';
/**
 * LSP Client for move-analyzer
 */
export class MoveLspClient {
    binaryPath;
    config;
    process = null;
    nextId = 1;
    pendingRequests = new Map();
    isInitialized = false;
    restartCount = 0;
    diagnosticsStore = new Map();
    constructor(binaryPath, config) {
        this.binaryPath = binaryPath;
        this.config = config;
    }
    /**
     * Get cached diagnostics for a URI
     */
    getDiagnostics(uri) {
        return this.diagnosticsStore.get(uri) || [];
    }
    /**
     * Get all cached diagnostics
     */
    getAllDiagnostics() {
        return new Map(this.diagnosticsStore);
    }
    /**
     * Clear diagnostics for a URI
     */
    clearDiagnostics(uri) {
        if (uri) {
            this.diagnosticsStore.delete(uri);
        }
        else {
            this.diagnosticsStore.clear();
        }
    }
    /**
     * Start the LSP server process
     */
    async start(workspaceRoot) {
        log('info', 'Starting Move LSP client', {
            binaryPath: this.binaryPath,
            workspaceRoot,
        });
        try {
            // Spawn move-analyzer in LSP mode
            this.process = spawn(this.binaryPath, ['language-server'], {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: workspaceRoot,
            });
            if (!this.process.stdin || !this.process.stdout || !this.process.stderr) {
                throw new LspStartFailedError('Failed to create process streams');
            }
            // Set up error handling
            this.process.on('error', (error) => {
                log('error', 'LSP process error', { error });
                this.handleProcessExit(1);
            });
            this.process.on('exit', (code, signal) => {
                log('info', 'LSP process exited', { code, signal });
                this.handleProcessExit(code || 0);
            });
            // Set up message handling
            this.setupMessageHandling();
            // Initialize the LSP server
            await this.initialize(workspaceRoot);
            log('info', 'Move LSP client started successfully');
        }
        catch (error) {
            log('error', 'Failed to start LSP client', { error });
            await this.shutdown();
            throw new LspStartFailedError(`Startup failed: ${error}`);
        }
    }
    /**
     * Initialize the LSP server
     */
    async initialize(workspaceRoot) {
        const initParams = {
            processId: process.pid,
            rootUri: `file://${workspaceRoot}`,
            capabilities: {
                textDocument: {
                    synchronization: {
                        dynamicRegistration: false,
                        willSave: false,
                        willSaveWaitUntil: false,
                        didSave: false,
                    },
                },
            },
        };
        const result = await this.sendRequest('initialize', initParams);
        log('debug', 'LSP initialize result', { result });
        // Send initialized notification
        await this.sendNotification('initialized', {});
        this.isInitialized = true;
    }
    /**
     * Set up message handling for LSP communication
     */
    setupMessageHandling() {
        if (!this.process?.stdout) {
            throw new Error('No stdout stream available');
        }
        let buffer = '';
        this.process.stdout.on('data', (chunk) => {
            buffer += chunk.toString();
            // Process complete messages
            while (true) {
                const headerEnd = buffer.indexOf('\r\n\r\n');
                if (headerEnd === -1)
                    break;
                const header = buffer.substring(0, headerEnd);
                const contentLengthMatch = header.match(/Content-Length: (\d+)/);
                if (!contentLengthMatch) {
                    log('warn', 'Invalid LSP message header', { header });
                    buffer = buffer.substring(headerEnd + 4);
                    continue;
                }
                const contentLength = parseInt(contentLengthMatch[1], 10);
                const messageStart = headerEnd + 4;
                if (buffer.length < messageStart + contentLength) {
                    // Wait for complete message
                    break;
                }
                const messageContent = buffer.substring(messageStart, messageStart + contentLength);
                buffer = buffer.substring(messageStart + contentLength);
                try {
                    const message = JSON.parse(messageContent);
                    this.handleMessage(message);
                }
                catch (error) {
                    log('error', 'Failed to parse LSP message', { error, messageContent });
                }
            }
        });
    }
    /**
     * Handle incoming LSP messages
     */
    handleMessage(message) {
        if (message.id !== undefined && this.pendingRequests.has(message.id)) {
            // Response to our request
            const pending = this.pendingRequests.get(message.id);
            this.pendingRequests.delete(message.id);
            if (message.error) {
                pending.reject(new Error(`LSP error: ${JSON.stringify(message.error)}`));
            }
            else {
                pending.resolve(message.result);
            }
        }
        else if (message.method === 'textDocument/publishDiagnostics') {
            // Cache diagnostics from LSP server
            const params = message.params;
            this.diagnosticsStore.set(params.uri, params.diagnostics);
            log('debug', 'Received diagnostics', { uri: params.uri, count: params.diagnostics.length });
        }
        else {
            log('debug', 'Unhandled LSP message', { message });
        }
    }
    /**
     * Send an LSP request and wait for response
     */
    sendRequest(method, params) {
        return new Promise((resolve, reject) => {
            const id = this.nextId++;
            const message = {
                jsonrpc: '2.0',
                id,
                method,
                params,
            };
            this.pendingRequests.set(id, { resolve: resolve, reject, method });
            this.sendMessage(message);
            // Set timeout
            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error(`LSP request timeout: ${method}`));
                }
            }, this.config.moveLspTimeoutMs);
        });
    }
    /**
     * Send an LSP notification (no response expected)
     */
    async sendNotification(method, params) {
        const message = {
            jsonrpc: '2.0',
            method,
            params,
        };
        this.sendMessage(message);
    }
    /**
     * Send a message to the LSP server
     */
    sendMessage(message) {
        if (!this.process?.stdin) {
            throw new Error('LSP process not available');
        }
        const content = JSON.stringify(message);
        const header = `Content-Length: ${Buffer.byteLength(content, 'utf8')}\r\n\r\n`;
        log('debug', 'Sending LSP message', { method: message.method });
        this.process.stdin.write(header + content);
    }
    /**
     * Open a document in the LSP server
     */
    async didOpen(uri, content, languageId = 'move') {
        if (!this.isInitialized) {
            throw new Error('LSP client not initialized');
        }
        const params = {
            textDocument: {
                uri,
                languageId,
                version: 1,
                text: content,
            },
        };
        await this.sendNotification('textDocument/didOpen', params);
    }
    /**
     * Notify document changes
     */
    async didChange(uri, version, changes) {
        if (!this.isInitialized) {
            throw new Error('LSP client not initialized');
        }
        const params = {
            textDocument: {
                uri,
                version,
            },
            contentChanges: changes,
        };
        await this.sendNotification('textDocument/didChange', params);
    }
    /**
     * Handle process exit
     */
    handleProcessExit(code) {
        this.process = null;
        this.isInitialized = false;
        // Reject any pending requests
        for (const [, pending] of this.pendingRequests) {
            pending.reject(new Error('LSP process exited'));
        }
        this.pendingRequests.clear();
        if (code !== 0 && this.restartCount < this.config.moveLspMaxRestarts) {
            log('warn', 'LSP process crashed, attempting restart', {
                code,
                restartCount: this.restartCount,
            });
            this.restartCount++;
            // Note: Restart logic would be implemented by the server
        }
    }
    /**
     * Shutdown the LSP server gracefully
     */
    async shutdown() {
        if (!this.process) {
            return;
        }
        try {
            if (this.isInitialized) {
                await this.sendRequest('shutdown', null);
                await this.sendNotification('exit', null);
            }
        }
        catch (error) {
            log('warn', 'Error during LSP shutdown', { error });
        }
        finally {
            this.process.kill();
            this.process = null;
            this.isInitialized = false;
        }
    }
    /**
     * Check if the client is ready for requests
     */
    isReady() {
        return this.isInitialized && this.process !== null;
    }
}
//# sourceMappingURL=lsp-client.js.map