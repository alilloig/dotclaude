/**
 * MCP Server entrypoint for Move LSP integration
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';
import { info, error } from './logger.js';
/**
 * Main entry point
 */
async function main() {
    try {
        info('Starting Move LSP MCP server');
        const server = createServer();
        // Handle process signals
        const cleanup = async () => {
            info('Shutting down Move LSP MCP server');
            if (server.close) {
                await server.close();
            }
            process.exit(0);
        };
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
        // Start the server
        const transport = new StdioServerTransport();
        await server.connect(transport);
        info('Move LSP MCP server started successfully');
    }
    catch (err) {
        error('Failed to start Move LSP MCP server', { error: err });
        process.exit(1);
    }
}
// Handle unhandled rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
    error('Unhandled promise rejection', { reason, promise });
    process.exit(1);
});
process.on('uncaughtException', (err) => {
    error('Uncaught exception', { error: err });
    process.exit(1);
});
// Start the server
main().catch((err) => {
    error('Main function failed', { error: err });
    process.exit(1);
});
//# sourceMappingURL=index.js.map