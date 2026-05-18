'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import TaskList from '@/components/tasks/TaskList'
import TasksLoading from './loading'
import type { Task, FamilyMember } from '@/types'

export default function TasksPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [groupId, setGroupId] = useState('')
  const [userId, setUserId] = useState('')
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

      const [tasksRes, membersRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('group_id', gId)
          .order('due_date', { ascending: true })
          .order('created_at', { ascending: false }),
        supabase.from('family_members').select('*').eq('group_id', gId),
      ])

      if (tasksRes.error) console.error('tasks error:', tasksRes.error)

      setGroupId(gId)
      setUserId(user.id)
      setTasks(tasksRes.data || [])
      setMembers(membersRes.data || [])
      setReady(true)
    } catch (err) {
      console.error('TasksPage init error:', err)
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
