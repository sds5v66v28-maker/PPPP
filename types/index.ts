export type Priority = 'high' | 'medium' | 'low'
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly'
export type CalendarView = 'month' | 'week' | 'day'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  color: string
  created_at: string
}

export interface FamilyGroup {
  id: string
  name: string
  created_by: string
  invite_code: string
  created_at: string
}

export interface FamilyMember {
  id: string
  group_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
  profile?: Profile
}

export interface Event {
  id: string
  group_id: string
  created_by: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  all_day: boolean
  color: string | null
  location: string | null
  created_at: string
  updated_at: string
  creator?: Profile
  comment_count?: number
  reaction_count?: number
}

export interface Task {
  id: string
  group_id: string
  created_by: string
  assigned_to: string | null
  title: string
  description: string | null
  due_date: string | null
  due_time: string | null
  priority: Priority
  completed: boolean
  completed_at: string | null
  recurrence: RecurrenceType
  recurrence_end_date: string | null
  section: string | null
  created_at: string
  updated_at: string
  creator?: Profile
  assignee?: Profile
  comment_count?: number
  reaction_count?: number
}

export interface Comment {
  id: string
  entity_type: 'event' | 'task'
  entity_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  author?: Profile
}

export interface Reaction {
  id: string
  entity_type: 'event' | 'task'
  entity_id: string
  user_id: string
  emoji: string
  created_at: string
  user?: Profile
}
