import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CalendarView from '@/components/calendar/CalendarView'
import { ensureGroup } from '@/lib/supabase/ensure-group'
import type { Event, Task, FamilyMember } from '@/types'

export default async function CalendarPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const groupId = await ensureGroup(supabase, user.id)

  const [{ data: events }, { data: tasks }, { data: members }] = await Promise.all([
    supabase.from('events').select('*').eq('group_id', groupId).order('start_time'),
    supabase.from('tasks').select('*').eq('group_id', groupId).order('due_date'),
    supabase.from('family_members').select('*').eq('group_id', groupId),
  ])

  return (
    <div className="h-full flex flex-col">
      <CalendarView
        initialEvents={(events as Event[]) || []}
        initialTasks={(tasks as Task[]) || []}
        groupId={groupId}
        currentUserId={user.id}
        members={(members as FamilyMember[]) || []}
      />
    </div>
  )
}
