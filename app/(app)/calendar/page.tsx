'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import CalendarView from '@/components/calendar/CalendarView'
import CalendarLoading from './loading'
import type { Event, Task, FamilyMember } from '@/types'

export default function CalendarPage() {
  const { userId, groupId } = useAuth()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<FamilyMember[]>([])

  const load = useCallback(async () => {
    setError(null)
    try {
      const supabase = createClient()
      const [eventsRes, tasksRes, membersRes] = await Promise.all([
        supabase.from('events').select('*').eq('group_id', groupId).order('start_time'),
        supabase.from('tasks').select('*').eq('group_id', groupId).order('due_date'),
        supabase.from('family_members').select('*').eq('group_id', groupId),
      ])
      if (eventsRes.error) throw eventsRes.error
      setEvents(eventsRes.data || [])
      setTasks(tasksRes.data || [])
      setMembers(membersRes.data || [])
      setReady(true)
    } catch (err) {
      console.error('CalendarPage load error:', err)
      setError('データの読み込みに失敗しました。')
    }
  }, [groupId])

  useEffect(() => {
    if (groupId) load()
  }, [groupId, load])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500 dark:text-gray-400">
        <p className="text-sm">{error}</p>
        <button
          onClick={load}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
        >
          再試行
        </button>
      </div>
    )
  }

  if (!ready) return <CalendarLoading />

  return (
    <CalendarView
      initialEvents={events}
      initialTasks={tasks}
      groupId={groupId}
      currentUserId={userId}
      members={members}
    />
  )
}
