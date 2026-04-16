import { expect, test } from '@playwright/test';
import { execSync } from 'child_process';

// ============================================================
// Helper Functions
// ============================================================

const MCP_CMD_PREFIX =
  'claude -p "{PROMPT}" --strict-mcp-config --mcp-config .mcp-legaldoc.json --output-format stream-json --verbose --allowedTools \'mcp__legaldoc-ai__*\'';

function runMcpPrompt(prompt) {
  const cmd = MCP_CMD_PREFIX.replace('{PROMPT}', prompt);
  const output = execSync(cmd, { encoding: 'utf-8', cwd: '..', maxBuffer: 10 * 1024 * 1024 });
  return output;
}

function parseToolUse(streamOutput) {
  const lines = streamOutput.split('\n').filter(Boolean);
  let toolName = null;
  let toolResult = null;
  let toolError = false;

  for (const line of lines) {
    try {
      const msg = JSON.parse(line);

      // Find tool_use in assistant messages
      if (!toolName && msg.type === 'assistant' && msg.message?.content) {
        for (const block of msg.message.content) {
          if (block.type === 'tool_use' && block.name?.startsWith('mcp__legaldoc-ai__')) {
            toolName = block.name.replace('mcp__legaldoc-ai__', '');
          }
        }
      }

      // Find tool_result in user messages
      if (msg.type === 'user' && msg.message?.content) {
        for (const block of msg.message.content) {
          if (block.type === 'tool_result') {
            if (block.is_error) {
              toolError = true;
            }
            if (block.content) {
              try {
                if (Array.isArray(block.content)) {
                  toolResult = JSON.parse(block.content[0].text);
                } else {
                  toolResult = JSON.parse(block.content);
                }
              } catch {
                toolResult = block.content;
              }
            }
          }
        }
      }
    } catch {
      // skip non-JSON lines
    }
  }

  if (toolResult?.isError) {
    toolError = true;
  }

  return { toolName, toolResult, toolError };
}

// ============================================================
// Test Suite
// ============================================================

test.describe('Feature: MCP Server Tools', () => {
  test('MCP-01: List all reference documents without filter @purge-data @mcp', async () => {
    // @purge-data - Restore the seed data to initial state
    execSync('make reseed', { stdio: 'inherit', cwd: '..' });

    // When I prompt Claude Code "Show me all legal reference documents" with legaldoc mcp
    const output = runMcpPrompt('Show me all legal reference documents');
    const { toolName, toolResult } = parseToolUse(output);

    // Then the MCP tool "mcp_list_references" should be used
    expect(toolName).toBe('mcp_list_references');

    // And the response should be a list of reference documents
    const references = toolResult.result;
    expect(Array.isArray(references)).toBe(true);
    expect(references.length).toBeGreaterThan(0);

    // And each reference should contain "id", "title", "type", "description", "createdAt"
    const requiredKeys = ['id', 'title', 'type', 'description', 'createdAt'];
    for (const ref of references) {
      for (const key of requiredKeys) {
        expect(ref).toHaveProperty(key);
      }
    }

    // And the references should be sorted by createdAt descending
    const dates = references.map((r) => new Date(r.createdAt).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });

  test('MCP-02: List reference documents filtered by type @mcp', async () => {
    // When I prompt Claude Code "List all Contract reference documents" with legaldoc mcp
    const output = runMcpPrompt('List all Contract reference documents');
    const { toolName, toolResult } = parseToolUse(output);

    // Then the MCP tool "mcp_list_references" should be used
    expect(toolName).toBe('mcp_list_references');

    // And every returned reference should have type "Contract"
    const references = toolResult.result;
    expect(Array.isArray(references)).toBe(true);
    expect(references.length).toBeGreaterThan(0);
    for (const ref of references) {
      expect(ref.type).toBe('Contract');
    }
  });

  test('MCP-03: List references with a type that has no matches @mcp', async () => {
    // When I prompt Claude Code "Do we have any NDA reference documents on file?" with legaldoc mcp
    const output = runMcpPrompt('Do we have any NDA reference documents on file?');
    const { toolName, toolResult } = parseToolUse(output);

    // Then the MCP tool "mcp_list_references" should be used
    expect(toolName).toBe('mcp_list_references');

    // And the response should be an empty list
    const references = toolResult.result;
    expect(Array.isArray(references)).toBe(true);
    expect(references.length).toBe(0);
  });

  test('MCP-04: List documents with default pagination @mcp', async () => {
    // When I prompt Claude Code "What documents do we have in the system?" with legaldoc mcp
    const output = runMcpPrompt('What documents do we have in the system?');
    const { toolName, toolResult } = parseToolUse(output);

    // Then the MCP tool "mcp_list_documents" should be used
    expect(toolName).toBe('mcp_list_documents');

    // And the response should contain a list of "documents"
    const documents = toolResult.documents;
    expect(Array.isArray(documents)).toBe(true);
    expect(documents.length).toBeGreaterThan(0);

    // And each document should contain "id", "title", "type", "status", "description", "createdAt", "pageCount", "pdfUrl"
    const requiredKeys = ['id', 'title', 'type', 'status', 'description', 'createdAt', 'pageCount', 'pdfUrl'];
    for (const doc of documents) {
      for (const key of requiredKeys) {
        expect(doc).toHaveProperty(key);
      }
    }

    // And each "pdfUrl" should match the pattern "/api/v1/documents/{id}/pdf"
    for (const doc of documents) {
      expect(doc.pdfUrl).toBe(`/api/v1/documents/${doc.id}/pdf`);
    }

    // And the response should contain a "nextCursor" field
    expect(toolResult).toHaveProperty('nextCursor');
  });

  test('MCP-05: List documents sorted by recent @mcp', async () => {
    // When I prompt Claude Code "Show me the most recently created documents first" with legaldoc mcp
    const output = runMcpPrompt('Show me the most recently created documents first');
    const { toolName, toolResult } = parseToolUse(output);

    // Then the MCP tool "mcp_list_documents" should be used
    expect(toolName).toBe('mcp_list_documents');

    // And documents should be ordered by createdAt descending
    const documents = toolResult.documents;
    expect(Array.isArray(documents)).toBe(true);
    expect(documents.length).toBeGreaterThan(0);
    const dates = documents.map((d) => new Date(d.createdAt).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });

  test('MCP-06: List documents sorted alphabetically @mcp', async () => {
    // When I prompt Claude Code "Can you list our documents in alphabetical order?" with legaldoc mcp
    const output = runMcpPrompt('Can you list our documents in alphabetical order?');
    const { toolName, toolResult } = parseToolUse(output);

    // Then the MCP tool "mcp_list_documents" should be used
    expect(toolName).toBe('mcp_list_documents');

    // And documents should be ordered alphabetically by title ascending
    const documents = toolResult.documents;
    expect(Array.isArray(documents)).toBe(true);
    expect(documents.length).toBeGreaterThan(0);
    const titles = documents.map((d) => d.title);
    const sorted = [...titles].sort((a, b) => a.localeCompare(b));
    expect(titles).toEqual(sorted);
  });

  test('MCP-07: List documents filtered by type @mcp', async () => {
    // When I prompt Claude Code "Pull up all the Employment documents" with legaldoc mcp
    const output = runMcpPrompt('Pull up all the Employment documents');
    const { toolName, toolResult } = parseToolUse(output);

    // Then the MCP tool "mcp_list_documents" should be used
    expect(toolName).toBe('mcp_list_documents');

    // And every returned document should have type "Employment"
    const documents = toolResult.documents;
    expect(Array.isArray(documents)).toBe(true);
    expect(documents.length).toBeGreaterThan(0);
    for (const doc of documents) {
      expect(doc.type).toBe('Employment');
    }
  });

  test('MCP-08: Paginate documents using cursor @mcp', async () => {
    // When I prompt Claude Code "Give me a short list of just 2 documents" with legaldoc mcp
    const output1 = runMcpPrompt('Give me a short list of just 2 documents');
    const { toolName: toolName1, toolResult: toolResult1 } = parseToolUse(output1);

    // Then the MCP tool "mcp_list_documents" should be used
    expect(toolName1).toBe('mcp_list_documents');

    // And the response should contain at most 2 documents
    const docs1 = toolResult1.documents;
    expect(Array.isArray(docs1)).toBe(true);
    expect(docs1.length).toBeLessThanOrEqual(2);

    // And "nextCursor" should not be null when more documents exist
    expect(toolResult1.nextCursor).not.toBeNull();
    const cursor = toolResult1.nextCursor;

    // When I prompt Claude Code "Show me the next page of documents" with legaldoc mcp
    const output2 = runMcpPrompt(
      `Show me the next page of documents using cursor ${cursor} with limit 2`,
    );
    const { toolName: toolName2, toolResult: toolResult2 } = parseToolUse(output2);

    // Then the MCP tool "mcp_list_documents" should be used
    expect(toolName2).toBe('mcp_list_documents');

    // And the response should contain the next page of documents
    const docs2 = toolResult2.documents;
    expect(Array.isArray(docs2)).toBe(true);
    expect(docs2.length).toBeGreaterThan(0);

    // And no document from the first page should appear in the second page
    const ids1 = new Set(docs1.map((d) => d.id));
    const overlap = docs2.filter((d) => ids1.has(d.id));
    expect(overlap.length).toBe(0);
  });

  test('MCP-09: List documents with invalid cursor @mcp', async () => {
    // When I prompt Claude Code "Continue listing documents from cursor invalid-cursor-value" with legaldoc mcp
    const output = runMcpPrompt('Continue listing documents from cursor invalid-cursor-value');
    const { toolName, toolError } = parseToolUse(output);

    // Then the MCP tool "mcp_list_documents" should be used
    expect(toolName).toBe('mcp_list_documents');

    // And the tool should raise an error indicating an invalid cursor
    expect(toolError).toBe(true);
  });

  test('MCP-10: Update document status from Draft to Done @mcp', async () => {
    // When I prompt Claude Code "Find a document with status Draft" with legaldoc mcp
    const output1 = runMcpPrompt('Find a document with status Draft');
    const { toolName: toolName1, toolResult: toolResult1 } = parseToolUse(output1);

    // Then the MCP tool "mcp_list_documents" should be used
    expect(toolName1).toBe('mcp_list_documents');

    // Find a document with status Draft
    const documents = toolResult1.documents;
    expect(Array.isArray(documents)).toBe(true);
    const draftDoc = documents.find((d) => d.status === 'Draft');
    expect(draftDoc).toBeDefined();
    const id = draftDoc.id;

    // When I prompt Claude Code "This document '{id}' looks good, mark it as Done" with legaldoc mcp
    const output2 = runMcpPrompt(`This document '${id}' looks good, mark it as Done`);
    const { toolName: toolName2, toolResult: toolResult2 } = parseToolUse(output2);

    // Then the MCP tool "mcp_update_document_status" should be used
    expect(toolName2).toBe('mcp_update_document_status');

    // And the response should contain the updated document with status "Done"
    expect(toolResult2.status).toBe('Done');
    expect(toolResult2.id).toBe(id);

    // When I prompt Claude Code "Actually, move document '{id}' back to Draft, it needs more work" with legaldoc mcp
    const output3 = runMcpPrompt(
      `Actually, move document '${id}' back to Draft, it needs more work`,
    );
    const { toolName: toolName3, toolResult: toolResult3 } = parseToolUse(output3);

    // Then the MCP tool "mcp_update_document_status" should be used
    expect(toolName3).toBe('mcp_update_document_status');

    // And the response should contain the updated document with status "Draft"
    expect(toolResult3.status).toBe('Draft');
    expect(toolResult3.id).toBe(id);
  });

  test('MCP-11: Update status with non-existent document ID @mcp', async () => {
    // When I prompt Claude Code "Mark document 000000000000000000000000 as Done" with legaldoc mcp
    const output = runMcpPrompt('Mark document 000000000000000000000000 as Done');
    const { toolName, toolResult } = parseToolUse(output);

    // Then the MCP tool "mcp_update_document_status" should be used
    expect(toolName).toBe('mcp_update_document_status');

    // And the tool should raise an error indicating the document was not found
    expect(toolResult.error).toBeDefined();
    expect(toolResult.error.toLowerCase()).toContain('not found');
  });

  test('MCP-12: Update status with invalid document ID format @mcp', async () => {
    // When I prompt Claude Code "Update the status of document not-a-valid-id to Done" with legaldoc mcp
    const output = runMcpPrompt('Update the status of document not-a-valid-id to Done');
    const { toolName, toolResult, toolError } = parseToolUse(output);

    // Then the MCP tool "mcp_update_document_status" should be used
    expect(toolName).toBe('mcp_update_document_status');

    // And the tool should raise an error indicating an invalid document ID
    expect(toolError).toBe(true);
    expect(typeof toolResult === 'string' ? toolResult.toLowerCase() : '').toContain(
      'invalid document id',
    );
  });

  test('MCP-13: Generate a document from references and context @timeout-600s @mcp', async () => {
    test.setTimeout(600000);

    // When I prompt Claude Code "Find a reference document with title 'NDA Template'" with legaldoc mcp
    const output1 = runMcpPrompt("Find a reference document with title 'NDA Template'");
    const { toolName: toolName1, toolResult: toolResult1 } = parseToolUse(output1);

    // Then the MCP tool "mcp_list_references" should be used
    expect(toolName1).toBe('mcp_list_references');

    // Extract the NDA Template reference ID
    const references = toolResult1.result;
    const ndaRef = references.find((r) => r.title === 'NDA Template');
    expect(ndaRef).toBeDefined();
    const refId = ndaRef.id;

    // When I prompt Claude Code "Draft a data sharing agreement between TechCorp and DataFlow Inc for a 12-month term covering shared API data, based on reference '{id}'" with legaldoc mcp
    const output2 = runMcpPrompt(
      `Draft a data sharing agreement between TechCorp and DataFlow Inc for a 12-month term covering shared API data, based on reference '${refId}'`,
    );
    const { toolName: toolName2, toolResult: toolResult2 } = parseToolUse(output2);

    // Then the MCP tool "mcp_generate_document" should be used
    expect(toolName2).toBe('mcp_generate_document');

    // Then the response should contain a "documentId" string
    expect(toolResult2).toHaveProperty('documentId');
    expect(typeof toolResult2.documentId).toBe('string');
    expect(toolResult2.documentId.length).toBeGreaterThan(0);

    // And the generated document should exist in the system with status "Draft"
    const output3 = runMcpPrompt(
      `List all documents and find the one with id ${toolResult2.documentId}`,
    );
    const { toolResult: toolResult3 } = parseToolUse(output3);
    const documents = toolResult3.documents;
    const generatedDoc = documents.find((d) => d.id === toolResult2.documentId);
    expect(generatedDoc).toBeDefined();
    expect(generatedDoc.status).toBe('Draft');
  });

  test('MCP-14: Generate document with non-existent reference IDs @timeout-600s @mcp', async () => {
    test.setTimeout(600000);

    // When I prompt Claude Code "Generate a contract using reference 000000000000000000000000 for a basic consulting deal" with legaldoc mcp
    const output = runMcpPrompt(
      'Generate a contract using reference 000000000000000000000000 for a basic consulting deal',
    );
    const { toolName, toolError } = parseToolUse(output);

    // Then the MCP tool "mcp_generate_document" should be used
    expect(toolName).toBe('mcp_generate_document');

    // And the tool should raise an error indicating no valid references were found
    expect(toolError).toBe(true);
  });

  test('MCP-15: Generate document with empty reference IDs @timeout-600s @mcp', async () => {
    test.setTimeout(600000);

    // When I prompt Claude Code "Create a legal document about a consulting arrangement without using any references" with legaldoc mcp
    const output = runMcpPrompt(
      'Create a legal document about a consulting arrangement without using any references',
    );
    const { toolName, toolError } = parseToolUse(output);

    // Then the MCP tool "mcp_generate_document" should be used
    expect(toolName).toBe('mcp_generate_document');

    // And the tool should raise an error indicating no valid references were found
    expect(toolError).toBe(true);
  });

  test('MCP-16: Query assistant returns answer and sources @timeout-600s @mcp', async () => {
    test.setTimeout(600000);

    // When I prompt Claude Code "Using legal document assistant, what are the prohibited use of shared API data between TechCorp and DataFlow Inc?" with legaldoc mcp
    const output = runMcpPrompt(
      'Using legal document assistant, what are the prohibited use of shared API data between TechCorp and DataFlow Inc?',
    );
    const { toolName, toolResult } = parseToolUse(output);

    // Then the MCP tool "mcp_query_assistant" should be used
    expect(toolName).toBe('mcp_query_assistant');

    // And the response should contain an "answer" string that is not empty
    expect(toolResult).toHaveProperty('answer');
    expect(typeof toolResult.answer).toBe('string');
    expect(toolResult.answer.length).toBeGreaterThan(0);

    // And the response should contain a "sources" list
    expect(toolResult).toHaveProperty('sources');
    expect(Array.isArray(toolResult.sources)).toBe(true);

    // And each source should contain "documentId", "title", "snippet"
    const requiredKeys = ['documentId', 'title', 'snippet'];
    for (const source of toolResult.sources) {
      for (const key of requiredKeys) {
        expect(source).toHaveProperty(key);
      }
    }
  });

  test('MCP-17: Query assistant with no relevant results @mcp', async () => {
    // When I prompt Claude Code "Using legal document assistant, what is the weather in Tokyo?" with legaldoc mcp
    const output = runMcpPrompt(
      'Using legal document assistant, what is the weather in Tokyo?',
    );
    const { toolName } = parseToolUse(output);

    // Then the MCP tool "mcp_query_assistant" should not be used
    expect(toolName).not.toBe('mcp_query_assistant');
  });

  test('MCP-18: MCP server lists all five registered tools @mcp', async () => {
    // When the MCP client sends a "tools/list" request
    // Step 1: Initialize MCP session to obtain session ID
    const initRes = execSync(
      'curl -s -i -X POST http://localhost:8000/mcp ' +
        '-H "Content-Type: application/json" ' +
        '-H "Accept: application/json, text/event-stream" ' +
        '-d \'{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}\'',
      { encoding: 'utf-8' },
    );
    const sessionId = initRes.match(/mcp-session-id:\s*(\S+)/i)?.[1];
    expect(sessionId).toBeDefined();

    // Step 2: Send tools/list request with session ID
    const toolsRes = execSync(
      'curl -s -X POST http://localhost:8000/mcp ' +
        '-H "Content-Type: application/json" ' +
        '-H "Accept: application/json, text/event-stream" ' +
        `-H "Mcp-Session-Id: ${sessionId}" ` +
        '-d \'{"jsonrpc":"2.0","id":2,"method":"tools/list"}\'',
      { encoding: 'utf-8' },
    );

    // Parse the SSE response to extract JSON payload
    const dataLine = toolsRes
      .split('\n')
      .find((line) => line.startsWith('data: '));
    expect(dataLine).toBeDefined();
    const payload = JSON.parse(dataLine.replace('data: ', ''));
    const tools = payload.result.tools;

    // Then the response should contain exactly 5 tools
    expect(tools).toHaveLength(5);

    // And the tool names should be "mcp_list_references", "mcp_list_documents", "mcp_update_document_status", "mcp_query_assistant", "mcp_generate_document"
    const toolNames = tools.map((t) => t.name).sort();
    const expectedNames = [
      'mcp_generate_document',
      'mcp_list_documents',
      'mcp_list_references',
      'mcp_query_assistant',
      'mcp_update_document_status',
    ];
    expect(toolNames).toEqual(expectedNames);
  });
});
