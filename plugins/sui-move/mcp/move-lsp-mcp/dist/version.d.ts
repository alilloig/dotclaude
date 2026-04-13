/**
 * Version compatibility checking for Move LSP MCP server
 * Compares plugin VERSION.json against server package version
 */
/**
 * VERSION.json schema
 */
export interface VersionJson {
    pluginVersion: string;
    suiPilotRevision: string;
    syncTimestamp: string;
}
/**
 * Compatibility check result
 */
export interface CompatibilityResult {
    compatible: boolean;
    warning?: string;
}
/**
 * Check version compatibility between VERSION.json and server
 * @param versionJsonPath Path to the VERSION.json file
 * @returns Compatibility result with optional warning
 */
export declare function checkVersionCompatibility(versionJsonPath: string): CompatibilityResult;
