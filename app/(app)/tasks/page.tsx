import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TaskList from '@/components/tasks/TaskList'
import { ensureGroup } from '@/lib/supabase/ensure-group'
import type { Task, FamilyMember } from '@/types'

export default async function TasksPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const groupId = await ensureGroup(supabase, user.id)

  const [{ data: tasks }, { data: members }] = await Promise.all([
    supabase
      .from('tasks')
      .select('*')
      .eq('group_id', groupId)
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: false }),
    supabase.from('family_members').select('*').eq('group_id', groupId),
  ])

  return (
    <div className="h-full flex flex-col">
      <TaskList
        initialTasks={(tasks as Task[]) || []}
        groupId={groupId}
        currentUserId={user.id}
        members={(members as FamilyMember[]) || []}
      />
    </div>
  )
}
