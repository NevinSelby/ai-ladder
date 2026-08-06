import { TAXONOMY_BY_ID } from './taxonomy';

/**
 * Community submission validation.
 *
 * Pure and dependency-free on purpose. This runs on untrusted text, so it is a
 * security boundary, and a boundary that cannot be unit tested without booting
 * a React Native runtime is a boundary nobody tests. The server enforces the
 * same rules again in SQL: this copy exists to give a person useful errors,
 * not to be the only guard.
 */

export interface SubmissionDraft {
  stem: string;
  choices: { id: string; text: string; whyWrong?: string }[];
  correctId: string;
  explanation: string;
  nodeIds: string[];
  difficulty: string;
  sourceUrl: string;
}

export interface SubmissionProblem {
  field: string;
  message: string;
}

/** Field limits. Generous for real writing, tight enough to bound abuse. */
const LIMITS = {
  stem: { min: 20, max: 400 },
  choice: { min: 2, max: 220 },
  explanation: { min: 40, max: 900 },
  url: 600,
};

const DIFFICULTIES = new Set(['intro', 'core', 'deep', 'edge']);

/**
 * Validate a draft before it is stored or sent.
 *
 * Returns every problem rather than the first, because a form that reveals one
 * error at a time is a form people abandon.
 */
export function validateSubmission(draft: SubmissionDraft): SubmissionProblem[] {
  const problems: SubmissionProblem[] = [];
  const stem = draft.stem.trim();

  if (stem.length < LIMITS.stem.min) {
    problems.push({ field: 'stem', message: `The question needs at least ${LIMITS.stem.min} characters.` });
  }
  if (stem.length > LIMITS.stem.max) {
    problems.push({ field: 'stem', message: `Keep the question under ${LIMITS.stem.max} characters.` });
  }

  const filled = draft.choices.filter((choice) => choice.text.trim().length > 0);
  if (filled.length < 3) {
    problems.push({ field: 'choices', message: 'Write at least three options.' });
  }
  for (const choice of filled) {
    if (choice.text.trim().length > LIMITS.choice.max) {
      problems.push({ field: 'choices', message: 'One of the options is too long.' });
      break;
    }
  }
  if (!filled.some((choice) => choice.id === draft.correctId)) {
    problems.push({ field: 'correctId', message: 'Mark which option is correct.' });
  }
  // Every wrong option needs a reason, the same bar the seed bank is held to.
  const missingWhy = filled.filter(
    (choice) => choice.id !== draft.correctId && (choice.whyWrong ?? '').trim().length < 10
  );
  if (missingWhy.length > 0) {
    problems.push({
      field: 'whyWrong',
      message: 'Every wrong option needs a sentence explaining why it is wrong.',
    });
  }

  const explanation = draft.explanation.trim();
  if (explanation.length < LIMITS.explanation.min) {
    problems.push({
      field: 'explanation',
      message: `The explanation needs at least ${LIMITS.explanation.min} characters.`,
    });
  }
  if (explanation.length > LIMITS.explanation.max) {
    problems.push({ field: 'explanation', message: 'The explanation is too long.' });
  }

  if (draft.nodeIds.length === 0) {
    problems.push({ field: 'nodeIds', message: 'Pick at least one topic.' });
  }
  // Node ids are chosen from a picker, but validate anyway: never trust a value
  // just because the UI that produced it was trusted.
  for (const nodeId of draft.nodeIds) {
    if (!TAXONOMY_BY_ID[nodeId] || TAXONOMY_BY_ID[nodeId].status !== 'live') {
      problems.push({ field: 'nodeIds', message: `Unknown topic "${nodeId}".` });
    }
  }

  if (!DIFFICULTIES.has(draft.difficulty)) {
    problems.push({ field: 'difficulty', message: 'Pick a difficulty.' });
  }

  const url = draft.sourceUrl.trim();
  if (url.length === 0) {
    problems.push({ field: 'sourceUrl', message: 'A source link is required; ungrounded questions are not accepted.' });
  } else if (!isSafeHttpUrl(url)) {
    problems.push({ field: 'sourceUrl', message: 'The source must be an https link to public documentation.' });
  }

  return problems;
}

/**
 * Only plain https URLs are accepted as sources.
 *
 * This rejects `javascript:` and `data:` outright rather than relying on the
 * renderer to be safe, because the link is eventually opened, and a scheme
 * check at the boundary is cheaper than trusting every consumer downstream.
 */
export function isSafeHttpUrl(value: string): boolean {
  if (value.length > LIMITS.url) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

