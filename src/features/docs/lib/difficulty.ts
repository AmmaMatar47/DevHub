export type Difficulty = 1 | 2 | 3

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  1: 'Beginner',
  2: 'Intermediate',
  3: 'Advanced',
}

const NOT_SET_LABEL = 'Not set'

function isDifficulty(value: number | null): value is Difficulty {
  return value === 1 || value === 2 || value === 3
}

/** doc_nodes.difficulty is presentation-only labeling -- the column stays a
 * plain smallint, this is the one place the 1/2/3 -> word mapping lives. */
export function difficultyLabel(difficulty: number | null): string {
  return isDifficulty(difficulty) ? DIFFICULTY_LABEL[difficulty] : NOT_SET_LABEL
}
