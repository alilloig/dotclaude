# sui-move

A Claude Code plugin for Sui Move development with LSP integration, comprehensive documentation, and code quality tools.

## Overview

The sui-move plugin transforms Claude into a Sui/Move development expert. It combines:

- **Doc-grounded guidance** using bundled Sui, Walrus, and Seal documentation
- **Real-time LSP integration** via move-analyzer for diagnostics, hover, completions, and navigation
- **Code quality skills** for Move 2024 Edition compliance and security review
- **Test generation** following Move testing best practices

The plugin enforces a doc-first workflow: Claude consults bundled documentation before writing code, ensuring accurate and up-to-date guidance.

## Features

### MCP Tools

| Tool | Description |
|------|-------------|
| `move_diagnostics` | Get compiler warnings and errors for a Move file |
| `move_hover` | Get type information at a position |
| `move_completions` | Get completion suggestions |
| `move_goto_definition` | Navigate to symbol definitions |

### Bundled Skills

| Skill | Command | Purpose |
|-------|---------|---------|
| move-code-quality | `/move-code-quality` | Move Book Code Quality Checklist compliance |
| move-code-review | `/move-code-review` | Security and architecture review |
| move-tests | `/move-tests` | Test generation best practices |

### Bundled Documentation

- **Sui/Move** (`.sui-docs/`): Blockchain, Move language, objects, transactions, SDKs
- **Walrus** (`.walrus-docs/`): Decentralized storage, blobs, Walrus Sites
- **Seal** (`.seal-docs/`): Secrets management, encryption, key servers

## Installation

### Prerequisites

- Node.js 18+
- pnpm
- move-analyzer (for LSP features)

### Install move-analyzer

```bash
cargo install --git https://github.com/MystenLabs/sui.git sui-move-analyzer
```

### Install the Plugin

```bash
# Clone to plugins directory
cd ~/.claude/plugins
git clone <repo-url> sui-move

# Build MCP server
cd sui-move/mcp/move-lsp-mcp
pnpm install
pnpm build

# Register with Claude Code
claude plugin add ./sui-move
```

See [docs/INSTALL.md](docs/INSTALL.md) for detailed instructions.

## Quick Start

### Ask About Sui/Move

```
What are shared objects in Sui and when should I use them?
```

### Generate a Module

```
Create a Counter module in Move 2024 with increment and value functions
```

### Check Code Quality

```
/move-code-quality
```

### Security Review

```
/move-code-review
```

### Get Diagnostics

```
Check diagnostics for sources/my_module.move
```

## Documentation

| Document | Description |
|----------|-------------|
| [INSTALL.md](docs/INSTALL.md) | Installation guide |
| [PLATFORMS.md](docs/PLATFORMS.md) | Platform-specific setup (macOS, Linux, Windows) |
| [CONFIGURATION.md](docs/CONFIGURATION.md) | Environment variables and configuration |
| [USAGE.md](docs/USAGE.md) | Usage examples and workflows |
| [SKILLS.md](docs/SKILLS.md) | Bundled skills reference |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common issues and solutions |
| [COMPLIANCE.md](docs/COMPLIANCE.md) | Agent workflow compliance auditing |

## Requirements

- **Node.js**: 18+
- **pnpm**: For package management
- **move-analyzer**: For LSP features (optional but recommended)
- **Claude Code**: Plugin host environment

## License

MIT
