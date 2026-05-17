export interface ParsedDateTime {
  date: string | null  // YYYY-MM-DD
  time: string | null  // HH:mm
  display: string      // 認識結果の表示文字列
}

const WEEKDAY_MAP: Record<string, number> = {
  日: 0, 月: 1, 火: 2, 水: 3, 木: 4, 金: 5, 土: 6,
}

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + n)
  return d
}

function nextWeekday(base: Date, target: number): Date {
  const d = new Date(base)
  const diff = ((target - d.getDay() + 7) % 7) || 7
  d.setDate(d.getDate() + diff)
  return d
}

function formatDisplay(dateStr: string, timeStr: string | null): string {
  const d = new Date(dateStr + 'T00:00:00')
  const formatted = d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
  return timeStr ? `${formatted} ${timeStr}` : formatted
}

export function parseJapaneseDate(input: string): ParsedDateTime {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  let text = input.trim()

  if (!text) return { date: null, time: null, display: '' }

  // ── 時刻のパース ──────────────────────────────────────────
  let timeStr: string | null = null

  // 午前/午後N時[M分]
  const ampmRe = /午(前|後)(\d{1,2})時(?:(\d{1,2})分)?/
  const ampmMatch = text.match(ampmRe)
  if (ampmMatch) {
    let h = parseInt(ampmMatch[2])
    const min = ampmMatch[3] ? parseInt(ampmMatch[3]) : 0
    if (ampmMatch[1] === '後' && h !== 12) h += 12
    if (ampmMatch[1] === '前' && h === 12) h = 0
    timeStr = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
    text = text.replace(ampmMatch[0], '').trim()
  }

  // N時[M分] (午前/午後なし)
  if (!timeStr) {
    const timeRe = /(\d{1,2})時(?:(\d{1,2})分)?/
    const tm = text.match(timeRe)
    if (tm) {
      const h = parseInt(tm[1])
      const min = tm[2] ? parseInt(tm[2]) : 0
      if (h >= 0 && h <= 23) {
        timeStr = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
        text = text.replace(tm[0], '').trim()
      }
    }
  }

  // HH:MM 形式
  if (!timeStr) {
    const colonRe = /\b(\d{1,2}):(\d{2})\b/
    const cm = text.match(colonRe)
    if (cm) {
      const h = parseInt(cm[1])
      const min = parseInt(cm[2])
      if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
        timeStr = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
        text = text.replace(cm[0], '').trim()
      }
    }
  }

  // ── 日付のパース ──────────────────────────────────────────
  let date: Date | null = null

  if (/今日|本日/.test(text)) {
    date = new Date(now)
  } else if (/明日|あした/.test(text)) {
    date = addDays(now, 1)
  } else if (/明後日|あさって/.test(text)) {
    date = addDays(now, 2)
  } else if (/昨日/.test(text)) {
    date = addDays(now, -1)
  } else if (/来週末/.test(text)) {
    const sat = nextWeekday(now, 6)
    date = addDays(sat, 7)
  } else if (/今週末/.test(text)) {
    date = nextWeekday(now, 6)
  } else if (/再来週/.test(text)) {
    date = addDays(now, 14)
  } else if (/来週/.test(text)) {
    date = addDays(now, 7)
  } else if (/来月/.test(text)) {
    const d = new Date(now)
    d.setMonth(d.getMonth() + 1, 1)
    date = d
  } else {
    // 曜日: 月曜日, 火曜, etc.
    const wdMatch = text.match(/([日月火水木金土])曜/)
    if (wdMatch) {
      const target = WEEKDAY_MAP[wdMatch[1]]
      date = nextWeekday(now, target)
    } else {
      // M/D
      const mdSlash = text.match(/(\d{1,2})\/(\d{1,2})/)
      // N月M日
      const mdKanji = text.match(/(?:(\d{1,2})月)?(\d{1,2})日/)

      if (mdSlash) {
        const m = parseInt(mdSlash[1]) - 1
        const d = parseInt(mdSlash[2])
        const candidate = new Date(now.getFullYear(), m, d)
        if (candidate < now) candidate.setFullYear(candidate.getFullYear() + 1)
        date = candidate
      } else if (mdKanji) {
        const dayNum = parseInt(mdKanji[2])
        if (mdKanji[1]) {
          const m = parseInt(mdKanji[1]) - 1
          const candidate = new Date(now.getFullYear(), m, dayNum)
          if (candidate < now) candidate.setFullYear(candidate.getFullYear() + 1)
          date = candidate
        } else {
          const candidate = new Date(now.getFullYear(), now.getMonth(), dayNum)
          if (candidate < now) candidate.setMonth(candidate.getMonth() + 1)
          date = candidate
        }
      }
    }
  }

  const dateStr = date ? toDateStr(date) : null
  const display = dateStr ? formatDisplay(dateStr, timeStr) : ''

  return { date: dateStr, time: timeStr, display }
}
