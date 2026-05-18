'use client'

import type { Event, Task } from '@/types'
import { XIcon, PlusIcon } from 'lucide-react'

interface DayDetailPanelProps {
  date: Date
  events: Event[]
  tasks: Task[]
  onClose: () => void
  onCreateEvent: (date: Date) => void
  onEventClick: (event: Event) => void
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

const PRIORITY_COLORS = { high: '#EF4444', medium: '#F59E0B', low: '#10B981' }

export default function DayDetailPanel({ date, events, tasks, onClose, onCreateEvent, onEventClick }: DayDetailPanelProps) {
  const dateStr = date.toISOString().slice(0, 10)
  const dayEvents = events.filter(e => new Date(e.start_time).toISOString().slice(0, 10) === dateStr)
  const dayTasks = tasks.filter(t => t.due_date === dateStr)
  const isEmpty = dayEvents.length === 0 && dayTasks.length === 0

  const label = date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'long' })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white dark:bg-gray-800 w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{label}</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onCreateEvent(date)}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              予定を追加
            </button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-3">
          {isEmpty && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
              この日の予定・タスクはありません
            </p>
          )}

          {dayEvents.map(event => (
            <button
              key={event.id}
              onClick={() => { onEventClick(event); onClose() }}
              className="w-full flex items-start gap-3 text-left p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: event.color || '#3B82F6' }} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{event.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {event.all_day ? '終日' : `${formatTime(event.start_time)} – ${formatTime(event.end_time)}`}
                </p>
              </div>
            </button>
          ))}

          {dayTasks.map(task => (
            <div
              key={task.id}
              className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30"
            >
              <div
                className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
              />
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${task.completed ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'} truncate`}>
                  {task.title}
                </p>
                {task.due_time && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{task.due_time}</p>
                )}
              </div>
              {task.completed && <span className="text-xs text-green-500 flex-shrink-0">完了</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
