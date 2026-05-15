import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CalendarView from '@/components/calendar/CalendarView'
import type { Event, Task, FamilyMember } from '@/types'

export default async function CalendarPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('family_members')
    .select('*, family_groups(*)')
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-5xl mb-4">📅</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Family Group</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
          You need to create or join a family group to see your shared calendar.
        </p>
        <a
          href="/settings"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
        >
          Go to Settings
        </a>
      </div>
    )
  }

  const groupId = membership.group_id

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
