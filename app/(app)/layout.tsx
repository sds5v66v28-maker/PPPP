import { redirect } from 'next/navigation'
import Navigation from '@/components/Navigation'
import { getSupabaseClient, getCurrentUser } from '@/lib/supabase/cached'
import type { Profile, FamilyGroup } from '@/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const supabase = await getSupabaseClient()

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('family_members').select('*, family_groups(*)').eq('user_id', user.id).single(),
  ])

  const group = membership?.family_groups as FamilyGroup | null

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation profile={profile as Profile | null} group={group} />
      <main className="flex-1 overflow-auto app-main">
        {children}
      </main>
    </div>
  )
}
