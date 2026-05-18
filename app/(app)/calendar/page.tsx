import { redirect } from 'next/navigation'
import CalendarView from '@/components/calendar/CalendarView'
import { getSupabaseClient, getCurrentUser, getGroupId } from '@/lib/supabase/cached'
import type { Event, Task, FamilyMember } from '@/types'

export default async function CalendarPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const [groupId, supabase] = await Promise.all([
    getGroupId(user.id),
    getSupabaseClient(),
  ])

  const [events, tasks, members] = groupId
    ? await Promise.all([
        supabase.from('events').select('*').eq('group_id', groupId).order('start_time').then(r => r.data),
        supabase.from('tasks').select('*').eq('group_id', groupId).order('due_date').then(r => r.data),
        supabase.from('family_members').select('*').eq('group_id', groupId).then(r => r.data),
      ])
    : [[], [], []]

  return (
    <div className="h-full flex flex-col">
      <CalendarView
        initialEvents={(events as Event[]) || []}
        initialTasks={(tasks as Task[]) || []}
        groupId={groupId ?? ''}
        currentUserId={user.id}
        members={(members as FamilyMember[]) || []}
      />
    </div>
  )
}
