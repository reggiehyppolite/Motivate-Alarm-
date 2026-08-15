#!/usr/bin/env node
/**
 * Rebuild the coach's playbook from an Obsidian vault.
 *
 * The checked-in `src/coach/playbook.ts` was transcribed from the six shared
 * Mark Sing docs. If your vault is the real source of truth, point this at
 * the folder and it emits the same typed shape from your markdown notes.
 *
 *   node scripts/import-vault.mjs ~/Obsidian/SecondBrain/Dating > src/coach/playbook.generated.ts
 *
 * Frontmatter it reads (all optional):
 *
 *   ---
 *   stage: opener          # top-of-funnel|profile|opener|texting|intrigue|close|revive|ending
 *   tags: [opener, bio]    # or a comma-separated string
 *   source: FIRST MESSAGES TEMPLATES
 *   caution: Rotate it — everyone uses this one.
 *   ---
 *
 * Without frontmatter it still works: the stage is guessed from keywords, the
 * tags come from the note's own #hashtags plus its title words, and the source
 * is the filename. Review the output before wiring it in — a generated file is
 * a starting point, not a merge.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, extname, join } from 'node:path'

const STAGES = ['top-of-funnel', 'profile', 'opener', 'texting', 'intrigue', 'close', 'revive', 'ending']

/** Keyword → stage, checked in order. First hit wins. */
const STAGE_HINTS = [
  ['revive', ['fell off', 'ghost', 'went quiet', 'stopped replying', 'revive', 'no response']],
  ['ending', ['break it off', 'end it', 'breakup', 'break up', 'part ways']],
  ['close', ['hang out', 'hangout', 'ask her out', 'asking for the', 'the date', 'get her number']],
  ['intrigue', ['intrigue', 'chase', 'curiosity', 'attraction', 'build interest']],
  ['opener', ['opener', 'first message', 'first text', 'open with']],
  ['profile', ['bio', 'profile', 'prompt']],
  ['top-of-funnel', ['top of funnel', 'where to meet', 'funnel', 'venue', 'meet women']],
  ['texting', ['texting', 'text her', 'cheat sheet', 'pacing', 'reply']],
]

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (extname(full).toLowerCase() === '.md') out.push(full)
  }
  return out
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!match) return { meta: {}, body: raw }
  const meta = {}
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/)
    if (!kv) continue
    let value = kv[2].trim()
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
    } else {
      value = value.replace(/^["']|["']$/g, '')
    }
    meta[kv[1].toLowerCase()] = value
  }
  return { meta, body: raw.slice(match[0].length) }
}

function guessStage(title, body) {
  const hay = `${title}\n${body}`.toLowerCase()
  for (const [stage, hints] of STAGE_HINTS) {
    if (hints.some((h) => hay.includes(h))) return stage
  }
  return 'texting'
}

const STOP = new Set(['the', 'and', 'for', 'with', 'when', 'what', 'your', 'from', 'that', 'this', 'template', 'notes'])

function deriveTags(title, body, meta) {
  const fromMeta = Array.isArray(meta.tags)
    ? meta.tags
    : typeof meta.tags === 'string'
      ? meta.tags.split(',').map((s) => s.trim())
      : []
  const hashtags = [...body.matchAll(/(?:^|\s)#([a-z0-9][\w-]*)/gi)].map((m) => m[1].replace(/[-_]/g, ' '))
  const fromTitle = title.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !STOP.has(w))
  const all = [...fromMeta, ...hashtags, ...fromTitle].map((t) => String(t).toLowerCase().trim()).filter(Boolean)
  return [...new Set(all)]
}

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)
}

const ts = (s) => JSON.stringify(String(s))

const root = process.argv[2]
if (!root) {
  console.error('usage: node scripts/import-vault.mjs <vault-folder>')
  process.exit(1)
}

const files = walk(root)
if (files.length === 0) {
  console.error(`No .md files found under ${root}`)
  process.exit(1)
}

const plays = []
const sources = new Map()
const seen = new Set()

for (const file of files) {
  const raw = readFileSync(file, 'utf8')
  const { meta, body } = parseFrontmatter(raw)
  const text = body.trim()
  if (!text) continue

  const title = meta.title || basename(file, '.md')
  const stage = STAGES.includes(meta.stage) ? meta.stage : guessStage(title, text)
  const sourceTitle = meta.source || basename(file, '.md')

  let sourceKey = slug(sourceTitle).replace(/-/g, '_') || 'vault'
  if (!sources.has(sourceKey)) sources.set(sourceKey, sourceTitle)

  let id = slug(title) || `play-${plays.length}`
  while (seen.has(id)) id = `${id}-2`
  seen.add(id)

  plays.push({
    id,
    title,
    stage,
    source: sourceKey,
    tags: deriveTags(title, text, meta),
    body: text,
    caution: meta.caution || undefined,
  })
}

const out = `// Generated by scripts/import-vault.mjs — do not edit by hand.
// Source vault: ${root}
// ${plays.length} plays from ${sources.size} notes, ${new Date().toISOString().slice(0, 10)}.
//
// Review this, then replace SOURCES and PLAYS in src/coach/playbook.ts.
// PRINCIPLES and EXCLUDED_FROM_SOURCE are hand-maintained and are not generated.

import type { Play } from './playbook'

export const SOURCES = {
${[...sources].map(([k, v]) => `  ${k}: ${ts(v)},`).join('\n')}
} as const

export const PLAYS: Play[] = [
${plays
  .map(
    (p) => `  {
    id: ${ts(p.id)},
    title: ${ts(p.title)},
    stage: ${ts(p.stage)},
    source: ${ts(p.source)} as never,
    tags: [${p.tags.map(ts).join(', ')}],
    body: ${ts(p.body)},${p.caution ? `\n    caution: ${ts(p.caution)},` : ''}
  },`,
  )
  .join('\n')}
]
`

process.stdout.write(out)
console.error(`✓ ${plays.length} plays from ${files.length} notes under ${root}`)
