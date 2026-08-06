import Anthropic from '@anthropic-ai/sdk';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Claude client, cost accounting and the structured-output helper.
 *
 * Every model call in this pipeline goes through `callClaude`, which writes a
 * row to `llm_calls` recording model, tokens, cost, latency and outcome. That
 * table is the app's own observability surface: it is what makes "the generator
 * cost $4 last night and 3 items failed the critic" a query rather than a guess,
 * and it is the same discipline the app teaches in the Eval Lab.
 */

export const MODELS = {
  /** Cheap gate. Decides whether a source document is worth the expensive call. */
  triage: 'claude-haiku-4-5',
  /** Authoring and critique. */
  author: 'claude-opus-5',
} as const;

/** USD per million tokens, for the cost column. Update when pricing moves. */
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5': { input: 1, output: 5 },
  'claude-opus-5': { input: 5, output: 25 },
};

export function anthropic(): Anthropic {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set in function secrets');
  return new Anthropic({ apiKey });
}

export function admin(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    // Service role: the pipeline writes content and reads source documents, both
    // of which are deliberately unreachable from any client key.
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );
}

function costUsd(model: string, input: number, output: number, cachedInput: number): number {
  const rate = PRICING[model];
  if (!rate) return 0;
  // Cache reads bill at roughly a tenth of the input rate.
  const billedInput = (input - cachedInput) * rate.input + cachedInput * rate.input * 0.1;
  return (billedInput + output * rate.output) / 1_000_000;
}

export interface ClaudeCallOptions {
  model: string;
  system: string;
  prompt: string;
  /** JSON Schema. When present the response is constrained to match it. */
  schema?: Record<string, unknown>;
  maxTokens?: number;
  /** 'low' for mechanical work, 'high' when judgment matters. */
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  purpose: string;
  /** Cache the system prompt: it is identical across every call in a run. */
  cacheSystem?: boolean;
}

export interface ClaudeResult<T> {
  data: T;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
}

/**
 * One model call, logged.
 *
 * Uses structured output rather than asking for JSON in prose: a schema at the
 * API level means a malformed payload is impossible rather than merely unlikely,
 * which is the difference between a pipeline that runs unattended and one that
 * needs a person watching it.
 */
export async function callClaude<T>(
  db: SupabaseClient,
  options: ClaudeCallOptions
): Promise<ClaudeResult<T>> {
  const client = anthropic();
  const started = Date.now();
  const maxTokens = options.maxTokens ?? 16_000;

  const system = options.cacheSystem
    ? [{ type: 'text' as const, text: options.system, cache_control: { type: 'ephemeral' as const } }]
    : options.system;

  try {
    const response = await client.messages.create({
      model: options.model,
      max_tokens: maxTokens,
      system,
      output_config: {
        effort: options.effort ?? 'high',
        ...(options.schema ? { format: { type: 'json_schema', schema: options.schema } } : {}),
      },
      messages: [{ role: 'user', content: options.prompt }],
    });

    const usage = response.usage;
    const cost = costUsd(
      options.model,
      usage.input_tokens,
      usage.output_tokens,
      usage.cache_read_input_tokens ?? 0
    );

    await db.from('llm_calls').insert({
      purpose: options.purpose,
      model: options.model,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      cached_input_tokens: usage.cache_read_input_tokens ?? 0,
      cost_usd: cost,
      latency_ms: Date.now() - started,
      ok: true,
    });

    // A refusal is a successful HTTP response with no usable content, check it
    // before reading the block, or a safety decline reads as a parse failure.
    if (response.stop_reason === 'refusal') {
      throw new Error(`Model declined: ${response.stop_details?.category ?? 'unknown'}`);
    }

    const text = response.content.find((block) => block.type === 'text');
    if (!text || text.type !== 'text') throw new Error('No text block in response');

    return {
      data: JSON.parse(text.text) as T,
      costUsd: cost,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
    };
  } catch (error) {
    await db.from('llm_calls').insert({
      purpose: options.purpose,
      model: options.model,
      latency_ms: Date.now() - started,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/** Spend ceiling for one pipeline run, so a bad night cannot become a bad month. */
export async function runCostSoFar(db: SupabaseClient, sinceIso: string): Promise<number> {
  const { data } = await db
    .from('llm_calls')
    .select('cost_usd')
    .gte('created_at', sinceIso);
  return (data ?? []).reduce((sum, row) => sum + Number(row.cost_usd ?? 0), 0);
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
