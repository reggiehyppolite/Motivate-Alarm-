import { PLAYS, type Play, type Stage } from './playbook'

/**
 * Deterministic retrieval over the playbook.
 *
 * The model is not trusted to remember the material — it is handed the
 * handful of plays that actually match the situation, chosen here by plain
 * keyword scoring. Deterministic means testable, and testable means the
 * coach's advice stays anchored to the source docs instead of drifting into
 * generic internet dating advice.
 */

/**
 * A stage boost must never outweigh a real content match, or the tab he
 * happens to be on drowns out what he actually described.
 */
export const STAGE_WEIGHT = 4
export const TAG_WEIGHT = 5
export const TITLE_WEIGHT = 1

/** Words too common to be worth matching on. */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'to', 'of', 'in', 'on', 'at', 'for', 'with',
  'is', 'it', 'i', 'my', 'me', 'she', 'her', 'you', 'your', 'we', 'what', 'how', 'do',
  'did', 'be', 'been', 'am', 'was', 'that', 'this', 'so', 'not', 'up', 'out', 'about',
])

export function normalize(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `
}

/** Whole-phrase containment against normalized text, so "date" never matches "candidate". */
function contains(haystack: string, phrase: string): boolean {
  const needle = normalize(phrase).trim()
  return needle.length > 0 && haystack.includes(` ${needle} `)
}

export interface ScoredPlay {
  play: Play
  score: number
  /** Points from the situation text alone, ignoring the stage boost. */
  contentScore: number
  /** Which tags fired — surfaced in the UI so the retrieval is inspectable. */
  matched: string[]
}

export function scorePlay(play: Play, situation: string, stage?: Stage): ScoredPlay {
  const text = normalize(situation)
  const matched: string[] = []
  let contentScore = 0

  for (const tag of play.tags) {
    if (contains(text, tag)) {
      contentScore += TAG_WEIGHT
      matched.push(tag)
    }
  }

  for (const word of play.title.toLowerCase().split(/[^a-z0-9]+/)) {
    if (word.length > 3 && !STOP_WORDS.has(word) && contains(text, word)) {
      contentScore += TITLE_WEIGHT
    }
  }

  const stageBonus = stage && play.stage === stage ? STAGE_WEIGHT : 0
  return { play, score: contentScore + stageBonus, contentScore, matched }
}

/**
 * Top plays for a situation.
 *
 * A play has to earn its place on the situation text — the stage only
 * re-ranks what already matched. That way the tab he is sitting on breaks
 * ties without hiding the play he actually needs: describing a dead thread
 * from the "first message" tab still surfaces the revival play.
 *
 * When nothing matches at all (an opening "hey" with no detail), fall back
 * to the stage's own plays so the coach always has source material rather
 * than improvising technique from nowhere.
 */
export function retrievePlays(
  situation: string,
  stage?: Stage,
  limit = 4,
): ScoredPlay[] {
  const scored = PLAYS.map((p) => scorePlay(p, situation, stage))
    .filter((s) => s.contentScore > 0)
    .sort((a, b) => b.score - a.score || a.play.id.localeCompare(b.play.id))

  if (scored.length === 0 && stage) {
    return PLAYS.filter((p) => p.stage === stage)
      .slice(0, limit)
      .map((play) => ({ play, score: 0, contentScore: 0, matched: [] }))
  }

  return scored.slice(0, limit)
}
