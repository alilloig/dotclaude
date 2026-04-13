/**
 * E2E Plugin Workflow Tests
 *
 * Tests the complete plugin workflow:
 * document open -> diagnostics -> hover -> completions -> goto definition
 *
 * These tests require move-analyzer to be installed. They are skipped gracefully
 * if the binary is not available.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess, execFileSync } from 'child_process';
import { join } from 'path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';

// Check if move-analyzer is available using execFileSync (safe, no shell)
function checkBinarySync(): boolean {
  try {
    execFileSync('which', ['move-analyzer'], { stdio: 'pipe' });
    return true;
  } catch {
    console.error('move-analyzer not found, skipping E2E plugin workflow tests');
    return false;
  }
}

const BINARY_AVAILABLE = checkBinarySync();

// Skip all tests if binary not available
const describeWithBinary = BINARY_AVAILABLE ? describe : describe.skip;

describeWithBinary('E2E: Plugin Workflow', () => {
  let serverProcess: ChildProcess | null = null;
  let testWorkspace: string;
  let messageId = 0;

  // Helper to send JSON-RPC message to server
  const sendMessage = (method: string, params: Record<string, unknown>): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      if (!serverProcess || !serverProcess.stdin || !serverProcess.stdout) {
        reject(new Error('Server not running'));
        return;
      }

      const id = ++messageId;
      const message = JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params,
      });

      const content = `Content-Length: ${Buffer.byteLength(message)}\r\n\r\n${message}`;

      let buffer = '';
      const onData = (data: Buffer) => {
        buffer += data.toString();

        // Parse JSON-RPC response
        const headerMatch = buffer.match(/Content-Length: (\d+)\r\n\r\n/);
        if (headerMatch) {
          const contentLength = parseInt(headerMatch[1], 10);
          const headerLength = headerMatch[0].length;
          const bodyStart = headerLength;
          const bodyEnd = bodyStart + contentLength;

          if (buffer.length >= bodyEnd) {
            const body = buffer.slice(bodyStart, bodyEnd);
            try {
              const response = JSON.parse(body);
              if (response.id === id) {
                serverProcess?.stdout?.removeListener('data', onData);
                if (response.error) {
                  reject(new Error(response.error.message));
                } else {
                  resolve(response.result);
                }
              }
            } catch (e) {
              // Continue reading
            }
          }
        }
      };

      serverProcess.stdout.on('data', onData);

      // Set timeout
      setTimeout(() => {
        serverProcess?.stdout?.removeListener('data', onData);
        reject(new Error('Request timeout'));
      }, 10000);

      serverProcess.stdin.write(content);
    });
  };

  beforeAll(async () => {
    // Create test workspace with Move.toml and a Move file
    testWorkspace = join(tmpdir(), `move-e2e-test-${Date.now()}`);
    mkdirSync(testWorkspace, { recursive: true });
    mkdirSync(join(testWorkspace, 'sources'), { recursive: true });

    // Create Move.toml
    writeFileSync(
      join(testWorkspace, 'Move.toml'),
      `[package]
name = "e2e_test"
edition = "2024"

[addresses]
e2e_test = "0x0"
`
    );

    // Create a simple Move module
    writeFileSync(
      join(testWorkspace, 'sources', 'counter.move'),
      `module e2e_test::counter;

public struct Counter has key, store {
    id: sui::object::UID,
    value: u64,
}

public fun value(counter: &Counter): u64 {
    counter.value
}

public fun increment(counter: &mut Counter) {
    counter.value = counter.value + 1;
}
`
    );

    // Start the MCP server
    const serverPath = join(__dirname, '../../dist/index.js');
    if (!existsSync(serverPath)) {
      throw new Error(`Server not built: ${serverPath}`);
    }

    serverProcess = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        MOVE_LSP_LOG_LEVEL: 'error', // Reduce noise
      },
    });

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Initialize MCP connection
    await sendMessage('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'e2e-test', version: '1.0.0' },
    });
  }, 30000);

  afterAll(async () => {
    // Clean up server
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (!serverProcess.killed) {
        serverProcess.kill('SIGKILL');
      }
    }

    // Clean up test workspace
    if (testWorkspace && existsSync(testWorkspace)) {
      rmSync(testWorkspace, { recursive: true, force: true });
    }
  });

  it('should list available tools', async () => {
    const result = (await sendMessage('tools/list', {})) as { tools: Array<{ name: string }> };
    expect(result.tools).toBeDefined();

    const toolNames = result.tools.map((t) => t.name);
    expect(toolNames).toContain('move_diagnostics');
    expect(toolNames).toContain('move_hover');
    expect(toolNames).toContain('move_completions');
    expect(toolNames).toContain('move_goto_definition');
  });

  it('should open document and get diagnostics', async () => {
    const filePath = join(testWorkspace, 'sources', 'counter.move');

    const result = (await sendMessage('tools/call', {
      name: 'move_diagnostics',
      arguments: {
        file_path: filePath,
      },
    })) as { content: Array<{ type: string; text: string }> };

    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.content[0].type).toBe('text');

    // The response should contain diagnostics info (may be empty for valid code)
    const text = result.content[0].text;
    expect(text).toBeDefined();
  });

  it('should provide hover information', async () => {
    const filePath = join(testWorkspace, 'sources', 'counter.move');

    const result = (await sendMessage('tools/call', {
      name: 'move_hover',
      arguments: {
        file_path: filePath,
        line: 8, // line with 'counter.value'
        character: 4, // 'counter' variable
      },
    })) as { content: Array<{ type: string; text: string }> };

    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.content[0].type).toBe('text');
  });

  it('should provide completions', async () => {
    const filePath = join(testWorkspace, 'sources', 'counter.move');

    const result = (await sendMessage('tools/call', {
      name: 'move_completions',
      arguments: {
        file_path: filePath,
        line: 8,
        character: 12, // after 'counter.'
      },
    })) as { content: Array<{ type: string; text: string }> };

    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.content[0].type).toBe('text');
  });

  it('should provide goto definition', async () => {
    const filePath = join(testWorkspace, 'sources', 'counter.move');

    const result = (await sendMessage('tools/call', {
      name: 'move_goto_definition',
      arguments: {
        file_path: filePath,
        line: 8, // line with 'counter.value'
        character: 4, // 'counter' parameter
      },
    })) as { content: Array<{ type: string; text: string }> };

    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.content[0].type).toBe('text');
  });

  it('should handle full workflow: open -> diagnostics -> hover -> completions -> goto', async () => {
    // This test exercises the complete workflow as a single flow
    const filePath = join(testWorkspace, 'sources', 'counter.move');

    // Step 1: Get diagnostics (implicitly opens document)
    const diagnostics = (await sendMessage('tools/call', {
      name: 'move_diagnostics',
      arguments: { file_path: filePath },
    })) as { content: Array<{ type: string; text: string }> };
    expect(diagnostics.content).toBeDefined();

    // Step 2: Get hover
    const hover = (await sendMessage('tools/call', {
      name: 'move_hover',
      arguments: { file_path: filePath, line: 3, character: 15 },
    })) as { content: Array<{ type: string; text: string }> };
    expect(hover.content).toBeDefined();

    // Step 3: Get completions
    const completions = (await sendMessage('tools/call', {
      name: 'move_completions',
      arguments: { file_path: filePath, line: 8, character: 12 },
    })) as { content: Array<{ type: string; text: string }> };
    expect(completions.content).toBeDefined();

    // Step 4: Get goto definition
    const gotoDef = (await sendMessage('tools/call', {
      name: 'move_goto_definition',
      arguments: { file_path: filePath, line: 8, character: 4 },
    })) as { content: Array<{ type: string; text: string }> };
    expect(gotoDef.content).toBeDefined();

    // All steps completed successfully
    expect(true).toBe(true);
  });
});
