'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task, Profile } from '@/types'
import { RepeatIcon } from 'lucide-react'

interface TaskItemProps {
  task: Task
  currentUserId: string
  memberProfiles: Record<string, Profile>
  onEdit: (task: Task) => void
  onRefresh: () => void
}

const PRIORITY_COLORS = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
}

const PRIORITY_LABELS = {
  high: '高',
  medium: '中',
  low: '低',
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.floor((d.getTime() - today.getTime()) / 86400000)

  if (diff === 0) return { label: '今日', overdue: false }
  if (diff === 1) return { label: '明日', overdue: false }
  if (diff === -1) return { label: '昨日', overdue: true }
  if (diff < 0) return { label: `${Math.abs(diff)}日超過`, overdue: true }
  if (diff < 7) return { label: d.toLocaleDateString('ja-JP', { weekday: 'short' }), overdue: false }
  return { label: d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }), overdue: false }
}

export default function TaskItem({ task, currentUserId, memberProfiles, onEdit, onRefresh }: TaskItemProps) {
  const [toggling, setToggling] = useState(false)
  const supabase = createClient()
  const assignee = task.assigned_to ? memberProfiles[task.assigned_to] : null
  const dueDateInfo = formatDate(task.due_date)

  const handleToggle = async () => {
    setToggling(true)
    await supabase
      .from('tasks')
      .update({
        completed: !task.completed,
        completed_at: !task.completed ? new Date().toISOString() : null,
      })
      .eq('id', task.id)
    setToggling(false)
    onRefresh()
  }

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border transition-colors cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 ${
        task.completed
          ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      }`}
      onClick={() => onEdit(task)}
    >
      {/* Priority indicator */}
      <div className={`w-1 h-full min-h-[40px] rounded-full flex-shrink-0 ${PRIORITY_COLORS[task.priority]}`} />

      {/* Checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); handleToggle() }}
        disabled={toggling}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          task.completed
            ? 'border-green-500 bg-green-500'
            : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
        }`}
      >
        {task.completed && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium leading-snug ${
            task.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'
          }`}>
            {task.title}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {task.recurrence !== 'none' && (
              <RepeatIcon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
            )}
          </div>
        </div>

        {task.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{task.description}</p>
        )}

        <div className="flex items-center gap-3 mt-1.5">
          {dueDateInfo && (
            <span className={`text-xs font-medium ${
              dueDateInfo.overdue ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
            }`}>
              📅 {dueDateInfo.label}
            </span>
          )}

          <span className={`text-xs font-medium ${
            task.priority === 'high' ? 'text-red-500' : task.priority === 'medium' ? 'text-yellow-500' : 'text-green-600'
          }`}>
            {PRIORITY_LABELS[task.priority]}
          </span>
        </div>
      </div>

      {/* Assignee avatar */}
      {assignee && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
          style={{ backgroundColor: assignee.color }}
          title={assignee.full_name || assignee.email}
        >
          {(assignee.full_name?.[0] || assignee.email[0]).toUpperCase()}
        </div>
      )}
    </div>
  )
}
