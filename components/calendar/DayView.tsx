'use client'

import type { Event, Task } from '@/types'

interface DayViewProps {
  currentDate: Date
  events: Event[]
  tasks: Task[]
  onEventClick: (event: Event) => void
  onTaskClick: (task: Task) => void
  onSlotClick: (date: Date, hour: number) => void
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

function formatHour(h: number) {
  if (h === 0) return '12 AM'
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export default function DayView({ currentDate, events, tasks, onEventClick, onSlotClick }: DayViewProps) {
  const today = new Date()
  const isToday = isSameDay(currentDate, today)
  const dayStr = currentDate.toISOString().slice(0, 10)

  const dayEvents = events.filter(e => {
    const start = new Date(e.start_time)
    return isSameDay(start, currentDate) && !e.all_day
  })

  const allDayEvents = events.filter(e => {
    const start = new Date(e.start_time)
    return isSameDay(start, currentDate) && e.all_day
  })

  const dayTasks = tasks.filter(t => t.due_date === dayStr)

  const weekday = currentDate.toLocaleDateString('en-US', { weekday: 'long' })
  const dateStr = currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
              isToday ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
            }`}
          >
            {currentDate.getDate()}
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">{weekday}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{dateStr}</div>
          </div>
        </div>

        {/* All-day events and tasks */}
        {(allDayEvents.length > 0 || dayTasks.length > 0) && (
          <div className="mt-2 space-y-1">
            {allDayEvents.map(event => (
              <div
                key={event.id}
                onClick={() => onEventClick(event)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-sm cursor-pointer hover:opacity-80"
                style={{ backgroundColor: event.color || '#3B82F6' }}
              >
                <span className="font-medium">{event.title}</span>
                <span className="text-xs opacity-80">All day</span>
              </div>
            ))}
            {dayTasks.map(task => (
              <div
                key={task.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-sm cursor-pointer hover:opacity-80"
                style={{ backgroundColor: task.priority === 'high' ? '#EF4444' : task.priority === 'medium' ? '#F59E0B' : '#10B981' }}
              >
                <span>✓</span>
                <span className="font-medium">{task.title}</span>
                <span className="text-xs opacity-80 capitalize">{task.priority} priority</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="flex flex-1 overflow-y-auto">
        {/* Hour labels */}
        <div className="w-20 flex-shrink-0 border-r border-gray-200 dark:border-gray-700">
          {HOURS.map(h => (
            <div key={h} className="h-16 flex items-start justify-end pr-3 pt-0.5">
              <span className="text-xs text-gray-400 dark:text-gray-500">{formatHour(h)}</span>
            </div>
          ))}
        </div>

        {/* Events column */}
        <div className="flex-1 relative">
          {HOURS.map(h => (
            <div
              key={h}
              onClick={() => onSlotClick(currentDate, h)}
              className="h-16 border-b border-gray-100 dark:border-gray-800 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 cursor-pointer transition-colors"
            />
          ))}

          {/* Current time indicator */}
          {isToday && (() => {
            const now = new Date()
            const minutes = now.getHours() * 60 + now.getMinutes()
            const top = (minutes / 60) * 64
            return (
              <div className="absolute left-0 right-0 flex items-center z-20 pointer-events-none" style={{ top: `${top}px` }}>
                <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                <div className="flex-1 border-t border-red-500" />
              </div>
            )
          })()}

          {dayEvents.map(event => {
            const start = new Date(event.start_time)
            const end = new Date(event.end_time)
            const startMinutes = start.getHours() * 60 + start.getMinutes()
            const endMinutes = end.getHours() * 60 + end.getMinutes()
            const top = (startMinutes / 60) * 64
            const height = Math.max(((endMinutes - startMinutes) / 60) * 64, 32)

            return (
              <div
                key={event.id}
                onClick={(e) => { e.stopPropagation(); onEventClick(event) }}
                className="absolute left-2 right-2 rounded-lg px-3 py-1 text-white cursor-pointer hover:opacity-80 overflow-hidden z-10 shadow-sm"
                style={{
                  top: `${top}px`,
                  height: `${height}px`,
                  backgroundColor: event.color || '#3B82F6',
                }}
              >
                <div className="font-semibold text-sm truncate">{event.title}</div>
                <div className="text-xs opacity-80">
                  {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                  {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                {event.location && (
                  <div className="text-xs opacity-70 truncate mt-0.5">📍 {event.location}</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
