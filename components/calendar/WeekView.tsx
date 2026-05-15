'use client'

import type { Event, Task } from '@/types'

interface WeekViewProps {
  currentDate: Date
  events: Event[]
  tasks: Task[]
  onEventClick: (event: Event) => void
  onTaskClick: (task: Task) => void
  onSlotClick: (date: Date, hour: number) => void
}

function getWeekDays(date: Date): Date[] {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  return Array.from({ length: 7 }, (_, i) => new Date(d.getFullYear(), d.getMonth(), diff + i))
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatHour(h: number) {
  if (h === 0) return '12 AM'
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

export default function WeekView({ currentDate, events, tasks, onEventClick, onSlotClick }: WeekViewProps) {
  const weekDays = getWeekDays(currentDate)
  const today = new Date()

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header row with day names */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="w-16 flex-shrink-0" />
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, today)
          return (
            <div key={i} className="flex-1 text-center py-2 border-l border-gray-100 dark:border-gray-800">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                {WEEKDAYS_SHORT[day.getDay()]}
              </div>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mx-auto mt-0.5 ${
                  isToday ? 'bg-blue-600 text-white' : 'text-gray-900 dark:text-gray-100'
                }`}
              >
                {day.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <div className="flex flex-1 overflow-y-auto">
        {/* Hour labels */}
        <div className="w-16 flex-shrink-0 border-r border-gray-200 dark:border-gray-700">
          {HOURS.map(h => (
            <div key={h} className="h-14 flex items-start justify-end pr-2 pt-0.5">
              <span className="text-xs text-gray-400 dark:text-gray-500">{formatHour(h)}</span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDays.map((day, di) => {
          const dayStr = day.toISOString().slice(0, 10)
          const dayEvents = events.filter(e => {
            const start = new Date(e.start_time)
            return isSameDay(start, day) && !e.all_day
          })
          const dayTasks = tasks.filter(t => t.due_date === dayStr)

          return (
            <div key={di} className="flex-1 border-l border-gray-100 dark:border-gray-800 relative">
              {HOURS.map(h => (
                <div
                  key={h}
                  onClick={() => onSlotClick(day, h)}
                  className="h-14 border-b border-gray-100 dark:border-gray-800 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 cursor-pointer transition-colors"
                />
              ))}

              {/* Events */}
              {dayEvents.map(event => {
                const start = new Date(event.start_time)
                const end = new Date(event.end_time)
                const startMinutes = start.getHours() * 60 + start.getMinutes()
                const endMinutes = end.getHours() * 60 + end.getMinutes()
                const top = (startMinutes / 60) * 56 // 56px per hour
                const height = Math.max(((endMinutes - startMinutes) / 60) * 56, 24)

                return (
                  <div
                    key={event.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick(event) }}
                    className="absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-white text-xs font-medium cursor-pointer hover:opacity-80 overflow-hidden z-10"
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      backgroundColor: event.color || '#3B82F6',
                    }}
                  >
                    <div className="font-semibold truncate">{event.title}</div>
                    <div className="opacity-80 text-[10px]">
                      {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )
              })}

              {/* Tasks as chips at top of column */}
              {dayTasks.length > 0 && (
                <div className="absolute top-0 left-0 right-0 z-20 px-0.5 space-y-0.5 pointer-events-none">
                  {dayTasks.slice(0, 2).map(task => (
                    <div
                      key={task.id}
                      className="w-full rounded text-[10px] font-medium text-white px-1 py-0.5 truncate pointer-events-auto cursor-pointer"
                      style={{ backgroundColor: task.priority === 'high' ? '#EF4444' : task.priority === 'medium' ? '#F59E0B' : '#10B981' }}
                    >
                      ✓ {task.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
