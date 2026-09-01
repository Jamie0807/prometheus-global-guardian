import { Transform } from 'stream';

const toChatCompletionDelta = (delta) =>
  `data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`;

const RESPONSE_DONE_TYPES = new Set([
  'response.completed',
  'response.failed',
  'response.incomplete',
]);

export function convertResponsesSSEToChatCompletionsSSE(sseText) {
  let output = '';

  for (const line of sseText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) {
      continue;
    }

    const data = trimmed.slice(5).trim();
    if (!data || data === '[DONE]') {
      if (data === '[DONE]') {
        output += 'data: [DONE]\n\n';
      }
      continue;
    }

    try {
      const event = JSON.parse(data);
      const delta = typeof event.delta === 'string' ? event.delta : '';

      if (delta) {
        output += toChatCompletionDelta(delta);
      } else if (RESPONSE_DONE_TYPES.has(event.type)) {
        output += 'data: [DONE]\n\n';
      }
    } catch {
      // Ignore malformed provider chunks; the next chunk may still be valid SSE.
    }
  }

  return output;
}

export function extractWorkflowResult(workflowResponse) {
  const result = workflowResponse?.data?.outputs?.result;
  return typeof result === 'string' && result.trim().length > 0 ? result : '';
}

export function workflowResultToChatCompletionsSSE(result) {
  return `${toChatCompletionDelta(result)}data: [DONE]\n\n`;
}

export function convertWorkflowSSEToChatCompletionsSSE(sseText, state = {}) {
  let output = '';

  for (const line of sseText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) {
      continue;
    }

    const data = trimmed.slice(5).trim();
    if (!data) {
      continue;
    }

    if (data === '[DONE]') {
      output += 'data: [DONE]\n\n';
      continue;
    }

    try {
      const event = JSON.parse(data);
      const directDelta = typeof event.delta === 'string' ? event.delta : '';
      const directContent = typeof event.content === 'string' ? event.content : '';
      const result = extractWorkflowResult(event);

      if (directDelta) {
        output += toChatCompletionDelta(directDelta);
        continue;
      }

      if (directContent) {
        output += toChatCompletionDelta(directContent);
        continue;
      }

      if (result) {
        const previousResult = state.previousWorkflowResult ?? '';
        const delta = result.startsWith(previousResult)
          ? result.slice(previousResult.length)
          : result;
        state.previousWorkflowResult = result;

        if (delta) {
          output += toChatCompletionDelta(delta);
        }
      }
    } catch {
      // Ignore malformed provider chunks; the next chunk may still be valid SSE.
    }
  }

  return output;
}

export function createWorkflowToChatCompletionsStream() {
  let buffer = '';
  const state = {};

  return new Transform({
    transform(chunk, _encoding, callback) {
      buffer += chunk.toString('utf8');
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        this.push(convertWorkflowSSEToChatCompletionsSSE(`${part}\n\n`, state));
      }

      callback();
    },
    flush(callback) {
      if (buffer.trim()) {
        this.push(convertWorkflowSSEToChatCompletionsSSE(buffer, state));
      }
      callback();
    },
  });
}

export function createResponsesToChatCompletionsStream() {
  let buffer = '';

  return new Transform({
    transform(chunk, _encoding, callback) {
      buffer += chunk.toString('utf8');
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        this.push(convertResponsesSSEToChatCompletionsSSE(`${part}\n\n`));
      }

      callback();
    },
    flush(callback) {
      if (buffer.trim()) {
        this.push(convertResponsesSSEToChatCompletionsSSE(buffer));
      }
      callback();
    },
  });
}
