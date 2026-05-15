'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task, Profile, FamilyMember } from '@/types'
import TaskItem from './TaskItem'
import TaskForm from './TaskForm'
import CommentSection from '@/components/comments/CommentSection'
import { PlusIcon, XIcon, FilterIcon, TrashIcon } from 'lucide-react'

interface TaskListProps {
  initialTasks: Task[]
  groupId: string
  currentUserId: string
  members: FamilyMember[]
}

type FilterPriority = 'all' | 'high' | 'medium' | 'low'

export default function TaskList({ initialTasks, groupId, currentUserId, members }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [memberProfiles, setMemberProfiles] = useState<Record<string, Profile>>({})
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all')
  const [filterAssignee, setFilterAssignee] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)
  const supabase = createClient()

  const fetchTasks = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('group_id', groupId)
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: false })
    if (data) setTasks(data)
  }

  useEffect(() => {
    if (members.length > 0) {
      const userIds = members.map(m => m.user_id)
      supabase
        .from('profiles')
        .select('*')
        .in('id', userIds)
        .then(({ data }) => {
          if (data) {
            const map: Record<string, Profile> = {}
            data.forEach((p: Profile) => { map[p.id] = p })
            setMemberProfiles(map)
          }
        })
    }
  }, [members])

  useEffect(() => {
    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `group_id=eq.${groupId}`,
      }, fetchTasks)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [groupId])

  const handleDeleteTask = async (taskId: string) => {
    await supabase.from('tasks').delete().eq('id', taskId)
    setDetailTask(null)
    fetchTasks()
  }

  const today = new Date().toISOString().slice(0, 10)

  const activeTasks = tasks.filter(t => !t.completed)
  const completedTasks = tasks.filter(t => t.completed)

  const applyFilters = (list: Task[]) => {
    return list.filter(t => {
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false
      if (filterAssignee && t.assigned_to !== filterAssignee) return false
      return true
    })
  }

  const todayTasks = applyFilters(activeTasks.filter(t => t.due_date === today))
  const upcomingTasks = applyFilters(activeTasks.filter(t => !t.due_date || t.due_date > today))
  const overdueTasks = applyFilters(activeTasks.filter(t => t.due_date && t.due_date < today))
  const filteredCompleted = applyFilters(completedTasks)

  const memberProfileList = Object.values(memberProfiles)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">タスク</h1>
          <button
            onClick={() => { setEditingTask(null); setShowForm(true) }}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            タスクを追加
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <FilterIcon className="w-4 h-4 text-gray-400" />
          </div>
          {([['all', 'すべて'], ['high', '高'], ['medium', '中'], ['low', '低']] as [FilterPriority, string][]).map(([p, label]) => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                filterPriority === p
                  ? p === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  : p === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                  : p === 'low' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              {label}
            </button>
          ))}

          {memberProfileList.length > 0 && (
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-0 focus:ring-2 focus:ring-blue-500 flex-shrink-0"
            >
              <option value="">全員</option>
              {memberProfileList.map(p => (
                <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Task lists */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Overdue */}
        {overdueTasks.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-red-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              期限超過 ({overdueTasks.length})
            </h2>
            <div className="space-y-2">
              {overdueTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  currentUserId={currentUserId}
                  memberProfiles={memberProfiles}
                  onEdit={(t) => { setDetailTask(t) }}
                  onRefresh={fetchTasks}
                />
              ))}
            </div>
          </section>
        )}

        {/* Today */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            今日 {todayTasks.length > 0 && `(${todayTasks.length})`}
          </h2>
          {todayTasks.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-3">
              今日のタスクはありません 🎉
            </p>
          ) : (
            <div className="space-y-2">
              {todayTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  currentUserId={currentUserId}
                  memberProfiles={memberProfiles}
                  onEdit={(t) => { setDetailTask(t) }}
                  onRefresh={fetchTasks}
                />
              ))}
            </div>
          )}
        </section>

        {/* Upcoming */}
        {upcomingTasks.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
              今後 ({upcomingTasks.length})
            </h2>
            <div className="space-y-2">
              {upcomingTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  currentUserId={currentUserId}
                  memberProfiles={memberProfiles}
                  onEdit={(t) => { setDetailTask(t) }}
                  onRefresh={fetchTasks}
                />
              ))}
            </div>
          </section>
        )}

        {/* Completed */}
        {filteredCompleted.length > 0 && (
          <section>
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
              完了済み ({filteredCompleted.length})
              <span className="ml-1">{showCompleted ? '▲' : '▼'}</span>
            </button>
            {showCompleted && (
              <div className="space-y-2">
                {filteredCompleted.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    currentUserId={currentUserId}
                    memberProfiles={memberProfiles}
                    onEdit={(t) => { setDetailTask(t) }}
                    onRefresh={fetchTasks}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {tasks.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">✅</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">タスクがありません</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">最初のタスクを作成しましょう！</p>
          </div>
        )}
      </div>

      {/* FAB on mobile */}
      <button
        onClick={() => { setEditingTask(null); setShowForm(true) }}
        className="sm:hidden fixed bottom-20 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center z-40 transition-colors"
      >
        <PlusIcon className="w-6 h-6" />
      </button>

      {/* Task Form Modal */}
      {(showForm || editingTask) && (
        <TaskForm
          task={editingTask}
          groupId={groupId}
          currentUserId={currentUserId}
          members={memberProfileList}
          onClose={() => { setShowForm(false); setEditingTask(null) }}
          onSaved={() => { setShowForm(false); setEditingTask(null); fetchTasks() }}
        />
      )}

      {/* Task Detail Modal */}
      {detailTask && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setDetailTask(null)}>
          <div
            className="bg-white dark:bg-gray-800 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">タスクの詳細</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setEditingTask(detailTask); setDetailTask(null); setShowForm(true) }}
                  className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                >
                  編集
                </button>
                {detailTask.created_by === currentUserId && (
                  <button
                    onClick={() => handleDeleteTask(detailTask.id)}
                    className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setDetailTask(null)}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="flex items-start gap-3 mb-4">
                <div className={`w-1.5 h-full min-h-[40px] rounded-full flex-shrink-0 ${
                  detailTask.priority === 'high' ? 'bg-red-500' : detailTask.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                }`} />
                <div>
                  <h3 className={`text-xl font-bold ${detailTask.completed ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                    {detailTask.title}
                  </h3>
                  {detailTask.description && (
                    <p className="text-gray-600 dark:text-gray-400 mt-1">{detailTask.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {detailTask.due_date && (
                      <span>📅 Due {new Date(detailTask.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    )}
                    <span className={`font-medium ${
                      detailTask.priority === 'high' ? 'text-red-500' : detailTask.priority === 'medium' ? 'text-yellow-500' : 'text-green-600'
                    }`}>
                      {detailTask.priority.charAt(0).toUpperCase() + detailTask.priority.slice(1)} priority
                    </span>
                    {detailTask.recurrence !== 'none' && (
                      <span>🔄 繰り返し：{detailTask.recurrence === 'daily' ? '毎日' : detailTask.recurrence === 'weekly' ? '毎週' : '毎月'}</span>
                    )}
                    {detailTask.assigned_to && memberProfiles[detailTask.assigned_to] && (
                      <span>👤 {memberProfiles[detailTask.assigned_to].full_name || memberProfiles[detailTask.assigned_to].email}</span>
                    )}
                  </div>
                </div>
              </div>

              <CommentSection
                entityType="task"
                entityId={detailTask.id}
                currentUserId={currentUserId}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
