/**
 * Claude provider — the default LlmProvider implementation.
 *
 * Uses the official Anthropic SDK: streaming (bundles can be large),
 * adaptive thinking, and a structured-output JSON schema so the response
 * parses without prompt-format drift. Swapping providers (e.g. GitHub
 * Models / any OpenAI-compatible endpoint) means implementing LlmProvider
 * with that vendor's SDK — prompt, validator, and server are untouched.
 */

import Anthropic from '@anthropic-ai/sdk';

import {
  BUNDLE_RESPONSE_SCHEMA,
  SYSTEM_PROMPT,
  repairPrompt,
  userPrompt,
} from '../prompt.js';
import type {
  BoardExtract,
  GeneratedBundle,
  LlmProvider,
  ValidationIssue,
} from '../types.js';

const MODEL = process.env.MURAL_IMPORT_MODEL ?? 'claude-opus-4-8';

export class AnthropicProvider implements LlmProvider {
  readonly name = `anthropic:${MODEL}`;
  private readonly client = new Anthropic();

  private async complete(
    messages: Anthropic.MessageParam[],
  ): Promise<GeneratedBundle> {
    const stream = this.client.messages.stream({
      model: MODEL,
      max_tokens: 64000,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT,
      output_config: {
        format: {
          type: 'json_schema',
          schema: BUNDLE_RESPONSE_SCHEMA as unknown as Record<string, unknown>,
        },
      },
      messages,
    });
    const message = await stream.finalMessage();
    if (message.stop_reason === 'refusal') {
      throw new Error('The model declined this request.');
    }
    const text = message.content
      .filter(
        (block): block is Anthropic.TextBlock => block.type === 'text',
      )
      .map((block) => block.text)
      .join('');
    return JSON.parse(text) as GeneratedBundle;
  }

  async generateBundle(extract: BoardExtract): Promise<GeneratedBundle> {
    return await this.complete([{ role: 'user', content: userPrompt(extract) }]);
  }

  async repairBundle(
    previous: GeneratedBundle,
    issues: ValidationIssue[],
  ): Promise<GeneratedBundle> {
    return await this.complete([
      { role: 'user', content: 'Convert the board to a bundle (context below).' },
      { role: 'assistant', content: JSON.stringify(previous) },
      { role: 'user', content: repairPrompt(issues) },
    ]);
  }
}
