'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CalendarView from '@/components/calendar/CalendarView'
import CalendarLoading from './loading'
import type { Event, Task, FamilyMember } from '@/types'

export default function CalendarPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [groupId, setGroupId] = useState('')
  const [userId, setUserId] = useState('')
  const [events, setEvents] = useState<Event[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<FamilyMember[]>([])

  const init = useCallback(async () => {
    setError(null)
    try {
      const supabase = createClient()

      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      if (authErr || !user) { router.replace('/login'); return }

      const { data: membership, error: memberErr } = await supabase
        .from('family_members')
        .select('group_id')
        .eq('user_id', user.id)
        .single()

      if (memberErr || !membership?.group_id) {
        console.error('family_members error:', memberErr)
        setError('グループが見つかりません。設定を確認してください。')
        return
      }

      const gId = membership.group_id

      const [eventsRes, tasksRes, membersRes] = await Promise.all([
        supabase.from('events').select('*').eq('group_id', gId).order('start_time'),
        supabase.from('tasks').select('*').eq('group_id', gId).order('due_date'),
        supabase.from('family_members').select('*').eq('group_id', gId),
      ])

      if (eventsRes.error) console.error('events error:', eventsRes.error)
      if (tasksRes.error) console.error('tasks error:', tasksRes.error)

      setGroupId(gId)
      setUserId(user.id)
      setEvents(eventsRes.data || [])
      setTasks(tasksRes.data || [])
      setMembers(membersRes.data || [])
      setReady(true)
    } catch (err) {
      console.error('CalendarPage init error:', err)
      setError('読み込みに失敗しました。')
    }
  }, [router])

  useEffect(() => { init() }, [init])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500 dark:text-gray-400">
        <p className="text-sm">{error}</p>
        <button
          onClick={() => { setReady(false); init() }}
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
