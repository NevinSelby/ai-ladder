import { DIAGRAM_IDS } from '../../../shared/diagrams.ts';
import { LIVE_NODES } from '../../../shared/taxonomy.ts';
import { MODELS, admin, callClaude, json, runCostSoFar } from '../_shared/claude.ts';

/**
 * Triage → generate → critique → publish.
 *
 * The shape that matters is the separation between the author and the critic:
 * they are different calls with different prompts, and the critic is told to
 * look for reasons to reject. An author asked to check its own work grades
 * generously, which is how a pipeline ends up confidently teaching something
 * that was never in the source.
 *
 * Nothing publishes without a citation. That single rule is what keeps a
 * plausible-sounding hallucination out of a question bank someone is studying
 * from at 7am.
 */

const CRITIC_THRESHOLD = 78;
const MAX_SPEND_PER_RUN_USD = 4;

// ── Schemas the model must satisfy ─────────────────────────────────────────

const TRIAGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    teachable: {
      type: 'boolean',
      description:
        'True only if this document contains a durable, testable engineering fact. A capability, a constraint, a rename, a default. Marketing announcements with no technical substance are false.',
    },
    nodeIds: {
      type: 'array',
      items: { type: 'string', enum: LIVE_NODES.map((node) => node.id) },
      description: 'Taxonomy nodes this document teaches. Empty if not teachable.',
    },
    supersedes: {
      type: 'string',
      description:
        'If this document renames, deprecates or replaces something, name the old thing exactly as it would appear in existing content. Empty string otherwise.',
    },
    reason: { type: 'string' },
  },
  required: ['teachable', 'nodeIds', 'supersedes', 'reason'],
} as const;

const ITEM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    stem: {
      type: 'string',
      description:
        'A situation a forward deployed engineer is actually in. A customer said something, a system is failing, a review is happening. Never a definition lookup.',
    },
    choices: {
      type: 'array',
      minItems: 4,
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string', enum: ['a', 'b', 'c', 'd'] },
          text: { type: 'string' },
          whyWrong: {
            type: 'string',
            description:
              'For the correct choice, the empty string. For every distractor, why a competent person might pick it and why it is still wrong. A distractor nobody would choose teaches nothing.',
          },
        },
        required: ['id', 'text', 'whyWrong'],
      },
    },
    correctId: { type: 'string', enum: ['a', 'b', 'c', 'd'] },
    explanation: {
      type: 'string',
      description:
        'Teach the distinction, do not restate the answer. Two to four sentences.',
    },
    difficulty: { type: 'string', enum: ['intro', 'core', 'deep', 'edge'] },
    diagramId: {
      type: 'string',
      enum: ['', ...DIAGRAM_IDS],
      description: 'An existing diagram that genuinely illustrates this, or the empty string.',
    },
    groundedClaim: {
      type: 'string',
      description: 'The exact sentence from the source that makes the correct answer correct.',
    },
  },
  required: [
    'stem',
    'choices',
    'correctId',
    'explanation',
    'difficulty',
    'diagramId',
    'groundedClaim',
  ],
} as const;

const CRITIC_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    score: { type: 'number', minimum: 0, maximum: 100 },
    grounded: {
      type: 'boolean',
      description: 'Is every factual claim traceable to the supplied source text?',
    },
    singleDefensibleAnswer: { type: 'boolean' },
    distractorsPlausible: { type: 'boolean' },
    difficultyHonest: { type: 'boolean' },
    problems: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'score',
    'grounded',
    'singleDefensibleAnswer',
    'distractorsPlausible',
    'difficultyHonest',
    'problems',
  ],
} as const;

// ── Prompts ────────────────────────────────────────────────────────────────

const TRIAGE_SYSTEM = `You triage source documents for a study app aimed at forward deployed engineers, solutions architects and AI engineers working on Google Cloud.

Teachable means: a durable fact someone could be asked about in a customer conversation six months from now. Capability changes, renames, new constraints, changed defaults, deprecations.

Not teachable: pure marketing, event announcements, customer logos, pricing promotions, anything with no technical claim.`;

const AUTHOR_SYSTEM = `You write multiple-choice questions for a study app used by forward deployed engineers, solutions architects and AI engineers.

House rules, all mandatory:
- The stem describes a situation the reader is in. "A customer's security lead asks..." not "What is X?"
- Exactly one choice is defensible. The other three are things a competent person might genuinely pick.
- Every distractor carries a reason it is wrong. An option nobody would choose teaches nothing.
- The explanation teaches the distinction being tested. It does not restate the answer.
- Every factual claim must come from the supplied source text. If the source does not support a claim, do not make it.
- British spelling. No emoji. No exclamation marks.

You are writing for someone studying for an hour. Respect their time: no padding, no throat-clearing.`;

const CRITIC_SYSTEM = `You are reviewing a draft question for a study app, and your job is to find reasons to reject it.

Be adversarial. A question that reaches a learner and teaches them something false is far more expensive than a question that gets rejected and rewritten.

Check, in order:
1. Groundedness. Is every factual claim traceable to the supplied source text? A claim that is probably true but absent from the source fails this.
2. Single defensible answer. Could a well-informed practitioner argue for a different choice?
3. Distractor quality. Is each wrong option something a competent person might pick, with an honest reason it is wrong?
4. Difficulty honesty. Does the label match the actual demand?

Score out of 100. Anything below 78 will be held for human review, so score honestly rather than charitably.`;

// ── Pipeline ───────────────────────────────────────────────────────────────

interface TriageResult {
  teachable: boolean;
  nodeIds: string[];
  supersedes: string;
  reason: string;
}

interface DraftItem {
  stem: string;
  choices: { id: string; text: string; whyWrong: string }[];
  correctId: string;
  explanation: string;
  difficulty: string;
  diagramId: string;
  groundedClaim: string;
}

interface CriticResult {
  score: number;
  grounded: boolean;
  singleDefensibleAnswer: boolean;
  distractorsPlausible: boolean;
  difficultyHonest: boolean;
  problems: string[];
}

Deno.serve(async (request) => {
  const db = admin();
  const runStart = new Date().toISOString();
  const limit = Number(new URL(request.url).searchParams.get('limit') ?? '8');

  // Untriaged documents, newest first, recency is what freshness means here.
  const { data: documents, error } = await db
    .from('source_documents')
    .select('id, title, url, body, source_key, published_at')
    .is('superseded_by', null)
    .not('id', 'in', `(select unnest(source_ids) from content_items)`)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) return json({ ok: false, error: error.message }, 500);

  const results: unknown[] = [];

  for (const doc of documents ?? []) {
    if ((await runCostSoFar(db, runStart)) > MAX_SPEND_PER_RUN_USD) {
      results.push({ id: doc.id, outcome: 'skipped: run budget reached' });
      break;
    }

    // 1, Triage on the cheap model. Most documents stop here.
    const triage = await callClaude<TriageResult>(db, {
      model: MODELS.triage,
      purpose: 'triage',
      effort: 'low',
      maxTokens: 2_000,
      cacheSystem: true,
      system: TRIAGE_SYSTEM,
      schema: TRIAGE_SCHEMA,
      prompt: `TITLE: ${doc.title}\nURL: ${doc.url}\n\n${doc.body.slice(0, 8_000)}`,
    });

    if (!triage.data.teachable || triage.data.nodeIds.length === 0) {
      results.push({ id: doc.id, outcome: 'not teachable', reason: triage.data.reason });
      continue;
    }

    // A rename or deprecation is recorded even when no item is generated, the
    // staleness sweep reads these to quarantine content taught under the old name.
    if (triage.data.supersedes) {
      await db.from('review_queue').insert({
        item_id: null,
        reason: 'supersession',
        critic_notes: { supersedes: triage.data.supersedes, sourceId: doc.id, url: doc.url },
      });
    }

    // 2, Author on the capable model.
    const draft = await callClaude<DraftItem>(db, {
      model: MODELS.author,
      purpose: 'generate',
      effort: 'high',
      cacheSystem: true,
      system: AUTHOR_SYSTEM,
      schema: ITEM_SCHEMA,
      prompt: [
        `Concepts this must test: ${triage.data.nodeIds.join(', ')}`,
        '',
        'SOURCE: every factual claim must come from this text:',
        `TITLE: ${doc.title}`,
        `URL: ${doc.url}`,
        '',
        doc.body.slice(0, 10_000),
      ].join('\n'),
    });

    // 3, Critique in a separate call with a separate prompt.
    const critique = await callClaude<CriticResult>(db, {
      model: MODELS.author,
      purpose: 'critic',
      effort: 'high',
      maxTokens: 4_000,
      cacheSystem: true,
      system: CRITIC_SYSTEM,
      schema: CRITIC_SCHEMA,
      prompt: [
        'SOURCE TEXT:',
        doc.body.slice(0, 10_000),
        '',
        'DRAFT QUESTION:',
        JSON.stringify(draft.data, null, 2),
      ].join('\n'),
    });

    // 4, Publish gate. Grounding is not scored, it is required.
    const passes =
      critique.data.score >= CRITIC_THRESHOLD &&
      critique.data.grounded &&
      critique.data.singleDefensibleAnswer &&
      critique.data.distractorsPlausible;

    const itemId = `gen.${doc.id.slice(0, 8)}.${Date.now().toString(36)}`;

    const { error: insertError } = await db.from('content_items').insert({
      id: itemId,
      mode: 'drill',
      node_ids: triage.data.nodeIds,
      difficulty: draft.data.difficulty,
      explanation: draft.data.explanation,
      citations: [{ title: doc.title, url: doc.url }],
      payload: {
        kind: 'mcq',
        stem: draft.data.stem,
        choices: draft.data.choices.map((choice) => ({
          id: choice.id,
          text: choice.text,
          ...(choice.id === draft.data.correctId ? {} : { whyWrong: choice.whyWrong }),
        })),
        correctId: draft.data.correctId,
      },
      status: passes ? 'published' : 'review',
      origin: `generated:${runStart}`,
      critic_score: critique.data.score,
      source_ids: [doc.id],
      verified_at: new Date().toISOString().slice(0, 10),
      ...(draft.data.diagramId ? { diagram_id: draft.data.diagramId } : {}),
    });

    if (insertError) {
      results.push({ id: doc.id, outcome: 'insert failed', error: insertError.message });
      continue;
    }

    if (!passes) {
      await db.from('review_queue').insert({
        item_id: itemId,
        reason: `critic ${critique.data.score}`,
        critic_notes: critique.data,
      });
    }

    results.push({
      id: doc.id,
      outcome: passes ? 'published' : 'held for review',
      itemId,
      score: critique.data.score,
      problems: critique.data.problems,
    });
  }

  return json({
    ok: true,
    considered: documents?.length ?? 0,
    spendUsd: Number((await runCostSoFar(db, runStart)).toFixed(4)),
    results,
  });
});
