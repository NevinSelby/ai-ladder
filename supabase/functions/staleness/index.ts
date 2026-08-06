import { MODELS, admin, callClaude, json } from '../_shared/claude.ts';

/**
 * Staleness sweep.
 *
 * The feature that makes "always up to date" mean something. Two passes:
 *
 *   1. Supersession, a source document announced a rename or deprecation.
 *      Any published item whose text still uses the old name is quarantined.
 *      This is exactly the Vertex AI → Gemini Enterprise Agent Platform case.
 *
 *   2. Age, an item grounded only in a source older than the freshness window
 *      for a fast-moving branch is re-verified against its own citation.
 *
 * Quarantine means `needs_review`, not delete. Content is pulled from rotation
 * and surfaced for a human decision; silently deleting a question because a
 * heuristic fired is how a bank quietly shrinks without anyone noticing.
 */

const VERIFY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    stillAccurate: { type: 'boolean' },
    whatChanged: {
      type: 'string',
      description:
        'If the item is now wrong or uses superseded terminology, say precisely what. Empty string if it still holds.',
    },
    suggestedFix: { type: 'string' },
  },
  required: ['stillAccurate', 'whatChanged', 'suggestedFix'],
} as const;

const VERIFY_SYSTEM = `You are checking whether a study question is still accurate given newer source material.

Answer stillAccurate: false when the question teaches something that has been renamed, deprecated, changed by default, or contradicted. Answer true when the newer material simply does not touch this question, absence of mention is not evidence of change.

Be specific about what changed. "Might be outdated" is not useful to the person who has to fix it.`;

interface VerifyResult {
  stillAccurate: boolean;
  whatChanged: string;
  suggestedFix: string;
}

Deno.serve(async () => {
  const db = admin();
  const quarantined: unknown[] = [];

  // ── Pass 1: supersession ─────────────────────────────────────────────────
  const { data: supersessions } = await db
    .from('review_queue')
    .select('id, critic_notes')
    .eq('reason', 'supersession')
    .is('resolved_at', null);

  for (const entry of supersessions ?? []) {
    const notes = entry.critic_notes as { supersedes?: string; url?: string } | null;
    const term = notes?.supersedes?.trim();
    if (!term || term.length < 4) continue;

    // Published items whose visible text still uses the superseded term.
    const { data: affected } = await db
      .from('content_items')
      .select('id, explanation, payload')
      .eq('status', 'published');

    const matches = (affected ?? []).filter((item) => {
      const haystack = `${item.explanation} ${JSON.stringify(item.payload)}`.toLowerCase();
      return haystack.includes(term.toLowerCase());
    });

    for (const item of matches) {
      await db.from('content_items').update({ status: 'needs_review' }).eq('id', item.id);
      await db.from('review_queue').insert({
        item_id: item.id,
        reason: 'superseded terminology',
        critic_notes: { term, source: notes?.url },
      });
      quarantined.push({ itemId: item.id, reason: `mentions superseded "${term}"` });
    }

    await db
      .from('review_queue')
      .update({ resolved_at: new Date().toISOString(), resolution: `swept ${matches.length}` })
      .eq('id', entry.id);
  }

  // ── Pass 2: age-based re-verification ────────────────────────────────────
  // Only generated content is re-verified by model. Hand-authored seed items are
  // re-checked by their author, not by a heuristic, and re-verifying 200 stable
  // items nightly would be pure spend.
  const cutoff = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);

  const { data: aging } = await db
    .from('content_items')
    .select('id, explanation, payload, source_ids, verified_at')
    .eq('status', 'published')
    .neq('origin', 'seed')
    .lt('verified_at', cutoff)
    .limit(10);

  for (const item of aging ?? []) {
    const sourceIds = (item.source_ids ?? []) as string[];
    if (sourceIds.length === 0) continue;

    const { data: sources } = await db
      .from('source_documents')
      .select('title, url, body, published_at')
      .in('id', sourceIds);

    if (!sources || sources.length === 0) continue;

    const verdict = await callClaude<VerifyResult>(db, {
      model: MODELS.author,
      purpose: 'staleness',
      effort: 'medium',
      maxTokens: 3_000,
      cacheSystem: true,
      system: VERIFY_SYSTEM,
      schema: VERIFY_SCHEMA,
      prompt: [
        'QUESTION:',
        JSON.stringify({ explanation: item.explanation, payload: item.payload }, null, 2),
        '',
        'ORIGINAL SOURCE:',
        sources.map((source) => `${source.title}\n${source.url}\n${source.body.slice(0, 6_000)}`).join('\n\n'),
      ].join('\n'),
    });

    if (verdict.data.stillAccurate) {
      await db
        .from('content_items')
        .update({ verified_at: new Date().toISOString().slice(0, 10) })
        .eq('id', item.id);
    } else {
      await db.from('content_items').update({ status: 'needs_review' }).eq('id', item.id);
      await db.from('review_queue').insert({
        item_id: item.id,
        reason: 'failed re-verification',
        critic_notes: verdict.data,
      });
      quarantined.push({ itemId: item.id, reason: verdict.data.whatChanged });
    }
  }

  return json({ ok: true, quarantined });
});
