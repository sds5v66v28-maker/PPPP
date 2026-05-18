'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CalendarView from '@/components/calendar/CalendarView'
import CalendarLoading from './loading'
import type { Event, Task, FamilyMember } from '@/types'

export default function CalendarPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [groupId, setGroupId] = useState('')
  const [userId, setUserId] = useState('')
  const [events, setEvents] = useState<Event[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<FamilyMember[]>([])

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: membership } = await supabase
        .from('family_members')
        .select('group_id')
        .eq('user_id', user.id)
        .single()

      if (!membership?.group_id) return
      const gId = membership.group_id

      const [eventsRes, tasksRes, membersRes] = await Promise.all([
        supabase.from('events').select('*').eq('group_id', gId).order('start_time'),
        supabase.from('tasks').select('*').eq('group_id', gId).order('due_date'),
        supabase.from('family_members').select('*').eq('group_id', gId),
      ])

      setGroupId(gId)
      setUserId(user.id)
      setEvents(eventsRes.data || [])
      setTasks(tasksRes.data || [])
      setMembers(membersRes.data || [])
      setReady(true)
    }
    init()
  }, [router])

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
