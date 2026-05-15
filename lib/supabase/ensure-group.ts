import type { SupabaseClient } from '@supabase/supabase-js'

export async function ensureGroup(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data: membership } = await supabase
    .from('family_members')
    .select('group_id')
    .eq('user_id', userId)
    .single()

  if (membership?.group_id) return membership.group_id

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', userId)
    .single()

  const groupName = profile?.full_name ? `${profile.full_name}のグループ` : 'マイグループ'

  const { data: group } = await supabase
    .from('family_groups')
    .insert({ name: groupName, created_by: userId })
    .select()
    .single()

  if (!group) throw new Error('グループの作成に失敗しました')

  await supabase.from('family_members').insert({
    group_id: group.id,
    user_id: userId,
    role: 'admin',
  })

  return group.id
}
