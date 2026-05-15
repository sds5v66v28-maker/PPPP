'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Event, FamilyMember, Profile } from '@/types'
import CommentSection from '@/components/comments/CommentSection'
import { XIcon, MapPinIcon, CalendarIcon, TrashIcon, EditIcon } from 'lucide-react'

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
]

interface EventModalProps {
  event: Event | null
  defaultDate?: Date
  groupId: string
  currentUserId: string
  members: FamilyMember[]
  onClose: () => void
  onSaved: () => void
}

export default function EventModal({
  event,
  defaultDate,
  groupId,
  currentUserId,
  members,
  onClose,
  onSaved,
}: EventModalProps) {
  const isEditing = !!event
  const [mode, setMode] = useState<'view' | 'edit'>(isEditing ? 'view' : 'edit')
  const supabase = createClient()

  const defaultStart = defaultDate ? new Date(defaultDate) : new Date()
  defaultStart.setMinutes(0, 0, 0)
  const defaultEnd = new Date(defaultStart)
  defaultEnd.setHours(defaultStart.getHours() + 1)

  const [title, setTitle] = useState(event?.title || '')
  const [description, setDescription] = useState(event?.description || '')
  const [location, setLocation] = useState(event?.location || '')
  const [startTime, setStartTime] = useState(
    event ? event.start_time.slice(0, 16) : toLocalDateTimeString(defaultStart)
  )
  const [endTime, setEndTime] = useState(
    event ? event.end_time.slice(0, 16) : toLocalDateTimeString(defaultEnd)
  )
  const [allDay, setAllDay] = useState(event?.all_day || false)
  const [color, setColor] = useState(event?.color || COLORS[0])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [memberProfiles, setMemberProfiles] = useState<Profile[]>([])

  useEffect(() => {
    if (members.length > 0) {
      const userIds = members.map(m => m.user_id)
      supabase.from('profiles').select('*').in('id', userIds).then(({ data }) => {
        if (data) setMemberProfiles(data)
      })
    }
  }, [members])

  function toLocalDateTimeString(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      all_day: allDay,
      color,
      group_id: groupId,
      created_by: currentUserId,
    }

    if (isEditing && event) {
      await supabase.from('events').update(payload).eq('id', event.id)
    } else {
      await supabase.from('events').insert(payload)
    }

    setSaving(false)
    onSaved()
  }

  const handleDelete = async () => {
    if (!event) return
    setDeleting(true)
    await supabase.from('events').delete().eq('id', event.id)
    setDeleting(false)
    onSaved()
  }

  const creator = memberProfiles.find(p => p.id === event?.created_by)

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {mode === 'view' ? '予定の詳細' : isEditing ? '予定を編集' : '新しい予定'}
          </h2>
          <div className="flex items-center gap-2">
            {mode === 'view' && event?.created_by === currentUserId && (
              <>
                <button
                  onClick={() => setMode('edit')}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                >
                  <EditIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {mode === 'view' && event ? (
            <>
              {/* View mode */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: event.color || COLORS[0] }} />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{event.title}</h3>
                </div>
                {event.description && (
                  <p className="text-gray-600 dark:text-gray-400 mt-2">{event.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <CalendarIcon className="w-4 h-4 flex-shrink-0" />
                <span>
                  {event.all_day
                    ? new Date(event.start_time).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
                    : `${new Date(event.start_time).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 〜 ${new Date(event.end_time).toLocaleString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`
                  }
                </span>
              </div>

              {event.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <MapPinIcon className="w-4 h-4 flex-shrink-0" />
                  <span>{event.location}</span>
                </div>
              )}

              {creator && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-semibold"
                    style={{ backgroundColor: creator.color }}
                  >
                    {(creator.full_name?.[0] || creator.email[0]).toUpperCase()}
                  </div>
                  <span>作成者：{creator.full_name || creator.email}</span>
                </div>
              )}

              <CommentSection
                entityType="event"
                entityId={event.id}
                currentUserId={currentUserId}
              />
            </>
          ) : (
            <>
              {/* Edit / Create mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">タイトル *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例：誕生日パーティー"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">メモ</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="詳細を入力..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="allDay"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <label htmlFor="allDay" className="text-sm font-medium text-gray-700 dark:text-gray-300">終日</label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">開始</label>
                  <input
                    type={allDay ? 'date' : 'datetime-local'}
                    value={allDay ? startTime.slice(0, 10) : startTime}
                    onChange={(e) => setStartTime(allDay ? e.target.value + 'T00:00' : e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">終了</label>
                  <input
                    type={allDay ? 'date' : 'datetime-local'}
                    value={allDay ? endTime.slice(0, 10) : endTime}
                    onChange={(e) => setEndTime(allDay ? e.target.value + 'T23:59' : e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">場所</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="場所を入力..."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">色</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                        color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {mode === 'edit' && (
          <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
            {isEditing && (
              <button
                onClick={() => setMode('view')}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                キャンセル
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '保存中...' : isEditing ? '変更を保存' : '予定を作成'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
