# Configuration

The sui-move plugin can be configured via environment variables.

## Environment Variables

### MOVE_ANALYZER_PATH

Path to the `move-analyzer` binary. If not set, the plugin searches standard locations.

```bash
# Default search locations (in order):
# 1. ~/.cargo/bin/move-analyzer
# 2. /usr/local/bin/move-analyzer
# 3. System PATH

# Override with custom path:
export MOVE_ANALYZER_PATH="/opt/sui/bin/move-analyzer"
```

**When to use**: Set this when move-analyzer is installed in a non-standard location, or when you have multiple versions and want to use a specific one.

### MOVE_LSP_TIMEOUT_MS

Timeout in milliseconds for LSP requests. Default: `30000` (30 seconds).

```bash
# Increase timeout for slow systems or large projects
export MOVE_LSP_TIMEOUT_MS=60000

# Decrease for faster feedback (may cause timeouts on complex operations)
export MOVE_LSP_TIMEOUT_MS=15000
```

**When to use**: Increase if you see timeout errors on large Move packages. Decrease if you want faster failure detection.

### MOVE_LSP_LOG_LEVEL

Controls the verbosity of MCP server logs. Values: `debug`, `info`, `warn`, `error`.

```bash
# Default: info
export MOVE_LSP_LOG_LEVEL=info

# Verbose debugging
export MOVE_LSP_LOG_LEVEL=debug

# Quiet mode (errors only)
export MOVE_LSP_LOG_LEVEL=error
```

**When to use**: Set to `debug` when troubleshooting issues. Set to `error` in production for minimal noise.

### MOVE_LSP_MAX_RESTARTS

Maximum number of times the LSP client will restart after a crash before giving up. Default: `3`.

```bash
# Allow more restarts for unstable environments
export MOVE_LSP_MAX_RESTARTS=5

# Disable automatic restarts
export MOVE_LSP_MAX_RESTARTS=0
```

**When to use**: Increase if move-analyzer crashes frequently but recovers well. Set to 0 if you want crashes to propagate immediately.

## Configuration Examples

### Development Setup

```bash
# .bashrc or .zshrc
export MOVE_LSP_LOG_LEVEL=debug
export MOVE_LSP_TIMEOUT_MS=60000
```

### Production/CI Setup

```bash
export MOVE_LSP_LOG_LEVEL=error
export MOVE_LSP_MAX_RESTARTS=1
```

### Custom Binary Location

```bash
# For a Sui development build
export MOVE_ANALYZER_PATH="$HOME/sui/target/release/move-analyzer"
```

## Claude Code Integration

When using the plugin with Claude Code, environment variables can be set in your shell profile before starting Claude Code, or in the Claude Code configuration.

### Shell Profile

Add to `~/.bashrc`, `~/.zshrc`, or equivalent:

```bash
# Sui Move plugin configuration
export MOVE_ANALYZER_PATH="$HOME/.cargo/bin/move-analyzer"
export MOVE_LSP_TIMEOUT_MS=30000
export MOVE_LSP_LOG_LEVEL=info
export MOVE_LSP_MAX_RESTARTS=3
```

### Per-Session Override

Set variables before running Claude Code:

```bash
MOVE_LSP_LOG_LEVEL=debug claude
```

## Verifying Configuration

After configuration, verify the plugin detects your settings:

1. Open a Move project in Claude Code
2. Ask Claude to check diagnostics on a `.move` file
3. If move-analyzer is found, you'll see LSP-powered diagnostics
4. If not found, you'll see a message indicating the binary location issue

Check the MCP server logs for configuration details when `MOVE_LSP_LOG_LEVEL=debug`.
