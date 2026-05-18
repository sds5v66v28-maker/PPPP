'use client'

import { useState, useRef, useCallback } from 'react'
import type { Event, Task } from '@/types'

interface MonthViewProps {
  currentDate: Date
  events: Event[]
  tasks: Task[]
  onDayDetail: (date: Date) => void
  onDayCreate: (date: Date) => void
  onRangeCreate: (start: Date, end: Date) => void
  onEventClick: (event: Event) => void
  onTaskClick: (task: Task) => void
}

function getDaysInMonth(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const days: Date[] = []

  const startPad = firstDay.getDay()
  for (let i = startPad - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i))
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d))
  }
  while (days.length < 42) {
    const last = days[days.length - 1]
    days.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1))
  }
  return days
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isCurrentMonth(date: Date, currentDate: Date) {
  return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear()
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

function inRange(day: Date, start: Date, end: Date) {
  const sorted = start <= end ? [start, end] : [end, start]
  return day >= sorted[0] && day <= sorted[1]
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']
const DOUBLE_TAP_MS = 300

export default function MonthView({ currentDate, events, tasks, onDayDetail, onDayCreate, onRangeCreate, onEventClick, onTaskClick }: MonthViewProps) {
  const days = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth())
  const today = new Date()

  // Drag state
  const [dragStart, setDragStart] = useState<Date | null>(null)
  const [dragEnd, setDragEnd] = useState<Date | null>(null)
  const isDragging = useRef(false)

  // Double-tap detection
  const lastTap = useRef<{ dateStr: string; time: number } | null>(null)

  const handlePointerDown = useCallback((day: Date, e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    isDragging.current = false
    setDragStart(day)
    setDragEnd(day)
  }, [])

  const handlePointerEnter = useCallback((day: Date) => {
    if (dragStart && !isSameDay(dragStart, day)) {
      isDragging.current = true
      setDragEnd(day)
    }
  }, [dragStart])

  const handlePointerUp = useCallback((day: Date, e: React.PointerEvent) => {
    e.stopPropagation()

    if (isDragging.current && dragStart && !isSameDay(dragStart, day)) {
      // Drag across multiple days → create event with range
      onRangeCreate(dragStart < day ? dragStart : day, dragStart < day ? day : dragStart)
    } else {
      // Check double tap
      const now = Date.now()
      const dateStr = toDateStr(day)
      const prev = lastTap.current
      if (prev && prev.dateStr === dateStr && now - prev.time < DOUBLE_TAP_MS) {
        lastTap.current = null
        onDayCreate(day)
      } else {
        lastTap.current = { dateStr, time: now }
        onDayDetail(day)
      }
    }

    isDragging.current = false
    setDragStart(null)
    setDragEnd(null)
  }, [dragStart, onDayDetail, onDayCreate, onRangeCreate])

  return (
    <div className="flex flex-col h-full select-none">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {WEEKDAYS.map(day => (
          <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {day}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 flex-1" style={{ gridTemplateRows: 'repeat(6, 1fr)' }}>
        {days.map((day, idx) => {
          const inMonth = isCurrentMonth(day, currentDate)
          const isToday = isSameDay(day, today)
          const dayStr = toDateStr(day)

          const isInDragRange = dragStart && dragEnd && inRange(day, dragStart, dragEnd)

          const dayEvents = events.filter(e => new Date(e.start_time).toISOString().slice(0, 10) === dayStr)
          const dayTasks = tasks.filter(t => t.due_date === dayStr)

          const MAX_CHIPS = 3
          const allItems = [
            ...dayEvents.map(e => ({ type: 'event' as const, item: e, color: e.color || '#3B82F6', title: e.title })),
            ...dayTasks.map(t => ({
              type: 'task' as const,
              item: t,
              color: t.priority === 'high' ? '#EF4444' : t.priority === 'medium' ? '#F59E0B' : '#10B981',
              title: t.title,
            })),
          ]
          const visible = allItems.slice(0, MAX_CHIPS)
          const overflow = allItems.length - MAX_CHIPS

          return (
            <div
              key={idx}
              onPointerDown={(e) => handlePointerDown(day, e)}
              onPointerEnter={() => handlePointerEnter(day)}
              onPointerUp={(e) => handlePointerUp(day, e)}
              className={`border-b border-r border-gray-100 dark:border-gray-800 min-h-[80px] p-1 cursor-pointer transition-colors ${
                isInDragRange
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : !inMonth
                  ? 'bg-gray-50/50 dark:bg-gray-900/50 hover:bg-gray-100/50 dark:hover:bg-gray-800/30'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              <div className="flex justify-end mb-1">
                <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium ${
                  isToday
                    ? 'bg-blue-600 text-white'
                    : inMonth
                    ? 'text-gray-900 dark:text-gray-100'
                    : 'text-gray-400 dark:text-gray-600'
                }`}>
                  {day.getDate()}
                </span>
              </div>

              <div className="space-y-0.5">
                {visible.map(({ type, item, color, title }, i) => (
                  <div
                    key={i}
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={(e) => {
                      e.stopPropagation()
                      if (type === 'event') onEventClick(item as Event)
                      else onTaskClick(item as Task)
                    }}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium text-white truncate cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: color }}
                  >
                    {type === 'task' && <span className="shrink-0 text-[10px] opacity-80">✓</span>}
                    <span className="truncate">{title}</span>
                  </div>
                ))}
                {overflow > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 px-1.5">他{overflow}件</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
