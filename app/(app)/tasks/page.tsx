'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import TaskList from '@/components/tasks/TaskList'
import TasksLoading from './loading'
import type { Task, FamilyMember } from '@/types'

export default function TasksPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [groupId, setGroupId] = useState('')
  const [userId, setUserId] = useState('')
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

      const [tasksRes, membersRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('group_id', gId)
          .order('due_date', { ascending: true })
          .order('created_at', { ascending: false }),
        supabase.from('family_members').select('*').eq('group_id', gId),
      ])

      setGroupId(gId)
      setUserId(user.id)
      setTasks(tasksRes.data || [])
      setMembers(membersRes.data || [])
      setReady(true)
    }
    init()
  }, [router])

  if (!ready) return <TasksLoading />

  return (
    <div className="h-full flex flex-col">
      <TaskList
        initialTasks={tasks}
        groupId={groupId}
        currentUserId={userId}
        members={members}
      />
    </div>
  )
}
