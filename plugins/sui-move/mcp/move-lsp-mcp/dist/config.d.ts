/**
 * Configuration management for Move LSP MCP server
 */
export interface Config {
    moveAnalyzerPath: string;
    moveLspTimeoutMs: number;
    moveLspLogLevel: string;
    moveLspMaxRestarts: number;
}
/**
 * Parse configuration from environment variables
 */
export declare function parseConfig(): Config;
/**
 * Validate configuration values
 */
export declare function validateConfig(config: Config): void;
