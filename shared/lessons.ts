/**
 * Lessons: the theory side of the ladder.
 *
 * Deliberately short: about 200 words, ninety seconds. A lesson is not a
 * textbook chapter, it is the smallest complete explanation of one idea, what
 * it is, the decision it drives in the field, and the thing people get wrong.
 *
 * The four-block shape is doing real work. Prose of this length blurs into a
 * paragraph nobody finishes; labeled blocks let you skim to `gotcha` when you
 * half-know the topic already, which is the common case for someone revising
 * before a customer call.
 */

import type { Citation } from './content';

export interface Lesson {
  id: string;
  /** Taxonomy nodes this lesson teaches. Drives "learn this before drilling it". */
  nodeIds: string[];
  title: string;
  /** One line for the list view. Says what the topic is, not that it is important. */
  hook: string;
  /** What it is and why it exists. Two or three sentences. */
  essence: string;
  /** The decision this drives when you are in the room. */
  inPractice: string;
  /** The misconception, in one or two sentences. This is the payload. */
  gotcha: string;
  /** Three short takeaways, each independently useful out of context. */
  keyPoints: string[];
  diagramId?: string;
  citations: Citation[];
}

export const LESSON_BLOCKS = ['essence', 'inPractice', 'gotcha'] as const;
export type LessonBlock = (typeof LESSON_BLOCKS)[number];

export const LESSON_BLOCK_META: Record<LessonBlock, { label: string; blurb: string }> = {
  essence: { label: 'What it is', blurb: 'The idea itself' },
  inPractice: { label: 'In the field', blurb: 'The decision it drives' },
  gotcha: { label: 'The catch', blurb: 'What people get wrong' },
};

/** Rough read time. Used for the list badge and the session estimate. */
export function readSeconds(lesson: Lesson): number {
  const words = [lesson.essence, lesson.inPractice, lesson.gotcha, ...lesson.keyPoints]
    .join(' ')
    .split(/\s+/).length;
  // 200 wpm is a comfortable technical-reading pace; round to a 15s boundary so
  // the badge reads as an estimate rather than a false precision.
  return Math.max(45, Math.round((words / 200) * 60 / 15) * 15);
}

export interface LessonProblem {
  lessonId: string;
  problem: string;
}

/** Same publish bar the questions face. Run by the content gate. */
export function validateLessons(
  lessons: Lesson[],
  isLiveNode: (id: string) => boolean,
  isDiagram: (id: string) => boolean
): LessonProblem[] {
  const problems: LessonProblem[] = [];
  const seen = new Set<string>();

  for (const lesson of lessons) {
    if (seen.has(lesson.id)) problems.push({ lessonId: lesson.id, problem: 'duplicate id' });
    seen.add(lesson.id);

    if (lesson.nodeIds.length === 0) {
      problems.push({ lessonId: lesson.id, problem: 'cites no taxonomy node' });
    }
    for (const nodeId of lesson.nodeIds) {
      if (!isLiveNode(nodeId)) {
        problems.push({ lessonId: lesson.id, problem: `unknown or locked node "${nodeId}"` });
      }
    }
    if (lesson.citations.length === 0) {
      problems.push({ lessonId: lesson.id, problem: 'no citation' });
    }
    if (lesson.diagramId && !isDiagram(lesson.diagramId)) {
      problems.push({ lessonId: lesson.id, problem: `unknown diagram "${lesson.diagramId}"` });
    }
    if (lesson.keyPoints.length < 2 || lesson.keyPoints.length > 4) {
      problems.push({ lessonId: lesson.id, problem: 'needs 2 to 4 key points' });
    }
    // A lesson that has grown past ~320 words is no longer a ninety-second read
    // and belongs split in two.
    const words = [lesson.essence, lesson.inPractice, lesson.gotcha].join(' ').split(/\s+/).length;
    if (words > 320) {
      problems.push({ lessonId: lesson.id, problem: `too long (${words} words; cap is 320)` });
    }
    if (words < 70) {
      problems.push({ lessonId: lesson.id, problem: `too thin (${words} words)` });
    }
  }

  return problems;
}
