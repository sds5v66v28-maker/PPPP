'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import TaskList from '@/components/tasks/TaskList'
import TasksLoading from './loading'
import type { Task, FamilyMember } from '@/types'

export default function TasksPage() {
  const { userId, groupId } = useAuth()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<FamilyMember[]>([])

  const load = useCallback(async () => {
    setError(null)
    try {
      const supabase = createClient()
      const [tasksRes, membersRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('group_id', groupId)
          .order('due_date', { ascending: true })
          .order('created_at', { ascending: false }),
        supabase.from('family_members').select('*').eq('group_id', groupId),
      ])
      if (tasksRes.error) throw tasksRes.error
      setTasks(tasksRes.data || [])
      setMembers(membersRes.data || [])
      setReady(true)
    } catch (err) {
      console.error('TasksPage load error:', err)
      setError('データの読み込みに失敗しました。')
    }
  }, [groupId])

  useEffect(() => {
    if (groupId) load()
  }, [groupId, load])

  if (!groupId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500 dark:text-gray-400">
        <p className="text-sm">グループの設定に失敗しました。</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors">再読み込み</button>
      </div>
    )
  }

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
