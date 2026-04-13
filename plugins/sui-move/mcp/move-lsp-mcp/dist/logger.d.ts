/**
 * Structured JSON logging for Move LSP MCP server
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface LogEntry {
    event: string;
    level: LogLevel;
    timestamp: string;
    message: string;
    [key: string]: unknown;
}
/**
 * Set the current log level
 */
export declare function setLogLevel(level: LogLevel): void;
/**
 * Check if a log level should be output
 */
export declare function shouldLog(level: LogLevel): boolean;
/**
 * Log a structured message to stderr in JSON format
 */
export declare function log(level: LogLevel, message: string, extra?: Record<string, unknown>): void;
/**
 * Log debug message
 */
export declare function debug(message: string, extra?: Record<string, unknown>): void;
/**
 * Log info message
 */
export declare function info(message: string, extra?: Record<string, unknown>): void;
/**
 * Log warning message
 */
export declare function warn(message: string, extra?: Record<string, unknown>): void;
/**
 * Log error message
 */
export declare function error(message: string, extra?: Record<string, unknown>): void;
