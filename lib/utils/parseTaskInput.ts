import { parseJapaneseDate } from './parseJapaneseDate'

export interface ParsedTaskInput {
  title: string
  section: string | null
  date: string | null
  time: string | null
  dateDisplay: string
}

// Ordered most-specific first to avoid partial overlaps
const DATETIME_PATTERNS: RegExp[] = [
  /午前\d{1,2}時(?:\d{1,2}分)?/,
  /午後\d{1,2}時(?:\d{1,2}分)?/,
  /明後日|あさって/,
  /明日|あした/,
  /今日|本日/,
  /昨日/,
  /来週末/,
  /今週末/,
  /再来週/,
  /来週/,
  /来月/,
  /[日月火水木金土]曜日?/,
  /\d{1,2}月\d{1,2}日/,
  /\d{1,2}\/\d{1,2}/,
  /\d{1,2}日(?![間後前])/,
  /\d{1,2}時(?:\d{1,2}分)?(?![間後前])/,
  /\d{1,2}:\d{2}/,
]

export function parseTaskInput(input: string): ParsedTaskInput {
  let text = input
  let section: string | null = null

  // Extract #section (e.g. #仕事)
  const sectionMatch = text.match(/#(\S+)/)
  if (sectionMatch && sectionMatch.index !== undefined) {
    section = sectionMatch[1]
    text = text.slice(0, sectionMatch.index) + text.slice(sectionMatch.index + sectionMatch[0].length)
  }

  // Extract date/time tokens in order, replacing each with a null placeholder
  const tokens: string[] = []
  let working = text

  for (const re of DATETIME_PATTERNS) {
    const m = working.match(re)
    if (m && m.index !== undefined) {
      tokens.push(m[0])
      working = working.slice(0, m.index) + '\x00' + working.slice(m.index + m[0].length)
    }
  }

  // Remaining text = title
  const remaining = working.replace(/\x00/g, ' ').replace(/\s+/g, ' ').trim()

  // Parse combined date/time string
  const dateTimeStr = tokens.join(' ')
  const parsed = dateTimeStr ? parseJapaneseDate(dateTimeStr) : { date: null, time: null, display: '' }

  return {
    title: remaining,
    section,
    date: parsed.date,
    time: parsed.time,
    dateDisplay: parsed.display,
  }
}
