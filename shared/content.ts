/**
 * The content contract.
 *
 * One zod schema per game mode, shared by three consumers that must never drift:
 *   1. the Expo app, which renders and scores items,
 *   2. the generator edge function, which asks Claude for structured output
 *      against these exact shapes,
 *   3. the critic edge function, which refuses to publish anything that fails
 *      `ContentItemSchema.safeParse`.
 *
 * Because the generator emits JSON Schema derived from these definitions, every
 * field description here is effectively prompt text. Write them for Claude as
 * well as for the next human.
 */

import { z } from 'zod';

export const MODES = [
  'drill',
  'arena',
  'napkin',
  'decompose',
  'room',
  'incident',
  'blueprint',
  'evallab',
  'discovery',
] as const;
export type Mode = (typeof MODES)[number];

export const MODE_META: Record<
  Mode,
  { label: string; tagline: string; minutes: number; phase: 0 | 1 }
> = {
  drill: { label: 'Daily Drill', tagline: 'Five quick calls to keep the fundamentals sharp.', minutes: 3, phase: 0 },
  decompose: { label: 'Decompose', tagline: 'A vague customer brief. Break it down before you solve it.', minutes: 10, phase: 0 },
  room: { label: 'The Room', tagline: 'Live conversation with a stakeholder who has an agenda.', minutes: 8, phase: 0 },
  arena: { label: 'Trade-off Arena', tagline: 'Sixty seconds per call. Pick one, defend it in a sentence.', minutes: 5, phase: 0 },
  napkin: { label: 'Napkin Math', tagline: 'Estimate the bill before the customer asks.', minutes: 3, phase: 1 },
  incident: { label: 'Incident', tagline: 'Production is broken and the customer is watching.', minutes: 5, phase: 1 },
  blueprint: { label: 'Blueprint', tagline: 'Design under real compliance constraints.', minutes: 10, phase: 1 },
  evallab: { label: 'Eval Lab', tagline: 'Prove the AI feature works. Design the harness.', minutes: 8, phase: 1 },
  discovery: { label: 'Discovery Budget', tagline: 'Thirty minutes of meeting. Spend your questions well.', minutes: 5, phase: 1 },
};

export const DIFFICULTIES = ['intro', 'core', 'deep', 'edge'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** Where a claim came from. Ungrounded items never reach the publish gate. */
export const CitationSchema = z.object({
  title: z.string().min(3),
  url: z.string().url(),
  /** Optional pointer at the specific claim, e.g. a release-note date or heading. */
  locator: z.string().optional(),
});
export type Citation = z.infer<typeof CitationSchema>;

// ── Drill ──────────────────────────────────────────────────────────────────

const ChoiceSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  /**
   * Why this option is wrong. Shown after answering. A distractor without a
   * reason is a distractor the author could not justify, the critic rejects it.
   */
  whyWrong: z.string().optional(),
});

export const DrillMcqSchema = z.object({
  kind: z.literal('mcq'),
  stem: z.string().min(10),
  choices: z.array(ChoiceSchema).min(3).max(5),
  correctId: z.string(),
});

export const DrillMultiSchema = z.object({
  kind: z.literal('multi'),
  stem: z.string().min(10),
  choices: z.array(ChoiceSchema).min(4).max(6),
  correctIds: z.array(z.string()).min(2),
});

export const DrillMatchSchema = z.object({
  kind: z.literal('match'),
  stem: z.string().min(10),
  /** Left column stays fixed; the player assigns a right-hand value to each. */
  pairs: z.array(z.object({ left: z.string(), right: z.string() })).min(3).max(5),
});

export const DrillOrderSchema = z.object({
  kind: z.literal('order'),
  stem: z.string().min(10),
  /** Correct sequence, top first. Presented shuffled. */
  steps: z.array(z.string()).min(3).max(6),
});

export const DrillPayloadSchema = z.discriminatedUnion('kind', [
  DrillMcqSchema,
  DrillMultiSchema,
  DrillMatchSchema,
  DrillOrderSchema,
]);
export type DrillPayload = z.infer<typeof DrillPayloadSchema>;

// ── Trade-off Arena ────────────────────────────────────────────────────────

export const ArenaPayloadSchema = z.object({
  /** The constraint that makes the choice non-obvious. Two sentences maximum. */
  situation: z.string().min(20),
  optionA: z.string().min(2),
  optionB: z.string().min(2),
  /**
   * The defensible answer given the stated constraint, or 'either' when the
   * point of the item is that the justification carries all the signal.
   */
  defensible: z.enum(['A', 'B', 'either']),
  /** Reasoning beats that a good one-line justification should hit. */
  keyPoints: z.array(z.string()).min(2).max(5),
  /** The practitioner's take, revealed after the player commits. */
  fieldTake: z.string().min(40),
});

// ── Napkin Math ────────────────────────────────────────────────────────────

export const NapkinPayloadSchema = z.object({
  prompt: z.string().min(20),
  unit: z.string().min(1),
  answer: z.number(),
  /** Fraction, not percent. 0.25 accepts anything within ±25%. */
  tolerance: z.number().min(0.05).max(0.9).default(0.25),
  /** Each line of the estimate, so a wrong answer teaches the method. */
  workings: z.array(z.string()).min(2),
  /**
   * SKU ids whose live price this item depends on. When a refresh changes any of
   * them, the staleness sweep recomputes `answer` or quarantines the item.
   */
  pricingRefs: z.array(z.string()).optional(),
});

// ── Decompose ──────────────────────────────────────────────────────────────

/**
 * Slot order is the methodology, and the app enforces it. `clarify` comes first
 * precisely so that a player who writes a solution there can be marked down for
 * it. That is the failure the real decomposition round screens for.
 */
export const DECOMPOSE_SLOTS = [
  'clarify',
  'success_metric',
  'stakeholders',
  'data_inventory',
  'subproblems',
  'thin_slice',
  'failure_modes',
] as const;
export type DecomposeSlot = (typeof DECOMPOSE_SLOTS)[number];

export const DECOMPOSE_SLOT_META: Record<
  DecomposeSlot,
  { label: string; prompt: string; hint: string; minEntries: number }
> = {
  clarify: {
    label: 'Clarifying questions',
    prompt: 'What do you need to know before you can scope this at all?',
    hint: 'Questions only. Proposing a solution here is the classic rejection.',
    minEntries: 3,
  },
  success_metric: {
    label: 'Success metric',
    prompt: 'How will the customer know, in numbers, that this worked?',
    hint: 'One measurable statement with a baseline and a target.',
    minEntries: 1,
  },
  stakeholders: {
    label: 'Stakeholders & data owners',
    prompt: 'Who decides, who blocks, and who owns each system you need?',
    hint: 'Name the role and what they control.',
    minEntries: 3,
  },
  data_inventory: {
    label: 'Data inventory & gaps',
    prompt: 'What data exists, in what shape, and what is missing?',
    hint: 'Include the data you suspect does not exist yet.',
    minEntries: 3,
  },
  subproblems: {
    label: 'Subproblems, sequenced by risk',
    prompt: 'Break the work down and order it so the riskiest unknown goes first.',
    hint: 'Sequence by what could kill the project, not by what is easy.',
    minEntries: 3,
  },
  thin_slice: {
    label: 'Thin slice',
    prompt: 'What is the narrowest end-to-end thing you ship in week two?',
    hint: 'It must touch every layer and prove the risky part.',
    minEntries: 1,
  },
  failure_modes: {
    label: 'Failure modes',
    prompt: 'What are the three most likely ways this goes wrong?',
    hint: 'Include the organizational ones, not only the technical ones.',
    minEntries: 3,
  },
};

export const DecomposePayloadSchema = z.object({
  /** The customer's own words. Deliberately vague and slightly contradictory. */
  brief: z.string().min(80),
  customer: z.string().min(2),
  /** Constraints the player is told up front, e.g. "90 days", "no PHI egress". */
  givens: z.array(z.string()).default([]),
  /**
   * Facts the interviewer reveals only if asked. Each maps to a clarifying
   * question the player was supposed to think of. This is how the grader
   * rewards good discovery concretely rather than vibes.
   */
  hiddenFacts: z
    .array(z.object({ ifAsked: z.string(), reveals: z.string(), weight: z.number().min(1).max(5) }))
    .default([]),
  /** Per-slot reference answer, used as grading context and shown afterwards. */
  modelAnswer: z.record(z.enum(DECOMPOSE_SLOTS), z.array(z.string())),
});

// ── The Room ───────────────────────────────────────────────────────────────

export const ROOM_TEMPERS = ['friendly', 'frustrated', 'non_technical', 'skeptical'] as const;
export type RoomTemper = (typeof ROOM_TEMPERS)[number];

export const RoomPayloadSchema = z.object({
  /** Shown to the player before the conversation starts. */
  setup: z.string().min(40),
  /** Your objective for the conversation. */
  objective: z.string().min(20),
  persona: z.object({
    name: z.string(),
    role: z.string(),
    company: z.string(),
    temper: z.enum(ROOM_TEMPERS),
    /** Never shown to the player. Drives the persona's behavior. */
    hiddenAgenda: z.string().min(20),
    /** Concrete things this person will say or push for. */
    openingLine: z.string().min(10),
  }),
  /**
   * The overpromise trap. Every Room scenario plants one, a moment where the
   * easy answer is a commitment you cannot keep. Scored explicitly.
   */
  trap: z.object({ setup: z.string().min(10), badResponse: z.string().min(10) }),
  /** Facts the player may legitimately rely on. Keeps the persona honest. */
  groundTruth: z.array(z.string()).min(2),
  maxTurns: z.number().int().min(4).max(14).default(8),
});

// ── Incident ───────────────────────────────────────────────────────────────

export const IncidentPayloadSchema = z.object({
  alert: z.string().min(20),
  context: z.array(z.string()).min(2),
  steps: z
    .array(
      z.object({
        id: z.string(),
        action: z.string().min(5),
        /** What you learn. Empty for a dead end. */
        finding: z.string(),
        /** Customer-patience cost. Correct diagnostics are cheap, flailing is not. */
        cost: z.number().int().min(0).max(40),
        /** True for the step that actually identifies root cause. */
        isRootCause: z.boolean().default(false),
      })
    )
    .min(5),
  resolution: z.string().min(30),
  patienceBudget: z.number().int().min(40).max(100).default(100),
});

// ── Blueprint ──────────────────────────────────────────────────────────────

export const BlueprintPayloadSchema = z.object({
  scenario: z.string().min(40),
  /** Machine-checkable requirements the player's graph must satisfy. */
  constraints: z
    .array(
      z.object({
        id: z.string(),
        statement: z.string().min(10),
        /** Rule the deterministic checker runs against the component graph. */
        rule: z.enum([
          'requires_component',
          'forbids_component',
          'requires_edge',
          'forbids_edge',
          'requires_region',
          'requires_property',
        ]),
        args: z.record(z.string(), z.string()),
      })
    )
    .min(2),
  /** Component palette ids offered for this scenario. */
  palette: z.array(z.string()).min(4),
  referenceSolution: z.array(z.string()).min(3),
});

// ── Eval Lab ───────────────────────────────────────────────────────────────

export const EvalLabPayloadSchema = z.object({
  feature: z.string().min(30),
  symptom: z.string().min(20),
  slots: z.object({
    goldenSet: z.string().min(10),
    metrics: z.string().min(10),
    judge: z.string().min(10),
    gate: z.string().min(10),
  }),
});

// ── Discovery Budget ───────────────────────────────────────────────────────

export const DiscoveryPayloadSchema = z.object({
  setup: z.string().min(40),
  /** Minutes of meeting time available. */
  budget: z.number().int().min(10).max(60).default(30),
  questions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().min(8),
        minutes: z.number().int().min(1).max(10),
        /** What asking it reveals. */
        reveals: z.string(),
        /** How much this fact matters to the architecture. 0 = polite noise. */
        value: z.number().int().min(0).max(5),
      })
    )
    .min(12),
  /** Ids of the facts you cannot design without. Missing one caps your score. */
  criticalIds: z.array(z.string()).min(1),
});

// ── The item envelope ──────────────────────────────────────────────────────

export const PAYLOAD_BY_MODE = {
  drill: DrillPayloadSchema,
  arena: ArenaPayloadSchema,
  napkin: NapkinPayloadSchema,
  decompose: DecomposePayloadSchema,
  room: RoomPayloadSchema,
  incident: IncidentPayloadSchema,
  blueprint: BlueprintPayloadSchema,
  evallab: EvalLabPayloadSchema,
  discovery: DiscoveryPayloadSchema,
} as const;

const BaseItem = z.object({
  id: z.string().min(1),
  mode: z.enum(MODES),
  /** Taxonomy node ids. At least one, and every id must exist. */
  nodeIds: z.array(z.string()).min(1),
  difficulty: z.enum(DIFFICULTIES),
  /** Shown after answering. The teaching, not the verdict. */
  explanation: z.string().min(40),
  /**
   * Optional architecture diagram rendered above the explanation.
   *
   * Must name a component registered in src/components/diagrams. A picture of a
   * perimeter or a token exchange does more work than three sentences, and these
   * are the concepts people re-derive wrongly from prose every time.
   */
  diagramId: z.string().optional(),
  citations: z.array(CitationSchema).default([]),
  /** 'seed' for hand-authored, otherwise the generator run that produced it. */
  origin: z.string().default('seed'),
  /** Set by the critic pass. Null for hand-authored seed content. */
  criticScore: z.number().min(0).max(100).nullable().default(null),
  /** ISO date the grounding was last confirmed current. */
  verifiedAt: z.string().optional(),
});

export const ContentItemSchema = z.discriminatedUnion('mode', [
  BaseItem.extend({ mode: z.literal('drill'), payload: DrillPayloadSchema }),
  BaseItem.extend({ mode: z.literal('arena'), payload: ArenaPayloadSchema }),
  BaseItem.extend({ mode: z.literal('napkin'), payload: NapkinPayloadSchema }),
  BaseItem.extend({ mode: z.literal('decompose'), payload: DecomposePayloadSchema }),
  BaseItem.extend({ mode: z.literal('room'), payload: RoomPayloadSchema }),
  BaseItem.extend({ mode: z.literal('incident'), payload: IncidentPayloadSchema }),
  BaseItem.extend({ mode: z.literal('blueprint'), payload: BlueprintPayloadSchema }),
  BaseItem.extend({ mode: z.literal('evallab'), payload: EvalLabPayloadSchema }),
  BaseItem.extend({ mode: z.literal('discovery'), payload: DiscoveryPayloadSchema }),
]);

export type ContentItem = z.infer<typeof ContentItemSchema>;
export type DrillItem = Extract<ContentItem, { mode: 'drill' }>;
export type ArenaItem = Extract<ContentItem, { mode: 'arena' }>;
export type NapkinItem = Extract<ContentItem, { mode: 'napkin' }>;
export type DecomposeItem = Extract<ContentItem, { mode: 'decompose' }>;
export type RoomItem = Extract<ContentItem, { mode: 'room' }>;
