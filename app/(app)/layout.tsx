import { redirect } from 'next/navigation'
import Navigation from '@/components/Navigation'
import { AuthProvider } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/cached'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  // Use a fresh server client (same approach that worked in the old layout)
  const supabase = await createClient()
  const { data: membership } = await supabase
    .from('family_members')
    .select('group_id')
    .eq('user_id', user.id)
    .single()

  const groupId = membership?.group_id ?? ''

  return (
    <AuthProvider userId={user.id} groupId={groupId}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />
        <main className="flex-1 overflow-auto app-main">
          {children}
        </main>
      </div>
    </AuthProvider>
  )
}
