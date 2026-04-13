# Usage Guide

This guide covers common workflows with the sui-move plugin.

## Asking Questions

The plugin includes comprehensive Sui, Walrus, and Seal documentation. Ask questions and get doc-grounded answers.

### Examples

**Learning about Sui concepts:**
```
What are shared objects in Sui and when should I use them?
```

**Understanding Move patterns:**
```
How do I implement a capability pattern in Move 2024?
```

**Walrus storage:**
```
How do I store a blob on Walrus using the TypeScript SDK?
```

**Seal encryption:**
```
How does Seal's threshold cryptography work?
```

The agent will search the bundled documentation before answering, ensuring accurate and up-to-date information.

## Generating Modules

Ask the agent to generate Move modules. It follows doc-first workflow: reading documentation before writing code.

### Examples

**Simple module:**
```
Create a Counter module in Move 2024 with increment, decrement, and value functions.
```

**Token implementation:**
```
Implement a fungible token following Sui Coin standards with a treasury cap.
```

**NFT collection:**
```
Create an NFT collection with minting, burning, and transfer functions.
```

**DeFi primitive:**
```
Build a simple liquidity pool for swapping between two coin types.
```

After generation, the agent will suggest running `/move-code-quality` to verify the code.

## Reviewing Packages

Use the built-in skills to review Move packages for quality and security.

### Code Quality Review

```
/move-code-quality
```

Checks against the Move Book Code Quality Checklist:
- Move 2024 Edition compliance
- Module syntax (label vs curly braces)
- Naming conventions (EPascalCase errors, ALL_CAPS constants)
- Method syntax usage
- Macro patterns (do!, fold!, filter!)

### Security Review

```
/move-code-review
```

Performs security and architecture analysis:
- Access control vulnerabilities
- Arithmetic safety (division by zero, overflow)
- Object model design
- Shared object congestion risks
- Test coverage gaps

### Test Generation

```
/move-tests
```

Generates unit tests following best practices:
- Tests in `tests/` directory
- Proper cleanup with `std::unit_test::destroy`
- Expected failure tests
- Coverage verification

## Using MCP Tools

The plugin provides four MCP tools that integrate with move-analyzer.

### move_diagnostics

Get compiler diagnostics for a Move file:

```
Check diagnostics for sources/my_module.move
```

Returns warnings and errors from the Move compiler, including:
- Syntax errors
- Type mismatches
- Unused variables
- Missing abilities

### move_hover

Get type information at a specific position:

```
What's the type of the variable at line 15, column 10 in sources/pool.move?
```

Returns:
- Type signatures
- Documentation comments
- Symbol information

### move_completions

Get completion suggestions:

```
What completions are available after typing "ctx." on line 20 of sources/admin.move?
```

Returns:
- Method suggestions
- Field access options
- Module members

### move_goto_definition

Navigate to symbol definitions:

```
Where is the Counter struct defined that's used on line 25 of sources/game.move?
```

Returns:
- File path
- Line and column of definition
- Preview of the definition

## Workflow Examples

### Starting a New Project

1. Create project structure:
   ```
   Create a new Move project called "my_dapp" with a basic module structure
   ```

2. Generate initial module:
   ```
   Create a Registry module that stores user profiles with add, remove, and get functions
   ```

3. Run quality check:
   ```
   /move-code-quality
   ```

4. Fix any issues and run security review:
   ```
   /move-code-review
   ```

5. Generate tests:
   ```
   /move-tests
   ```

### Debugging an Issue

1. Check diagnostics:
   ```
   Check diagnostics for sources/broken_module.move
   ```

2. Get type information:
   ```
   What type is expected at line 42, column 15?
   ```

3. Navigate to definitions:
   ```
   Where is the function called on line 42 defined?
   ```

### Pre-deployment Review

1. Full quality check:
   ```
   /move-code-quality
   ```

2. Security audit:
   ```
   /move-code-review
   ```

3. Verify test coverage:
   ```
   Run `sui move test --coverage` and show me the coverage summary
   ```

## Best Practices

1. **Always run quality checks** before committing Move code
2. **Use doc-first workflow**: let the agent consult documentation before writing code
3. **Review security** before any mainnet deployment
4. **Write tests** for all public functions
5. **Check diagnostics** when the compiler reports errors

## Troubleshooting

If tools are not working:

1. Verify move-analyzer is installed: `which move-analyzer`
2. Check the MCP server is running (Claude Code shows connected servers)
3. Ensure you're in a valid Move project (has `Move.toml`)
4. See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues
