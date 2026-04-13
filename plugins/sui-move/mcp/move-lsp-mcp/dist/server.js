/**
 * MCP Server for Move LSP integration
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { MoveLspClient } from './lsp-client.js';
import { discoverBinary, getBinaryVersion } from './binary-discovery.js';
import { parseConfig, validateConfig } from './config.js';
import { log, setLogLevel, info, error } from './logger.js';
import { BinaryNotFoundError, NoWorkspaceError, MoveLspError, INVALID_FILE_PATH, FILE_NOT_FOUND, NO_WORKSPACE, } from './errors.js';
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
    // Find workspace root for a file path
    function findWorkspaceRoot(filePath) {
        let currentDir = dirname(resolve(filePath));
        while (currentDir !== '/' && currentDir !== '.') {
            const moveTomlPath = resolve(currentDir, 'Move.toml');
            if (existsSync(moveTomlPath)) {
                return currentDir;
            }
            const parentDir = dirname(currentDir);
            if (parentDir === currentDir)
                break; // Reached filesystem root
            currentDir = parentDir;
        }
        throw new NoWorkspaceError(filePath);
    }
    // Initialize LSP client for a workspace
    async function initializeLspClient(workspaceRoot) {
        if (lspClient?.isReady())
            return;
        await initializeBinary();
        if (!globalBinaryPath) {
            throw new Error('Binary not initialized');
        }
        lspClient = new MoveLspClient(globalBinaryPath, config);
        await lspClient.start(workspaceRoot);
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
        // Find workspace root
        let workspaceRoot;
        try {
            workspaceRoot = findWorkspaceRoot(resolvedPath);
        }
        catch (error) {
            if (error instanceof NoWorkspaceError) {
                throw error;
            }
            throw new MoveLspError(`Failed to find workspace: ${error}`, NO_WORKSPACE);
        }
        // Initialize LSP client
        await initializeLspClient(workspaceRoot);
        if (!lspClient) {
            throw new Error('Failed to initialize LSP client');
        }
        // Read file content if not provided
        const fileContent = content || readFileSync(resolvedPath, 'utf8');
        const fileUri = `file://${resolvedPath}`;
        // Open document in LSP server - this triggers diagnostics
        await lspClient.didOpen(fileUri, fileContent);
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
            ],
        };
    });
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        try {
            switch (name) {
                case 'move_diagnostics':
                    const result = await handleMoveDiagnostics(args || {});
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(result, null, 2),
                            },
                        ],
                    };
                default:
                    throw new Error(`Unknown tool: ${name}`);
            }
        }
        catch (error) {
            log('error', `Tool ${name} failed`, { error, args });
            if (error instanceof MoveLspError) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
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