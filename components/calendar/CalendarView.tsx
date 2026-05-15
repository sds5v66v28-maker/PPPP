'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Event, Task, FamilyMember, CalendarView } from '@/types'
import MonthView from './MonthView'
import WeekView from './WeekView'
import DayView from './DayView'
import EventModal from './EventModal'
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from 'lucide-react'

interface CalendarViewProps {
  initialEvents: Event[]
  initialTasks: Task[]
  groupId: string
  currentUserId: string
  members: FamilyMember[]
}

function formatTitle(date: Date, view: CalendarView): string {
  if (view === 'month') {
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })
  }
  if (view === 'week') {
    const start = new Date(date)
    const day = start.getDay()
    start.setDate(start.getDate() - day)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return `${start.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}〜${end.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}`
  }
  return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
}

function navigate(date: Date, view: CalendarView, direction: -1 | 1): Date {
  const d = new Date(date)
  if (view === 'month') d.setMonth(d.getMonth() + direction)
  else if (view === 'week') d.setDate(d.getDate() + direction * 7)
  else d.setDate(d.getDate() + direction)
  return d
}

export default function CalendarView({ initialEvents, initialTasks, groupId, currentUserId, members }: CalendarViewProps) {
  const [view, setView] = useState<CalendarView>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [modalEvent, setModalEvent] = useState<Event | null | undefined>(undefined) // undefined = closed, null = new
  const [defaultDate, setDefaultDate] = useState<Date | undefined>()
  const [defaultHour, setDefaultHour] = useState<number | undefined>()
  const supabase = createClient()

  const fetchData = async () => {
    const [{ data: eventsData }, { data: tasksData }] = await Promise.all([
      supabase.from('events').select('*').eq('group_id', groupId).order('start_time'),
      supabase.from('tasks').select('*').eq('group_id', groupId).order('due_date'),
    ])
    if (eventsData) setEvents(eventsData)
    if (tasksData) setTasks(tasksData)
  }

  useEffect(() => {
    const channel = supabase
      .channel('calendar-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `group_id=eq.${groupId}` }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `group_id=eq.${groupId}` }, fetchData)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [groupId])

  const handleDayClick = (date: Date) => {
    setDefaultDate(date)
    setDefaultHour(undefined)
    setModalEvent(null)
  }

  const handleSlotClick = (date: Date, hour: number) => {
    const d = new Date(date)
    d.setHours(hour, 0, 0, 0)
    setDefaultDate(d)
    setDefaultHour(hour)
    setModalEvent(null)
  }

  const handleEventClick = (event: Event) => {
    setModalEvent(event)
  }

  const handleTaskClick = () => {
    // Could open task modal - for now just navigate to tasks
  }

  const handleModalClose = () => {
    setModalEvent(undefined)
    setDefaultDate(undefined)
    setDefaultHour(undefined)
  }

  const handleModalSaved = () => {
    fetchData()
    handleModalClose()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            今日
</button>
          <div className="flex items-center">
            <button
              onClick={() => setCurrentDate(navigate(currentDate, view, -1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentDate(navigate(currentDate, view, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white hidden sm:block">
            {formatTitle(currentDate, view)}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex rounded-xl border border-gray-300 dark:border-gray-600 overflow-hidden">
            {([['month', '月'], ['week', '週'], ['day', '日']] as [CalendarView, string][]).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === v
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* FAB on desktop */}
          <button
            onClick={() => { setDefaultDate(new Date()); setModalEvent(null) }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            予定を追加
          </button>
        </div>
      </div>

      {/* Mobile title */}
      <div className="sm:hidden px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          {formatTitle(currentDate, view)}
        </h2>
      </div>

      {/* Calendar body */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-gray-800">
        {view === 'month' && (
          <MonthView
            currentDate={currentDate}
            events={events}
            tasks={tasks}
            onDayClick={handleDayClick}
            onEventClick={handleEventClick}
            onTaskClick={handleTaskClick}
          />
        )}
        {view === 'week' && (
          <WeekView
            currentDate={currentDate}
            events={events}
            tasks={tasks}
            onEventClick={handleEventClick}
            onTaskClick={handleTaskClick}
            onSlotClick={handleSlotClick}
          />
        )}
        {view === 'day' && (
          <DayView
            currentDate={currentDate}
            events={events}
            tasks={tasks}
            onEventClick={handleEventClick}
            onTaskClick={handleTaskClick}
            onSlotClick={handleSlotClick}
          />
        )}
      </div>

      {/* FAB on mobile */}
      <button
        onClick={() => { setDefaultDate(new Date()); setModalEvent(null) }}
        className="sm:hidden fixed bottom-20 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center z-40 transition-colors"
      >
        <PlusIcon className="w-6 h-6" />
      </button>

      {/* Event Modal */}
      {modalEvent !== undefined && (
        <EventModal
          event={modalEvent}
          defaultDate={defaultDate}
          groupId={groupId}
          currentUserId={currentUserId}
          members={members}
          onClose={handleModalClose}
          onSaved={handleModalSaved}
        />
      )}
    </div>
  )
}
