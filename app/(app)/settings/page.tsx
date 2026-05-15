'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, FamilyGroup, FamilyMember } from '@/types'
import { CopyIcon, CheckIcon, PlusIcon, LogInIcon, TrashIcon } from 'lucide-react'

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
]

function getInitials(name: string | null | undefined, email: string | undefined) {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  if (email) return email[0].toUpperCase()
  return '?'
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [group, setGroup] = useState<FamilyGroup | null>(null)
  const [members, setMembers] = useState<(FamilyMember & { profile: Profile })[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>('')

  const [fullName, setFullName] = useState('')
  const [selectedColor, setSelectedColor] = useState(COLORS[0])
  const [groupName, setGroupName] = useState('')

  const [newGroupName, setNewGroupName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [joinCode, setJoinCode] = useState('')

  const [copied, setCopied] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingGroup, setSavingGroup] = useState(false)
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [joiningGroup, setJoiningGroup] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const supabase = createClient()

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUserId(user.id)

    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (profileData) {
      setProfile(profileData)
      setFullName(profileData.full_name || '')
      setSelectedColor(profileData.color || COLORS[0])
    }

    const { data: membership } = await supabase
      .from('family_members')
      .select('*, family_groups(*)')
      .eq('user_id', user.id)
      .single()

    if (membership?.family_groups) {
      const g = membership.family_groups as FamilyGroup
      setGroup(g)
      setGroupName(g.name)

      const { data: membersData } = await supabase
        .from('family_members')
        .select('*')
        .eq('group_id', g.id)

      if (membersData) {
        const profileIds = membersData.map((m: FamilyMember) => m.user_id)
        const { data: profilesData } = await supabase.from('profiles').select('*').in('id', profileIds)
        const profileMap: Record<string, Profile> = {}
        profilesData?.forEach((p: Profile) => { profileMap[p.id] = p })

        setMembers(membersData.map((m: FamilyMember) => ({ ...m, profile: profileMap[m.user_id] })))
      }
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  const handleSaveProfile = async () => {
    if (!currentUserId) return
    setSavingProfile(true)
    await supabase.from('profiles').update({ full_name: fullName, color: selectedColor }).eq('id', currentUserId)
    setSavingProfile(false)
    showSuccess('Profile saved!')
    fetchData()
  }

  const handleSaveGroup = async () => {
    if (!group) return
    setSavingGroup(true)
    await supabase.from('family_groups').update({ name: groupName }).eq('id', group.id)
    setSavingGroup(false)
    showSuccess('Group name updated!')
    fetchData()
  }

  const handleCopyInviteLink = () => {
    if (!group) return
    const link = `${window.location.origin}/settings?join=${group.invite_code}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyCode = () => {
    if (!group) return
    navigator.clipboard.writeText(group.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !currentUserId) return
    setCreatingGroup(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('family_groups')
      .insert({ name: newGroupName.trim(), created_by: currentUserId })
      .select()
      .single()

    if (err || !data) {
      setError(err?.message || 'Failed to create group')
      setCreatingGroup(false)
      return
    }

    await supabase.from('family_members').insert({
      group_id: data.id,
      user_id: currentUserId,
      role: 'admin',
    })

    setCreatingGroup(false)
    setNewGroupName('')
    showSuccess('Family group created!')
    fetchData()
  }

  const handleJoinGroup = async () => {
    if (!joinCode.trim() || !currentUserId) return
    setJoiningGroup(true)
    setError(null)

    const { data: groupData, error: groupErr } = await supabase
      .from('family_groups')
      .select('*')
      .eq('invite_code', joinCode.trim().toUpperCase())
      .single()

    if (groupErr || !groupData) {
      setError('Invalid invite code. Please check and try again.')
      setJoiningGroup(false)
      return
    }

    const { error: joinErr } = await supabase.from('family_members').insert({
      group_id: groupData.id,
      user_id: currentUserId,
      role: 'member',
    })

    if (joinErr) {
      if (joinErr.code === '23505') {
        setError('You are already a member of this group.')
      } else {
        setError(joinErr.message)
      }
      setJoiningGroup(false)
      return
    }

    setJoiningGroup(false)
    setJoinCode('')
    showSuccess('Joined group successfully!')
    fetchData()
  }

  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (userId === currentUserId) return
    await supabase.from('family_members').delete().eq('id', memberId)
    fetchData()
  }

  const currentMember = members.find(m => m.user_id === currentUserId)
  const isAdmin = currentMember?.role === 'admin'

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>

      {/* Notifications */}
      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 text-sm">
          {successMsg}
        </div>
      )}

      {/* Profile Section */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Your Profile</h2>

        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold"
            style={{ backgroundColor: selectedColor }}
          >
            {getInitials(fullName, profile?.email)}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">{profile?.email}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Your avatar uses your chosen color</div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  className={`w-10 h-10 rounded-xl transition-transform hover:scale-110 ${
                    selectedColor === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-50"
          >
            {savingProfile ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </section>

      {/* Family Group */}
      {group ? (
        <>
          {/* Group Info */}
          <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Family Group</h2>

            {isAdmin ? (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Group Name</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleSaveGroup}
                  disabled={savingGroup}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {savingGroup ? 'Saving...' : 'Save Name'}
                </button>
              </div>
            ) : (
              <div className="mb-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">Group name</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">{group.name}</div>
              </div>
            )}

            {/* Invite Code */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Invite Code</div>
              <div className="flex items-center gap-2 mb-3">
                <code className="flex-1 text-2xl font-mono font-bold text-gray-900 dark:text-white tracking-widest text-center bg-white dark:bg-gray-700 py-2 px-4 rounded-xl border border-gray-200 dark:border-gray-600">
                  {group.invite_code}
                </code>
                <button
                  onClick={handleCopyCode}
                  className="p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  {copied ? <CheckIcon className="w-5 h-5 text-green-500" /> : <CopyIcon className="w-5 h-5" />}
                </button>
              </div>
              <button
                onClick={handleCopyInviteLink}
                className="w-full py-2 px-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                {copied ? '✓ Copied!' : 'Copy Invite Link'}
              </button>
            </div>
          </section>

          {/* Members */}
          <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Members ({members.length})</h2>
            <div className="space-y-3">
              {members.map(member => {
                const p = member.profile
                if (!p) return null
                const initials = getInitials(p.full_name, p.email)
                const isMe = member.user_id === currentUserId
                return (
                  <div key={member.id} className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                      style={{ backgroundColor: p.color }}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {p.full_name || p.email}
                        </span>
                        {isMe && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">(you)</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {p.full_name ? p.email : ''}{' '}
                        <span className={`font-medium ${member.role === 'admin' ? 'text-blue-500' : 'text-gray-400'}`}>
                          {member.role}
                        </span>
                      </div>
                    </div>
                    {isAdmin && !isMe && (
                      <button
                        onClick={() => handleRemoveMember(member.id, member.user_id)}
                        className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove member"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        </>
      ) : (
        /* No group - create or join */
        <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Family Group</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Create a new family group or join an existing one with an invite code.
          </p>

          {/* Create Group */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <PlusIcon className="w-4 h-4" />
              Create a Family Group
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="The Smiths"
                className="flex-1 px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleCreateGroup}
                disabled={creatingGroup || !newGroupName.trim()}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {creatingGroup ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-white dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">or</span>
            </div>
          </div>

          {/* Join Group */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <LogInIcon className="w-4 h-4" />
              Join with Invite Code
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="XXXXXXXX"
                maxLength={8}
                className="flex-1 px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleJoinGroup}
                disabled={joiningGroup || joinCode.length < 4}
                className="px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {joiningGroup ? 'Joining...' : 'Join'}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
