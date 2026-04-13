/**
 * Error codes and types for Move LSP MCP server
 */
export declare const BINARY_NOT_FOUND = "BINARY_NOT_FOUND";
export declare const NO_WORKSPACE = "NO_WORKSPACE";
export declare const LSP_START_FAILED = "LSP_START_FAILED";
export declare const LSP_TIMEOUT = "LSP_TIMEOUT";
export declare const LSP_CRASHED = "LSP_CRASHED";
export declare const LSP_PROTOCOL_ERROR = "LSP_PROTOCOL_ERROR";
export declare const LSP_COMMUNICATION_FAILED = "LSP_COMMUNICATION_FAILED";
export declare const INVALID_FILE_PATH = "INVALID_FILE_PATH";
export declare const FILE_NOT_FOUND = "FILE_NOT_FOUND";
export declare const WORKSPACE_INIT_FAILED = "WORKSPACE_INIT_FAILED";
export declare const SYMBOL_NOT_FOUND = "SYMBOL_NOT_FOUND";
/**
 * Base error class for Move LSP operations
 */
export declare class MoveLspError extends Error {
    readonly code: string;
    readonly details?: unknown | undefined;
    constructor(message: string, code: string, details?: unknown | undefined);
}
/**
 * Error thrown when move-analyzer binary is not found
 */
export declare class BinaryNotFoundError extends MoveLspError {
    constructor(path?: string);
}
/**
 * Error thrown when no workspace is found
 */
export declare class NoWorkspaceError extends MoveLspError {
    constructor(path: string);
}
/**
 * Error thrown when LSP server fails to start
 */
export declare class LspStartFailedError extends MoveLspError {
    constructor(reason: string, details?: unknown);
}
/**
 * Error thrown when LSP request times out
 */
export declare class LspTimeoutError extends MoveLspError {
    constructor(method: string, timeoutMs: number);
}
/**
 * Error thrown when LSP server crashes unexpectedly
 */
export declare class LspCrashedError extends MoveLspError {
    constructor(exitCode: number | null, signal: string | null);
}
/**
 * Error thrown when LSP protocol is violated
 */
export declare class LspProtocolError extends MoveLspError {
    constructor(message: string, details?: unknown);
}
/**
 * Error thrown when a requested symbol is not found
 */
export declare class SymbolNotFoundError extends MoveLspError {
    constructor(symbol: string, location?: string);
}
