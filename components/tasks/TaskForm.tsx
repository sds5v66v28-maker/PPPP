'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task, Profile, Priority, RecurrenceType } from '@/types'
import { XIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { parseTaskInput } from '@/lib/utils/parseTaskInput'

interface TaskFormProps {
  task?: Task | null
  groupId: string
  currentUserId: string
  members: Profile[]
  existingSections: string[]
  onClose: () => void
  onSaved: () => void
}

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'high', label: '高', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700' },
  { value: 'medium', label: '中', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700' },
  { value: 'low', label: '低', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700' },
]

const RECURRENCES: { value: RecurrenceType; label: string }[] = [
  { value: 'none', label: 'なし' },
  { value: 'daily', label: '毎日' },
  { value: 'weekly', label: '毎週' },
  { value: 'monthly', label: '毎月' },
]

function formatDateChip(dueDate: string, dueTime: string): string | null {
  if (!dueDate) return null
  const d = new Date(dueDate + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.floor((d.getTime() - today.getTime()) / 86400000)
  let label: string
  if (diff === 0) label = '今日'
  else if (diff === 1) label = '明日'
  else if (diff === -1) label = '昨日'
  else label = d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })
  return dueTime ? `${label} ${dueTime}` : label
}

export default function TaskForm({ task, groupId, currentUserId, members, existingSections, onClose, onSaved }: TaskFormProps) {
  const isEditing = !!task
  const supabase = createClient()

  const [smartInput, setSmartInput] = useState(task?.title || '')
  const [parsedTitle, setParsedTitle] = useState(task?.title || '')
  const [dueDate, setDueDate] = useState(task?.due_date || '')
  const [dueTime, setDueTime] = useState(task?.due_time || '')
  const [section, setSection] = useState(task?.section || '')
  const [description, setDescription] = useState(task?.description || '')
  const [priority, setPriority] = useState<Priority>(task?.priority || 'medium')
  const [assignedTo, setAssignedTo] = useState(task?.assigned_to || '')
  const [recurrence, setRecurrence] = useState<RecurrenceType>(task?.recurrence || 'none')
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(task?.recurrence_end_date || '')
  const [showAdvanced, setShowAdvanced] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    const parsed = parseTaskInput(smartInput)
    setParsedTitle(parsed.title || smartInput)
    if (parsed.date) setDueDate(parsed.date)
    if (parsed.time) setDueTime(parsed.time)
    if (parsed.section) setSection(parsed.section)
  }, [smartInput])

  const dateChip = formatDateChip(dueDate, dueTime)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    // Recompute from source every time — avoids stale parsedTitle state
    const { title: freshTitle } = parseTaskInput(smartInput)
    const titleToSave = (freshTitle || smartInput).trim()
    if (!titleToSave) return

    setSaving(true)
    setSaveError(null)

    const payload = {
      title: titleToSave,
      description: description.trim() || null,
      due_date: dueDate || null,
      due_time: dueTime || null,
      section: section.trim() || null,
      priority,
      assigned_to: assignedTo || null,
      recurrence,
      recurrence_end_date: recurrenceEndDate || null,
      group_id: groupId,
      created_by: currentUserId,
    }

    const { error } = isEditing && task
      ? await supabase.from('tasks').update(payload).eq('id', task.id)
      : await supabase.from('tasks').insert(payload)

    if (error) {
      setSaveError(error.message)
      setSaving(false)
      return
    }

    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'タスクを編集' : '新しいタスク'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="px-5 py-4 space-y-3">
          {/* Smart single input */}
          <div>
            <input
              type="text"
              value={smartInput}
              onChange={(e) => setSmartInput(e.target.value)}
              placeholder="タスク名 #グループ 明日 午後3時..."
              required
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-500"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 px-1">
              #グループ と 日時（今日/明日/来週月曜/午後3時）を自動認識
            </p>
          </div>

          {/* Parsed chips */}
          {(dateChip || section) && (
            <div className="flex flex-wrap gap-2">
              {dateChip && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm border border-blue-200 dark:border-blue-700">
                  📅 {dateChip}
                  <button
                    type="button"
                    onClick={() => { setDueDate(''); setDueTime('') }}
                    className="hover:text-blue-900 dark:hover:text-blue-100 ml-0.5"
                  >
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}
              {section && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm border border-purple-200 dark:border-purple-700">
                  ⊞ {section}
                  <button
                    type="button"
                    onClick={() => setSection('')}
                    className="hover:text-purple-900 dark:hover:text-purple-100 ml-0.5"
                  >
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Advanced settings toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors py-1"
          >
            {showAdvanced ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
            詳細設定
          </button>

          {showAdvanced && (
            <div className="space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4">
              {/* Manual date/time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">期日</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">時刻</label>
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Section manual override */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">グループ</label>
                <input
                  type="text"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="#グループ名でも入力できます"
                  list="section-list"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {existingSections.length > 0 && (
                  <datalist id="section-list">
                    {existingSections.map(s => <option key={s} value={s} />)}
                  </datalist>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">優先度</label>
                <div className="flex gap-2">
                  {PRIORITIES.map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPriority(p.value)}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-sm font-medium border transition-colors ${
                        priority === p.value ? p.color : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assignee */}
              {members.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">担当者</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">未割り当て</option>
                    {members.map(member => (
                      <option key={member.id} value={member.id}>{member.full_name || member.email}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Recurrence */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">繰り返し</label>
                <div className="flex gap-2">
                  {RECURRENCES.map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRecurrence(r.value)}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-sm font-medium border transition-colors ${
                        recurrence === r.value
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                          : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {recurrence !== 'none' && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">繰り返し終了日</label>
                  <input
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">メモ</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="詳細を入力..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          )}

          {saveError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
              保存に失敗しました: {saveError}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving || !smartInput.trim()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '保存中...' : isEditing ? '変更を保存' : 'タスクを作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
