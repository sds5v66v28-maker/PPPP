import { cache } from 'react'
import { createClient } from './server'
import { ensureGroup } from './ensure-group'

// Single Supabase client per request — eliminates duplicate cookie reads
export const getSupabaseClient = cache(async () => createClient())

// Auth user — eliminates duplicate getUser() calls across layout + page
export const getCurrentUser = cache(async () => {
  const supabase = await getSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

// Group ID — eliminates duplicate family_members queries across layout + page
export const getGroupId = cache(async (userId: string): Promise<string | null> => {
  const supabase = await getSupabaseClient()
  return ensureGroup(supabase, userId)
})
