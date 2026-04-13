/**
 * Structured JSON logging for Move LSP MCP server
 */
let currentLogLevel = 'info';
const logLevels = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
/**
 * Set the current log level
 */
export function setLogLevel(level) {
    currentLogLevel = level;
}
/**
 * Check if a log level should be output
 */
export function shouldLog(level) {
    return logLevels[level] >= logLevels[currentLogLevel];
}
/**
 * Log a structured message to stderr in JSON format
 */
export function log(level, message, extra) {
    if (!shouldLog(level)) {
        return;
    }
    const entry = {
        event: 'move_lsp_mcp',
        level,
        timestamp: new Date().toISOString(),
        message,
        ...extra,
    };
    // Always log to stderr to avoid interfering with MCP protocol on stdout
    console.error(JSON.stringify(entry));
}
/**
 * Log debug message
 */
export function debug(message, extra) {
    log('debug', message, extra);
}
/**
 * Log info message
 */
export function info(message, extra) {
    log('info', message, extra);
}
/**
 * Log warning message
 */
export function warn(message, extra) {
    log('warn', message, extra);
}
/**
 * Log error message
 */
export function error(message, extra) {
    log('error', message, extra);
}
//# sourceMappingURL=logger.js.map