# Platform Setup

The sui-move plugin supports macOS and Linux. Windows support is experimental.

## macOS Setup

### Prerequisites

1. **Xcode Command Line Tools**:
   ```bash
   xcode-select --install
   ```

2. **Rust toolchain** (for building move-analyzer):
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source ~/.cargo/env
   ```

3. **Node.js 18+**:
   ```bash
   # Using Homebrew
   brew install node@18

   # Or using nvm
   nvm install 18
   nvm use 18
   ```

4. **pnpm**:
   ```bash
   npm install -g pnpm
   ```

### Installing move-analyzer

```bash
# Build from Sui repository
cargo install --git https://github.com/MystenLabs/sui.git sui-move-analyzer

# Verify installation
move-analyzer --version

# The binary will be at ~/.cargo/bin/move-analyzer
```

### Verifying Setup

```bash
# Check all prerequisites
node --version       # Should be 18+
pnpm --version       # Should be 8+
move-analyzer --version
```

## Linux Setup

### Prerequisites

#### Ubuntu/Debian

```bash
# Build essentials
sudo apt update
sudo apt install -y build-essential pkg-config libssl-dev curl git

# Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Node.js 18+ (using NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# pnpm
npm install -g pnpm
```

#### Fedora/RHEL

```bash
# Build essentials
sudo dnf install -y gcc gcc-c++ openssl-devel curl git

# Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Node.js 18+
sudo dnf install -y nodejs

# pnpm
npm install -g pnpm
```

### Installing move-analyzer

```bash
# Build from Sui repository
cargo install --git https://github.com/MystenLabs/sui.git sui-move-analyzer

# Verify installation
move-analyzer --version
```

### Common Linux Issues

1. **OpenSSL not found**: Install `libssl-dev` (Debian) or `openssl-devel` (Fedora)
2. **pkg-config not found**: Install `pkg-config` package
3. **Permission denied**: Ensure `~/.cargo/bin` is in your PATH

## Windows (Experimental)

Windows support is experimental. The plugin has been tested on Windows 11 with WSL2.

### WSL2 (Recommended)

For the best experience on Windows, use WSL2 with Ubuntu:

```powershell
# Install WSL2 with Ubuntu
wsl --install -d Ubuntu

# Then follow Linux (Ubuntu) setup instructions above
```

### Native Windows (Limited Support)

Native Windows support requires:

1. **Visual Studio Build Tools** with C++ workload
2. **Rust toolchain** via rustup-init.exe
3. **Node.js 18+** from nodejs.org
4. **pnpm** via `npm install -g pnpm`

#### Known Limitations

- PATH resolution may require manual configuration
- Some LSP features may have reduced performance
- Long file paths (>260 characters) may cause issues

#### Setting MOVE_ANALYZER_PATH

On Windows, you may need to explicitly set the path:

```powershell
# PowerShell
$env:MOVE_ANALYZER_PATH = "C:\Users\YourName\.cargo\bin\move-analyzer.exe"

# Or in system environment variables for persistence
```

### Troubleshooting Windows

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#windows-path) for Windows-specific issues.
