import { redirect } from 'next/navigation'
import TaskList from '@/components/tasks/TaskList'
import { getSupabaseClient, getCurrentUser, getGroupId } from '@/lib/supabase/cached'
import type { Task, FamilyMember } from '@/types'

export default async function TasksPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const [groupId, supabase] = await Promise.all([
    getGroupId(user.id),
    getSupabaseClient(),
  ])

  const [tasks, members] = groupId
    ? await Promise.all([
        supabase.from('tasks').select('*').eq('group_id', groupId)
          .order('due_date', { ascending: true })
          .order('created_at', { ascending: false })
          .then(r => r.data),
        supabase.from('family_members').select('*').eq('group_id', groupId)
          .then(r => r.data),
      ])
    : [[], []]

  return (
    <div className="h-full flex flex-col">
      <TaskList
        initialTasks={(tasks as Task[]) || []}
        groupId={groupId ?? ''}
        currentUserId={user.id}
        members={(members as FamilyMember[]) || []}
      />
    </div>
  )
}
