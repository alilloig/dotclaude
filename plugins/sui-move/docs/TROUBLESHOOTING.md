# Troubleshooting

Common issues and solutions for the sui-move plugin.

## Missing Binary

### Symptoms

- MCP tools return "move-analyzer not found"
- Diagnostics, hover, completions, and goto definition don't work
- Plugin loads but LSP features are unavailable

### Solutions

1. **Install move-analyzer**:
   ```bash
   cargo install --git https://github.com/MystenLabs/sui.git sui-move-analyzer
   ```

2. **Verify installation**:
   ```bash
   which move-analyzer
   move-analyzer --version
   ```

3. **Check PATH**:
   ```bash
   echo $PATH | tr ':' '\n' | grep cargo
   # Should include ~/.cargo/bin
   ```

4. **Set explicit path**:
   ```bash
   export MOVE_ANALYZER_PATH="$HOME/.cargo/bin/move-analyzer"
   ```

5. **Restart Claude Code** after installation.

## No Move.toml

### Symptoms

- "No Move.toml found" errors
- Workspace not detected
- LSP tools return generic errors

### Solutions

1. **Verify project structure**:
   ```bash
   ls -la Move.toml
   # Should exist in project root
   ```

2. **Create Move.toml**:
   ```toml
   [package]
   name = "my_project"
   edition = "2024"

   [addresses]
   my_project = "0x0"
   ```

3. **Check you're in the right directory**:
   ```bash
   pwd
   # Should be the Move project root
   ```

4. **For monorepos**, navigate to the specific package directory.

## Stale Docs

### Symptoms

- Documentation seems outdated
- New Sui features not covered
- Patterns don't match current Sui version

### Solutions

1. **Check docs version**:
   ```bash
   cat plugins/sui-move/docs/VERSION.json
   ```

2. **Update bundled docs** (if sync script available):
   ```bash
   cd plugins/sui-move
   ./scripts/sync-docs.sh
   ```

3. **Manual update**: Replace docs in `.sui-docs/`, `.walrus-docs/`, `.seal-docs/` with latest from official repositories.

4. **Report outdated docs**: File an issue if you find incorrect information.

## Windows PATH

### Symptoms (Windows-specific)

- "command not found" for move-analyzer
- Plugin can't find binary despite installation
- PATH changes don't take effect

### Solutions

1. **Use full path**:
   ```powershell
   $env:MOVE_ANALYZER_PATH = "C:\Users\YourName\.cargo\bin\move-analyzer.exe"
   ```

2. **Add to system PATH**:
   - Open System Properties > Environment Variables
   - Add `C:\Users\YourName\.cargo\bin` to PATH
   - Restart terminal/Claude Code

3. **Use WSL2** (recommended):
   ```powershell
   wsl --install -d Ubuntu
   # Then use Linux setup
   ```

4. **Check Windows Defender**: Ensure it's not blocking the binary.

## Analyzer Crash

### Symptoms

- LSP tools work briefly then fail
- "LSP client not available" after initial success
- Repeated crash/restart cycles

### Solutions

1. **Check restart limit**:
   ```bash
   export MOVE_LSP_MAX_RESTARTS=5
   ```

2. **Enable debug logging**:
   ```bash
   export MOVE_LSP_LOG_LEVEL=debug
   # Check logs for crash details
   ```

3. **Increase timeout** (for large projects):
   ```bash
   export MOVE_LSP_TIMEOUT_MS=60000
   ```

4. **Check memory usage**: Large Move projects can exhaust memory.

5. **Update move-analyzer**:
   ```bash
   cargo install --git https://github.com/MystenLabs/sui.git sui-move-analyzer --force
   ```

6. **Report crash**: If reproducible, file an issue with:
   - Move.toml contents
   - Move file that triggers crash
   - Debug logs

## Build Errors

### Symptoms

- Plugin fails to build
- `pnpm build` errors
- TypeScript compilation failures

### Solutions

1. **Clean and rebuild**:
   ```bash
   cd plugins/sui-move/mcp/move-lsp-mcp
   pnpm clean
   pnpm install
   pnpm build
   ```

2. **Check Node version**:
   ```bash
   node --version
   # Should be 18+
   ```

3. **Check pnpm version**:
   ```bash
   pnpm --version
   ```

4. **Clear node_modules**:
   ```bash
   rm -rf node_modules
   pnpm install
   ```

## Tests Failing

### Symptoms

- `pnpm test` failures
- Integration tests skipped
- E2E tests timeout

### Solutions

1. **Check binary availability**:
   - Integration and E2E tests require move-analyzer
   - They skip gracefully if not installed

2. **Increase test timeout** (vitest.config.ts).

3. **Run specific test**:
   ```bash
   pnpm test -- --grep "specific test name"
   ```

4. **Check test logs**:
   ```bash
   pnpm test -- --reporter=verbose
   ```

## Plugin Not Loading

### Symptoms

- Claude Code doesn't show sui-move plugin
- Commands not available
- Agent not activating

### Solutions

1. **Verify plugin structure**:
   ```bash
   ls plugins/sui-move/.claude-plugin/plugin.json
   ```

2. **Validate plugin.json**:
   ```bash
   cat plugins/sui-move/.claude-plugin/plugin.json | jq .
   ```

3. **Check referenced paths exist**:
   ```bash
   cd plugins/sui-move
   test -f commands/sui-move.md && echo "OK" || echo "MISSING"
   test -d skills && echo "OK" || echo "MISSING"
   ```

4. **Rebuild MCP server**:
   ```bash
   cd plugins/sui-move/mcp/move-lsp-mcp
   pnpm build
   ```

5. **Restart Claude Code** to reload plugins.

## Getting Help

If none of these solutions work:

1. **Enable debug logging**:
   ```bash
   export MOVE_LSP_LOG_LEVEL=debug
   ```

2. **Collect information**:
   - OS and version
   - Node.js version
   - move-analyzer version
   - Error messages
   - Steps to reproduce

3. **File an issue** with the collected information.
