/**
 * LSP client for communicating with move-analyzer
 */

import { spawn, ChildProcess } from 'child_process';
import {
  InitializeParams,
  InitializeResult,
  TextDocumentItem,
  VersionedTextDocumentIdentifier,
  TextDocumentContentChangeEvent,
} from 'vscode-languageserver-protocol';
import { LspStartFailedError } from './errors.js';
import { log } from './logger.js';
import { Config } from './config.js';

/**
 * Represents an LSP request/response pair
 */
interface PendingRequest<T = unknown> {
  resolve: (result: T) => void;
  reject: (error: Error) => void;
  method: string;
}

/**
 * LSP Client for move-analyzer
 */
export class MoveLspClient {
  private process: ChildProcess | null = null;
  private nextId = 1;
  private pendingRequests = new Map<number, PendingRequest<any>>();
  private isInitialized = false;
  private restartCount = 0;

  constructor(
    private readonly binaryPath: string,
    private readonly config: Config
  ) {}

  /**
   * Start the LSP server process
   */
  async start(workspaceRoot: string): Promise<void> {
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
    } catch (error) {
      log('error', 'Failed to start LSP client', { error });
      await this.shutdown();
      throw new LspStartFailedError(`Startup failed: ${error}`);
    }
  }

  /**
   * Initialize the LSP server
   */
  private async initialize(workspaceRoot: string): Promise<void> {
    const initParams: InitializeParams = {
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

    const result = await this.sendRequest<InitializeResult>(
      'initialize',
      initParams
    );

    log('debug', 'LSP initialize result', { result });

    // Send initialized notification
    await this.sendNotification('initialized', {});
    this.isInitialized = true;
  }

  /**
   * Set up message handling for LSP communication
   */
  private setupMessageHandling(): void {
    if (!this.process?.stdout) {
      throw new Error('No stdout stream available');
    }

    let buffer = '';
    this.process.stdout!.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();

      // Process complete messages
      while (true) {
        const headerEnd = buffer.indexOf('\r\n\r\n');
        if (headerEnd === -1) break;

        const header = buffer.substring(0, headerEnd);
        const contentLengthMatch = header.match(/Content-Length: (\d+)/);

        if (!contentLengthMatch) {
          log('warn', 'Invalid LSP message header', { header });
          buffer = buffer.substring(headerEnd + 4);
          continue;
        }

        const contentLength = parseInt(contentLengthMatch[1]!, 10);
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
        } catch (error) {
          log('error', 'Failed to parse LSP message', { error, messageContent });
        }
      }
    });
  }

  /**
   * Handle incoming LSP messages
   */
  private handleMessage(message: any): void {
    if (message.id !== undefined && this.pendingRequests.has(message.id)) {
      // Response to our request
      const pending = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);

      if (message.error) {
        pending.reject(new Error(`LSP error: ${JSON.stringify(message.error)}`));
      } else {
        pending.resolve(message.result);
      }
    } else if (message.method === 'textDocument/publishDiagnostics') {
      // Diagnostic notification - we'll handle this in the server
      log('debug', 'Received diagnostics', { diagnostics: message.params });
    } else {
      log('debug', 'Unhandled LSP message', { message });
    }
  }

  /**
   * Send an LSP request and wait for response
   */
  private sendRequest<T>(method: string, params: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      const message = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };

      this.pendingRequests.set(id, { resolve: resolve as any, reject, method });
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
  private async sendNotification(method: string, params: unknown): Promise<void> {
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
  private sendMessage(message: unknown): void {
    if (!this.process?.stdin) {
      throw new Error('LSP process not available');
    }

    const content = JSON.stringify(message);
    const header = `Content-Length: ${Buffer.byteLength(content, 'utf8')}\r\n\r\n`;

    log('debug', 'Sending LSP message', { method: (message as any).method });
    this.process.stdin!.write(header + content);
  }

  /**
   * Open a document in the LSP server
   */
  async didOpen(uri: string, content: string, languageId = 'move'): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('LSP client not initialized');
    }

    const params = {
      textDocument: {
        uri,
        languageId,
        version: 1,
        text: content,
      } as TextDocumentItem,
    };

    await this.sendNotification('textDocument/didOpen', params);
  }

  /**
   * Notify document changes
   */
  async didChange(
    uri: string,
    version: number,
    changes: TextDocumentContentChangeEvent[]
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('LSP client not initialized');
    }

    const params = {
      textDocument: {
        uri,
        version,
      } as VersionedTextDocumentIdentifier,
      contentChanges: changes,
    };

    await this.sendNotification('textDocument/didChange', params);
  }

  /**
   * Handle process exit
   */
  private handleProcessExit(code: number): void {
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
  async shutdown(): Promise<void> {
    if (!this.process) {
      return;
    }

    try {
      if (this.isInitialized) {
        await this.sendRequest('shutdown', null);
        await this.sendNotification('exit', null);
      }
    } catch (error) {
      log('warn', 'Error during LSP shutdown', { error });
    } finally {
      this.process.kill();
      this.process = null;
      this.isInitialized = false;
    }
  }

  /**
   * Check if the client is ready for requests
   */
  isReady(): boolean {
    return this.isInitialized && this.process !== null;
  }
}