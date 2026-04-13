/**
 * MCP Server for Move LSP integration
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
/**
 * Initialize binary discovery on startup (called from index.ts)
 * Logs version info to stderr in JSON format
 */
export declare function initializeBinaryOnStartup(): Promise<void>;
/**
 * Create and configure the MCP server
 */
export declare function createServer(): Server;
