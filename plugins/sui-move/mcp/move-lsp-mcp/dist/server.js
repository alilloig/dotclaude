/**
 * MCP Server for Move LSP integration
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { MoveLspClient } from './lsp-client.js';
import { discoverBinary, getBinaryVersion } from './binary-discovery.js';
import { parseConfig, validateConfig } from './config.js';
import { log, setLogLevel, info, error } from './logger.js';
import { WorkspaceResolver } from './workspace.js';
import { DocumentStore } from './document-store.js';
import { checkVersionCompatibility } from './version.js';
import { BinaryNotFoundError, NoWorkspaceError, MoveLspError, SymbolNotFoundError, LspStartFailedError, INVALID_FILE_PATH, FILE_NOT_FOUND, NO_WORKSPACE, } from './errors.js';
// LSP diagnostic severity to string mapping
function severityToString(severity) {
    switch (severity) {
        case 1: return 'error';
        case 2: return 'warning';
        case 3: return 'information';
        case 4: return 'hint';
        default: return 'error';
    }
}
// Module-level state for binary discovery (shared across server instances)
let globalBinaryPath = null;
let globalConfig = null;
/**
 * Initialize binary discovery on startup (called from index.ts)
 * Logs version info to stderr in JSON format
 */
export async function initializeBinaryOnStartup() {
    if (!globalConfig) {
        globalConfig = parseConfig();
        validateConfig(globalConfig);
        setLogLevel(globalConfig.moveLspLogLevel);
    }
    // Check VERSION.json compatibility at startup
    const versionJsonPath = resolve(__dirname, '../../docs/VERSION.json');
    const compatibility = checkVersionCompatibility(versionJsonPath);
    if (!compatibility.compatible && compatibility.warning) {
        log('warn', compatibility.warning, { event: 'version_check' });
    }
    if (globalBinaryPath)
        return;
    globalBinaryPath = discoverBinary(globalConfig.moveAnalyzerPath || undefined);
    const version = getBinaryVersion(globalBinaryPath);
    info('Move analyzer binary check', {
        event: 'binary_version_check',
        path: globalBinaryPath,
        version
    });
}
/**
 * Create and configure the MCP server
 */
export function createServer() {
    if (!globalConfig) {
        globalConfig = parseConfig();
        validateConfig(globalConfig);
        setLogLevel(globalConfig.moveLspLogLevel);
    }
    const config = globalConfig;
    const server = new Server({
        name: 'move-lsp-mcp',
        version: '0.1.0',
    }, {
        capabilities: {
            tools: {},
        },
    });
    let lspClient = null;
    const workspaceResolver = new WorkspaceResolver();
    const documentStore = new DocumentStore();
    // Initialize binary discovery (uses global state from startup)
    async function initializeBinary() {
        if (globalBinaryPath)
            return;
        try {
            globalBinaryPath = discoverBinary(config.moveAnalyzerPath || undefined);
            const version = getBinaryVersion(globalBinaryPath);
            info('Move analyzer initialized', { path: globalBinaryPath, version });
        }
        catch (err) {
            if (err instanceof BinaryNotFoundError) {
                error('move-analyzer not found. Please install Sui and ensure move-analyzer is in PATH', {
                    moveAnalyzerPath: config.moveAnalyzerPath,
                });
                throw err;
            }
            throw err;
        }
    }
    /**
     * Initialize or restart LSP client for a workspace
     * Handles restart recovery by reopening cached documents
     */
    async function initializeLspClient(workspaceRoot) {
        // If client is healthy and ready, nothing to do
        if (lspClient?.isReady())
            return;
        // Check if we need to restart an unhealthy client
        if (lspClient?.needsRestart()) {
            log('info', 'LSP client needs restart, attempting recovery', {
                event: 'lsp_restart_recovery',
                workspaceRoot,
            });
            // Shutdown old client gracefully
            try {
                await lspClient.shutdown();
            }
            catch (err) {
                log('warn', 'Error shutting down unhealthy client', { error: err });
            }
        }
        // Check if hard failed - don't attempt restart
        if (lspClient?.hasHardFailed()) {
            throw new LspStartFailedError(`Max restarts (${config.moveLspMaxRestarts}) exceeded`, { consecutiveCrashes: lspClient.getConsecutiveCrashes() });
        }
        await initializeBinary();
        if (!globalBinaryPath) {
            throw new Error('Binary not initialized');
        }
        // Create new client (preserves restart count if existing client had crashes)
        const previousCrashes = lspClient?.getConsecutiveCrashes() ?? 0;
        lspClient = new MoveLspClient(globalBinaryPath, config);
        // Restore consecutive crash count for continuity
        if (previousCrashes > 0) {
            // The start() method will increment if it fails, so we don't need to set it manually
            // but we log the recovery attempt context
            log('info', 'Attempting restart after crashes', {
                previousCrashes,
                maxRestarts: config.moveLspMaxRestarts,
            });
        }
        await lspClient.start(workspaceRoot);
        // After successful restart, reopen cached documents for this workspace
        const cachedDocs = documentStore.getAllForWorkspace(workspaceRoot);
        if (cachedDocs.length > 0) {
            log('info', 'Reopening cached documents after restart', {
                event: 'lsp_reopen_docs',
                documentCount: cachedDocs.length,
                workspaceRoot,
            });
            // Increment versions in document store before reopening
            documentStore.incrementVersionsForWorkspace(workspaceRoot);
            // Get updated documents with incremented versions
            const updatedDocs = documentStore.getAllForWorkspace(workspaceRoot);
            await lspClient.reopenDocuments(updatedDocs);
        }
    }
    // Handle move_diagnostics tool
    async function handleMoveDiagnostics(args) {
        const { filePath, content, scope } = args;
        if (!filePath || typeof filePath !== 'string') {
            throw new MoveLspError('filePath is required and must be a string', INVALID_FILE_PATH);
        }
        const resolvedPath = resolve(filePath);
        // Check if file exists (for file-on-disk mode)
        if (!content && !existsSync(resolvedPath)) {
            throw new MoveLspError(`File not found: ${resolvedPath}`, FILE_NOT_FOUND);
        }
        // Find workspace root using cached resolver
        let workspaceRoot;
        try {
            workspaceRoot = workspaceResolver.resolve(resolvedPath);
        }
        catch (err) {
            if (err instanceof NoWorkspaceError) {
                throw err;
            }
            throw new MoveLspError(`Failed to find workspace: ${err}`, NO_WORKSPACE);
        }
        // Initialize LSP client
        await initializeLspClient(workspaceRoot);
        if (!lspClient) {
            throw new Error('Failed to initialize LSP client');
        }
        // Read file content if not provided
        const fileContent = content || readFileSync(resolvedPath, 'utf8');
        const fileUri = `file://${resolvedPath}`;
        // Track document state and use appropriate LSP notification
        const existingDoc = documentStore.get(fileUri);
        if (existingDoc) {
            // Document already open - use didChange with incremented version
            const newVersion = existingDoc.version + 1;
            documentStore.didChange(fileUri, fileContent, newVersion);
            await lspClient.didChange(fileUri, newVersion, [{ text: fileContent }]);
        }
        else {
            // New document - use didOpen
            documentStore.didOpen(fileUri, fileContent, 1);
            await lspClient.didOpen(fileUri, fileContent);
        }
        // Wait briefly for LSP server to process and send diagnostics
        // publishDiagnostics is async and may arrive after didOpen returns
        await new Promise(resolve => setTimeout(resolve, 500));
        // Retrieve diagnostics from LSP client cache
        const lspDiagnostics = lspClient.getDiagnostics(fileUri);
        // Transform LSP diagnostics to our output format
        const diagnostics = lspDiagnostics.map(d => ({
            filePath: resolvedPath,
            range: {
                startLine: d.range.start.line,
                startCharacter: d.range.start.character,
                endLine: d.range.end.line,
                endCharacter: d.range.end.character,
            },
            severity: severityToString(d.severity ?? 1),
            message: d.message,
            source: d.source ?? 'move-analyzer',
            code: d.code ?? null,
        }));
        const result = {
            workspaceRoot,
            diagnostics,
        };
        log('info', 'Diagnostics request completed', {
            filePath: resolvedPath,
            workspaceRoot,
            scope: scope || 'file',
            diagnosticsCount: diagnostics.length,
        });
        return result;
    }
    /**
     * Prepare document for LSP operations
     * Opens or updates document in LSP client based on provided content or disk file
     */
    async function prepareDocument(resolvedPath, content) {
        // Check if file exists (for file-on-disk mode)
        if (!content && !existsSync(resolvedPath)) {
            throw new MoveLspError(`File not found: ${resolvedPath}`, FILE_NOT_FOUND);
        }
        // Find workspace root using cached resolver
        let workspaceRoot;
        try {
            workspaceRoot = workspaceResolver.resolve(resolvedPath);
        }
        catch (err) {
            if (err instanceof NoWorkspaceError) {
                throw err;
            }
            throw new MoveLspError(`Failed to find workspace: ${err}`, NO_WORKSPACE);
        }
        // Initialize LSP client
        await initializeLspClient(workspaceRoot);
        if (!lspClient) {
            throw new Error('Failed to initialize LSP client');
        }
        // Read file content if not provided
        const fileContent = content || readFileSync(resolvedPath, 'utf8');
        const fileUri = `file://${resolvedPath}`;
        // Track document state and use appropriate LSP notification
        const existingDoc = documentStore.get(fileUri);
        if (existingDoc) {
            // Document already open - use didChange with incremented version
            const newVersion = existingDoc.version + 1;
            documentStore.didChange(fileUri, fileContent, newVersion);
            await lspClient.didChange(fileUri, newVersion, [{ text: fileContent }]);
        }
        else {
            // New document - use didOpen
            documentStore.didOpen(fileUri, fileContent, 1);
            await lspClient.didOpen(fileUri, fileContent);
        }
        // Wait briefly for LSP server to process
        await new Promise(resolve => setTimeout(resolve, 100));
        return { workspaceRoot, fileUri, fileContent };
    }
    // Handle move_hover tool
    async function handleMoveHover(args) {
        const { filePath, line, character, content } = args;
        if (!filePath || typeof filePath !== 'string') {
            throw new MoveLspError('filePath is required and must be a string', INVALID_FILE_PATH);
        }
        if (typeof line !== 'number' || line < 0) {
            throw new MoveLspError('line is required and must be a non-negative number', INVALID_FILE_PATH);
        }
        if (typeof character !== 'number' || character < 0) {
            throw new MoveLspError('character is required and must be a non-negative number', INVALID_FILE_PATH);
        }
        const resolvedPath = resolve(filePath);
        const { workspaceRoot, fileUri } = await prepareDocument(resolvedPath, content);
        const result = await lspClient.hover(fileUri, line, character);
        log('info', 'Hover request completed', {
            filePath: resolvedPath,
            line,
            character,
            hasContents: result !== null,
        });
        return {
            workspaceRoot,
            contents: result?.contents ?? null,
        };
    }
    // Handle move_completions tool
    async function handleMoveCompletions(args) {
        const { filePath, line, character, content } = args;
        if (!filePath || typeof filePath !== 'string') {
            throw new MoveLspError('filePath is required and must be a string', INVALID_FILE_PATH);
        }
        if (typeof line !== 'number' || line < 0) {
            throw new MoveLspError('line is required and must be a non-negative number', INVALID_FILE_PATH);
        }
        if (typeof character !== 'number' || character < 0) {
            throw new MoveLspError('character is required and must be a non-negative number', INVALID_FILE_PATH);
        }
        const resolvedPath = resolve(filePath);
        const { workspaceRoot, fileUri } = await prepareDocument(resolvedPath, content);
        const result = await lspClient.completion(fileUri, line, character);
        log('info', 'Completions request completed', {
            filePath: resolvedPath,
            line,
            character,
            completionCount: result.completions.length,
        });
        return {
            workspaceRoot,
            completions: result.completions,
        };
    }
    // Handle move_goto_definition tool
    // Cross-package goto-definition may not resolve due to move-analyzer limitations on multi-package workspaces
    async function handleMoveGotoDefinition(args) {
        const { filePath, line, character, content } = args;
        if (!filePath || typeof filePath !== 'string') {
            throw new MoveLspError('filePath is required and must be a string', INVALID_FILE_PATH);
        }
        if (typeof line !== 'number' || line < 0) {
            throw new MoveLspError('line is required and must be a non-negative number', INVALID_FILE_PATH);
        }
        if (typeof character !== 'number' || character < 0) {
            throw new MoveLspError('character is required and must be a non-negative number', INVALID_FILE_PATH);
        }
        const resolvedPath = resolve(filePath);
        const { workspaceRoot, fileUri } = await prepareDocument(resolvedPath, content);
        const locations = await lspClient.gotoDefinition(fileUri, line, character);
        if (locations.length === 0) {
            throw new SymbolNotFoundError('symbol', `${filePath}:${line}:${character}`);
        }
        log('info', 'Goto-definition request completed', {
            filePath: resolvedPath,
            line,
            character,
            locationCount: locations.length,
        });
        return {
            workspaceRoot,
            locations,
        };
    }
    // Register tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: [
                {
                    name: 'move_diagnostics',
                    description: 'Get Move language diagnostics for a file using move-analyzer',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            filePath: {
                                type: 'string',
                                description: 'Path to the Move source file to analyze',
                            },
                            content: {
                                type: 'string',
                                description: 'Optional file content (if not provided, reads from filePath)',
                            },
                            scope: {
                                type: 'string',
                                enum: ['file', 'package', 'workspace'],
                                description: 'Analysis scope (currently only file is supported)',
                                default: 'file',
                            },
                        },
                        required: ['filePath'],
                    },
                },
                {
                    name: 'move_hover',
                    description: 'Get hover information (type, documentation) for a symbol at a position in a Move file',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            filePath: {
                                type: 'string',
                                description: 'Path to the Move source file',
                            },
                            line: {
                                type: 'number',
                                description: 'Line number (0-based)',
                            },
                            character: {
                                type: 'number',
                                description: 'Character offset (0-based)',
                            },
                            content: {
                                type: 'string',
                                description: 'Optional file content (if not provided, reads from filePath)',
                            },
                        },
                        required: ['filePath', 'line', 'character'],
                    },
                },
                {
                    name: 'move_completions',
                    description: 'Get completion candidates at a position in a Move file',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            filePath: {
                                type: 'string',
                                description: 'Path to the Move source file',
                            },
                            line: {
                                type: 'number',
                                description: 'Line number (0-based)',
                            },
                            character: {
                                type: 'number',
                                description: 'Character offset (0-based)',
                            },
                            content: {
                                type: 'string',
                                description: 'Optional file content (if not provided, reads from filePath)',
                            },
                        },
                        required: ['filePath', 'line', 'character'],
                    },
                },
                {
                    name: 'move_goto_definition',
                    description: 'Get the definition location for a symbol at a position in a Move file. Cross-package goto-definition may not resolve due to move-analyzer limitations.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            filePath: {
                                type: 'string',
                                description: 'Path to the Move source file',
                            },
                            line: {
                                type: 'number',
                                description: 'Line number (0-based)',
                            },
                            character: {
                                type: 'number',
                                description: 'Character offset (0-based)',
                            },
                            content: {
                                type: 'string',
                                description: 'Optional file content (if not provided, reads from filePath)',
                            },
                        },
                        required: ['filePath', 'line', 'character'],
                    },
                },
            ],
        };
    });
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        try {
            let result;
            switch (name) {
                case 'move_diagnostics':
                    result = await handleMoveDiagnostics(args || {});
                    break;
                case 'move_hover':
                    result = await handleMoveHover(args || {});
                    break;
                case 'move_completions':
                    result = await handleMoveCompletions(args || {});
                    break;
                case 'move_goto_definition':
                    result = await handleMoveGotoDefinition(args || {});
                    break;
                default:
                    throw new Error(`Unknown tool: ${name}`);
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            log('error', `Tool ${name} failed`, { error, args });
            if (error instanceof MoveLspError) {
                // Try to resolve workspaceRoot from filePath for error response consistency
                let errorWorkspaceRoot = null;
                try {
                    const filePath = args?.filePath;
                    if (filePath && typeof filePath === 'string') {
                        errorWorkspaceRoot = workspaceResolver.resolve(resolve(filePath));
                    }
                }
                catch {
                    // Workspace resolution failed - leave as null
                }
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                workspaceRoot: errorWorkspaceRoot,
                                error: {
                                    code: error.code,
                                    message: error.message,
                                    details: error.details,
                                },
                            }, null, 2),
                        },
                    ],
                    isError: true,
                };
            }
            throw error;
        }
    });
    // Cleanup on server shutdown
    server.close = async () => {
        if (lspClient) {
            await lspClient.shutdown();
        }
    };
    return server;
}
//# sourceMappingURL=server.js.map