import { ContentItemSchema, type ContentItem } from '@shared/content';
import { isDiagramId } from '@shared/diagrams';
import { TAXONOMY_BY_ID } from '@shared/taxonomy';

import { ARENA_SEED } from './arena';
import { ARENA_DEEP } from './arena-deep';
import { ARENA_EXPANSION } from './arena-expansion';
import { DRILL_EXPANSION } from './drill-expansion';
import { DRILL_FIELD } from './drill-field';
import { DRILL_GCP_CORE } from './drill-gcp-core';
import { DRILL_AI_DEPTH } from './drill-ai-depth';
import { DRILL_SECID } from './drill-secid';
import { DRILL_AWS } from './drill-aws';
import { DRILL_RUNTIME } from './drill-runtime';
import { DECOMPOSE_SEED } from './decompose';
import { FLAW_SEED } from './flaw';
import { DRILL_SEED } from './drill';
import { DRILL_AI_ENG } from './drill-ai-eng';
import { DRILL_AI_PLATFORM } from './drill-ai-platform';
import { DRILL_CLIENT_IDENTITY } from './drill-client-identity';
import { DRILL_DATA_SEC } from './drill-data-sec';
import { DRILL_DELIVERY } from './drill-delivery';
import { DRILL_FOUNDATIONS } from './drill-foundations';
import { DRILL_SCALE_PROD } from './drill-scale-prod';
import { ROOM_SEED } from './room';

export const SEED_ITEMS: ContentItem[] = [
  ...DRILL_SEED,
  ...DRILL_FOUNDATIONS,
  ...DRILL_AI_PLATFORM,
  ...DRILL_AI_ENG,
  ...DRILL_CLIENT_IDENTITY,
  ...DRILL_SCALE_PROD,
  ...DRILL_DATA_SEC,
  ...DRILL_DELIVERY,
  ...DRILL_EXPANSION,
  ...DRILL_GCP_CORE,
  ...DRILL_FIELD,
  ...DRILL_RUNTIME,
  ...DRILL_AI_DEPTH,
  ...DRILL_SECID,
  ...DRILL_AWS,
  ...ARENA_SEED,
  ...ARENA_EXPANSION,
  ...ARENA_DEEP,
  ...DECOMPOSE_SEED,
  ...ROOM_SEED,
  ...FLAW_SEED,
];

export interface SeedProblem {
  itemId: string;
  problem: string;
}

/**
 * Validate the seed bank against the same contract the generator must satisfy.
 *
 * The seed bank is the golden set: if hand-authored content cannot pass this,
 * the publish gate for generated content is not a meaningful bar. Run in dev on
 * startup and in the test suite.
 */
export function validateSeed(items: ContentItem[] = SEED_ITEMS): SeedProblem[] {
  const problems: SeedProblem[] = [];
  const seenIds = new Set<string>();

  for (const item of items) {
    if (seenIds.has(item.id)) {
      problems.push({ itemId: item.id, problem: 'duplicate id' });
    }
    seenIds.add(item.id);

    const parsed = ContentItemSchema.safeParse(item);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        problems.push({
          itemId: item.id,
          problem: `${issue.path.join('.') || '(root)'}: ${issue.message}`,
        });
      }
      continue;
    }

    for (const nodeId of item.nodeIds) {
      if (!TAXONOMY_BY_ID[nodeId]) {
        problems.push({ itemId: item.id, problem: `unknown taxonomy node "${nodeId}"` });
      } else if (TAXONOMY_BY_ID[nodeId].status !== 'live') {
        problems.push({ itemId: item.id, problem: `cites locked node "${nodeId}"` });
      }
    }

    if (item.citations.length === 0) {
      problems.push({ itemId: item.id, problem: 'no citation, ungrounded content cannot publish' });
    }

    if (item.diagramId && !isDiagramId(item.diagramId)) {
      problems.push({ itemId: item.id, problem: `unknown diagram "${item.diagramId}"` });
    }

    // Mode-specific invariants the schema cannot express.
    if (item.mode === 'flaw') {
      const p = item.payload;
      if (p.flawIndex < 0 || p.flawIndex >= p.lines.length) {
        problems.push({ itemId: item.id, problem: 'flawIndex is outside lines' });
      }
    }

    if (item.mode === 'drill') {
      const p = item.payload;
      if (p.kind === 'mcq') {
        if (!p.choices.some((choice) => choice.id === p.correctId)) {
          problems.push({ itemId: item.id, problem: 'correctId does not match any choice' });
        }
        const missing = p.choices.filter((c) => c.id !== p.correctId && !c.whyWrong);
        if (missing.length > 0) {
          problems.push({
            itemId: item.id,
            problem: `distractor(s) without whyWrong: ${missing.map((c) => c.id).join(', ')}`,
          });
        }
      }
      if (p.kind === 'multi') {
        const ids = new Set(p.choices.map((c) => c.id));
        for (const correct of p.correctIds) {
          if (!ids.has(correct)) {
            problems.push({ itemId: item.id, problem: `correctId "${correct}" not in choices` });
          }
        }
        if (p.correctIds.length >= p.choices.length) {
          problems.push({ itemId: item.id, problem: 'every choice is correct' });
        }
      }
    }
  }

  return problems;
}
