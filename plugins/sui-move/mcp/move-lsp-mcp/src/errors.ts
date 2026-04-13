/**
 * Error codes and types for Move LSP MCP server
 */

// Error codes
export const BINARY_NOT_FOUND = 'BINARY_NOT_FOUND';
export const NO_WORKSPACE = 'NO_WORKSPACE';
export const LSP_START_FAILED = 'LSP_START_FAILED';
export const LSP_TIMEOUT = 'LSP_TIMEOUT';
export const LSP_COMMUNICATION_FAILED = 'LSP_COMMUNICATION_FAILED';
export const INVALID_FILE_PATH = 'INVALID_FILE_PATH';
export const FILE_NOT_FOUND = 'FILE_NOT_FOUND';
export const WORKSPACE_INIT_FAILED = 'WORKSPACE_INIT_FAILED';

/**
 * Base error class for Move LSP operations
 */
export class MoveLspError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'MoveLspError';
  }
}

/**
 * Error thrown when move-analyzer binary is not found
 */
export class BinaryNotFoundError extends MoveLspError {
  constructor(path?: string) {
    super(
      path
        ? `move-analyzer not found at path: ${path}`
        : 'move-analyzer not found in PATH',
      BINARY_NOT_FOUND
    );
  }
}

/**
 * Error thrown when no workspace is found
 */
export class NoWorkspaceError extends MoveLspError {
  constructor(path: string) {
    super(`No Move workspace found at: ${path}`, NO_WORKSPACE);
  }
}

/**
 * Error thrown when LSP server fails to start
 */
export class LspStartFailedError extends MoveLspError {
  constructor(reason: string, details?: unknown) {
    super(`Failed to start Move LSP: ${reason}`, LSP_START_FAILED, details);
  }
}