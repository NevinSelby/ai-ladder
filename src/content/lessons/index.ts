import { isDiagramId } from '@shared/diagrams';
import { validateLessons, type Lesson } from '@shared/lessons';
import { TAXONOMY_BY_ID } from '@shared/taxonomy';

import { LESSONS_AI_CRAFT } from './ai-craft';
import { LESSONS_DELIVERY } from './delivery';
import { LESSONS_PLATFORM } from './platform';

export const LESSONS: Lesson[] = [
  ...LESSONS_PLATFORM,
  ...LESSONS_AI_CRAFT,
  ...LESSONS_DELIVERY,
];

export const LESSONS_BY_ID: Record<string, Lesson> = Object.fromEntries(
  LESSONS.map((lesson) => [lesson.id, lesson])
);

/** Lessons that teach a given node, for the "learn this first" hint on a miss. */
export function lessonsForNode(nodeId: string): Lesson[] {
  return LESSONS.filter((lesson) => lesson.nodeIds.includes(nodeId));
}

/** Every node any lesson covers: drives the coverage report. */
export const LESSON_COVERED_NODES = new Set(LESSONS.flatMap((lesson) => lesson.nodeIds));

export function checkLessons() {
  return validateLessons(
    LESSONS,
    (id) => TAXONOMY_BY_ID[id]?.status === 'live',
    isDiagramId
  );
}
