'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Comment, Reaction, Profile } from '@/types'

interface CommentSectionProps {
  entityType: 'event' | 'task'
  entityId: string
  currentUserId: string
}

const EMOJIS = ['👍', '❤️', '😊', '🎉']

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function getInitials(name: string | null | undefined, email: string | undefined) {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  if (email) return email[0].toUpperCase()
  return '?'
}

export default function CommentSection({ entityType, entityId, currentUserId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()
  const bottomRef = useRef<HTMLDivElement>(null)

  const fetchData = async () => {
    const [{ data: commentsData }, { data: reactionsData }] = await Promise.all([
      supabase
        .from('comments')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: true }),
      supabase
        .from('reactions')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId),
    ])

    if (commentsData) setComments(commentsData)
    if (reactionsData) setReactions(reactionsData)

    // Fetch profiles for comment authors
    const userIds = [
      ...(commentsData || []).map((c: Comment) => c.user_id),
      ...(reactionsData || []).map((r: Reaction) => r.user_id),
    ]
    const uniqueIds = [...new Set(userIds)]
    if (uniqueIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', uniqueIds)
      if (profilesData) {
        const map: Record<string, Profile> = {}
        profilesData.forEach((p: Profile) => { map[p.id] = p })
        setProfiles(map)
      }
    }
  }

  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel(`comments-${entityId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `entity_id=eq.${entityId}`,
      }, () => fetchData())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reactions',
        filter: `entity_id=eq.${entityId}`,
      }, () => fetchData())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [entityId])

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    setSubmitting(true)
    await supabase.from('comments').insert({
      entity_type: entityType,
      entity_id: entityId,
      user_id: currentUserId,
      content: newComment.trim(),
    })
    setNewComment('')
    setSubmitting(false)
  }

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from('comments').delete().eq('id', commentId)
  }

  const handleReact = async (emoji: string) => {
    const existing = reactions.find(
      r => r.user_id === currentUserId && r.emoji === emoji
    )
    if (existing) {
      await supabase.from('reactions').delete().eq('id', existing.id)
    } else {
      await supabase.from('reactions').insert({
        entity_type: entityType,
        entity_id: entityId,
        user_id: currentUserId,
        emoji,
      })
    }
  }

  // Group reactions by emoji
  const reactionGroups: Record<string, Reaction[]> = {}
  reactions.forEach(r => {
    if (!reactionGroups[r.emoji]) reactionGroups[r.emoji] = []
    reactionGroups[r.emoji].push(r)
  })

  return (
    <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
      {/* Reactions */}
      <div className="flex flex-wrap gap-2 mb-4">
        {EMOJIS.map(emoji => {
          const group = reactionGroups[emoji] || []
          const hasReacted = group.some(r => r.user_id === currentUserId)
          return (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                hasReacted
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span>{emoji}</span>
              {group.length > 0 && (
                <span className="font-medium">{group.length}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Comments */}
      <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
        {comments.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No comments yet. Be the first!</p>
        )}
        {comments.map(comment => {
          const author = profiles[comment.user_id]
          const initials = getInitials(author?.full_name, author?.email)
          const isOwn = comment.user_id === currentUserId
          return (
            <div key={comment.id} className="flex gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                style={{ backgroundColor: author?.color || '#3B82F6' }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {author?.full_name || author?.email || 'Unknown'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{timeAgo(comment.created_at)}</span>
                </div>
                <div className="flex items-start gap-2 mt-0.5">
                  <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">{comment.content}</p>
                  {isOwn && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 flex-shrink-0"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Add comment */}
      <form onSubmit={handleAddComment} className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={submitting || !newComment.trim()}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </div>
  )
}
