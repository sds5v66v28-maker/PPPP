import { redirect } from 'next/navigation'
import Navigation from '@/components/Navigation'
import { getCurrentUser, getSupabaseClient } from '@/lib/supabase/cached'
import { ensureGroup } from '@/lib/supabase/ensure-group'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const supabase = await getSupabaseClient()
  await ensureGroup(supabase, user.id)

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <main className="flex-1 overflow-auto app-main">
        {children}
      </main>
    </div>
  )
}
