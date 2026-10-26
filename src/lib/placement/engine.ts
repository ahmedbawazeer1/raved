/**
 * Adaptive-lite placement (PRD 8.3, unit tested). Questions come in blocks of four
 * (one per skill when possible) at one level. After each block the level steps up
 * (3+ correct), down (1 or less) or stays. Starts at A2; at most 8 blocks (~20 minutes).
 */
export const LEVELS = ["A1", "A2", "B1", "B2"] as const;
export type Level = (typeof LEVELS)[number];

export const SKILLS = ["vocab", "grammar", "reading", "listening"] as const;
export type Skill = (typeof SKILLS)[number];

export const BLOCK_SIZE = 4;
export const MAX_BLOCKS = 8;
export const MAX_QUESTIONS = BLOCK_SIZE * MAX_BLOCKS;
export const START_LEVEL: Level = "A2";
/** Expected length shown to the student (PRD: about 20 minutes). */
export const EXPECTED_MINUTES = 20;

export interface BankQuestion {
  id: string;
  level: Level;
  skill: Skill;
  position: number;
}

export interface AnswerRecord {
  questionId: string;
  level: Level;
  skill: Skill;
  block: number;
  /** null = «لا أعرف» */
  given: number | null;
  correct: boolean;
}

export interface PlacementState {
  level: Level;
  block: number;
  answers: AnswerRecord[];
  currentQuestionId: string | null;
  finished: boolean;
}

const levelIndex = (l: Level) => LEVELS.indexOf(l);

/** Picks the next unused question at the state's level, preferring a skill not yet seen in this block. */
export function pickNext(state: Pick<PlacementState, "level" | "block" | "answers">, bank: BankQuestion[]): BankQuestion | null {
  const used = new Set(state.answers.map((a) => a.questionId));
  const inBlock = new Set(state.answers.filter((a) => a.block === state.block).map((a) => a.skill));
  const candidates = bank
    .filter((q) => q.level === state.level && !used.has(q.id))
    .sort((a, b) => a.position - b.position);
  return candidates.find((q) => !inBlock.has(q.skill)) ?? candidates[0] ?? null;
}

export function initialState(bank: BankQuestion[]): PlacementState {
  const base = { level: START_LEVEL, block: 0, answers: [] as AnswerRecord[] };
  const first = pickNext(base, bank);
  return { ...base, currentQuestionId: first?.id ?? null, finished: !first };
}

/**
 * Records the answer to the current question and moves on. `correctAnswer` comes from the
 * server-side bank, never from the browser. Answers to any other question are ignored
 * (a repeated submit after a dropped connection).
 */
export function applyAnswer(
  state: PlacementState,
  bank: BankQuestion[],
  questionId: string,
  given: number | null,
  correctAnswer: number,
): PlacementState {
  if (state.finished || state.currentQuestionId !== questionId) return state;
  const question = bank.find((q) => q.id === questionId);
  if (!question) return state;

  const answers = [
    ...state.answers,
    { questionId, level: question.level, skill: question.skill, block: state.block, given, correct: given !== null && given === correctAnswer },
  ];

  let { level, block } = state;
  const blockAnswers = answers.filter((a) => a.block === block);
  if (blockAnswers.length >= BLOCK_SIZE) {
    const correct = blockAnswers.filter((a) => a.correct).length;
    const i = levelIndex(level);
    if (correct >= 3 && i < LEVELS.length - 1) level = LEVELS[i + 1];
    else if (correct <= 1 && i > 0) level = LEVELS[i - 1];
    block += 1;
  }

  if (block >= MAX_BLOCKS) return { level, block, answers, currentQuestionId: null, finished: true };
  const next = pickNext({ level, block, answers }, bank);
  return { level, block, answers, currentQuestionId: next?.id ?? null, finished: !next };
}

export interface PlacementResult {
  overall: Level;
  skills: Record<Skill, Level>;
  /** 0–100, for the skill bars. */
  skillPercent: Record<Skill, number>;
  answered: number;
  correct: number;
}

function accuracy(records: AnswerRecord[]): number {
  return records.length ? records.filter((r) => r.correct).length / records.length : 0;
}

/**
 * Overall = highest level answered at least 3 times with 60%+ correct.
 * Per skill = highest level where that skill was at least half correct.
 * A student who can't pass A1 yet starts at A1 (from the first unit).
 */
export function computeResult(answers: AnswerRecord[]): PlacementResult {
  let overall: Level = "A1";
  for (const level of LEVELS) {
    const at = answers.filter((a) => a.level === level);
    if (at.length >= 3 && accuracy(at) >= 0.6) overall = level;
  }

  const skills = {} as Record<Skill, Level>;
  const skillPercent = {} as Record<Skill, number>;
  for (const skill of SKILLS) {
    let best = -1;
    let bestAcc = 0;
    for (const level of LEVELS) {
      const at = answers.filter((a) => a.skill === skill && a.level === level);
      if (at.length && accuracy(at) >= 0.5) {
        best = levelIndex(level);
        bestAcc = accuracy(at);
      }
    }
    skills[skill] = best < 0 ? "A1" : LEVELS[best];
    // A quarter of the bar per level, scaled by how well the top level went.
    skillPercent[skill] = best < 0 ? 10 : Math.round(((best + bestAcc) / LEVELS.length) * 100);
  }

  return { overall, skills, skillPercent, answered: answers.length, correct: answers.filter((a) => a.correct).length };
}

/** Months to reach B2 from the start of `level`, from the levels' hours and the daily goal. */
export function monthsToB2(level: Level, levelHours: Partial<Record<Level, number>>, dailyMinutes: number): number | null {
  const hours = LEVELS.slice(levelIndex(level)).reduce((sum, l) => sum + (levelHours[l] ?? 0), 0);
  if (!hours || dailyMinutes <= 0) return null;
  return Math.max(1, Math.ceil((hours * 60) / dailyMinutes / 30));
}

export const LEVEL_SUMMARY_AR: Record<Level, string> = {
  A1: "تبدأ من الأساس: التحية، والتعريف بنفسك، والكلمات اليومية الأولى.",
  A2: "تفهم الجمل اليومية البسيطة وتصف أشياء مألوفة.",
  B1: "تتعامل مع معظم المواقف اليومية وتعبّر عن رأيك بجمل مترابطة.",
  B2: "تفهم نصوصاً ومحادثات أطول وتناقش بثقة. أنت قريب من الجاهزية للامتحان.",
};

export const SKILL_LABELS_AR: Record<Skill, string> = {
  reading: "القراءة",
  listening: "الاستماع",
  grammar: "القواعد",
  vocab: "المفردات",
};

/** Retake allowed every 3 months (PRD PLC-04). */
export const RETAKE_DAYS = 90;

export function canRetake(lastCompletedAt: Date | null, now: Date): boolean {
  return !lastCompletedAt || now.getTime() - lastCompletedAt.getTime() >= RETAKE_DAYS * 86_400_000;
}
