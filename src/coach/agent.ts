import Anthropic from '@anthropic-ai/sdk'
import type { AiModelId } from '../logic/aiParser'
import { retrievePlays, type ScoredPlay } from './retrieval'
import { buildSystemPrompt } from './prompt'
import type { Stage } from './playbook'

/**
 * The coach agent. Same posture as the rest of this app: the call goes
 * straight from the browser to Anthropic with the user's own key, there is
 * no backend, and nothing about his dating life is stored anywhere but this
 * tab unless he chooses to keep it.
 */

export interface CoachMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface CoachTurnOptions {
  apiKey: string
  model: AiModelId
  stage?: Stage
  /** Full conversation so far, oldest first, ending with the new user turn. */
  messages: CoachMessage[]
  onDelta?: (chunk: string) => void
  signal?: AbortSignal
}

export interface CoachTurnResult {
  text: string
  /** The plays that were fed to the model — shown in the UI as "worked from". */
  plays: ScoredPlay[]
}

/**
 * Retrieval runs against the recent user turns rather than only the latest
 * one, so "she still hasn't replied" three messages in still pulls the
 * revival play instead of matching nothing.
 */
export function retrievalTextFor(messages: CoachMessage[]): string {
  return messages
    .filter((m) => m.role === 'user')
    .slice(-3)
    .map((m) => m.content)
    .join('\n')
}

export async function runCoachTurn(opts: CoachTurnOptions): Promise<CoachTurnResult> {
  const plays = retrievePlays(retrievalTextFor(opts.messages), opts.stage)
  const system = buildSystemPrompt({
    stage: opts.stage,
    situation: retrievalTextFor(opts.messages),
    plays,
  })

  const client = new Anthropic({ apiKey: opts.apiKey, dangerouslyAllowBrowser: true })
  const stream = await client.messages.create(
    {
      model: opts.model,
      max_tokens: 1200,
      system,
      messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
    },
    { signal: opts.signal },
  )

  let text = ''
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      text += event.delta.text
      opts.onDelta?.(event.delta.text)
    }
  }

  if (!text.trim()) {
    throw new Error('The coach returned an empty reply. Try again.')
  }
  return { text, plays }
}
