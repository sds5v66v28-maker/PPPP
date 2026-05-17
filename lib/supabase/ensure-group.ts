import type { SupabaseClient } from '@supabase/supabase-js'

export async function ensureGroup(supabase: SupabaseClient, userId: string): Promise<string | null> {
  try {
    const { data: membership } = await supabase
      .from('family_members')
      .select('group_id')
      .eq('user_id', userId)
      .single()

    if (membership?.group_id) return membership.group_id

    // Ensure profile exists (trigger may not have fired on OAuth signup)
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single()

    if (!profile) {
      const { data: authData } = await supabase.auth.getUser()
      if (authData.user) {
        await supabase.from('profiles').upsert({
          id: userId,
          email: authData.user.email ?? '',
          full_name: authData.user.user_metadata?.full_name ?? null,
        })
      }
    }

    const groupName = profile?.full_name ? `${profile.full_name}のグループ` : 'マイグループ'

    const { data: group, error } = await supabase
      .from('family_groups')
      .insert({ name: groupName, created_by: userId })
      .select()
      .single()

    if (error || !group) {
      console.error('グループ作成失敗:', error?.message)
      return null
    }

    await supabase.from('family_members').insert({
      group_id: group.id,
      user_id: userId,
      role: 'admin',
    })

    return group.id
  } catch (err) {
    console.error('ensureGroup 予期しないエラー:', err)
    return null
  }
}
