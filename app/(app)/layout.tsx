import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navigation from '@/components/Navigation'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: membership } = await supabase
    .from('family_members')
    .select('*, family_groups(*)')
    .eq('user_id', user.id)
    .single()

  const group = membership?.family_groups as { id: string; name: string; created_by: string; invite_code: string; created_at: string } | null

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation profile={profile} group={group} />
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        {children}
      </main>
    </div>
  )
}
