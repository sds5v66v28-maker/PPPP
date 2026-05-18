'use client'

import { createContext, useContext } from 'react'

interface AuthContextValue {
  userId: string
  groupId: string
}

const AuthContext = createContext<AuthContextValue>({ userId: '', groupId: '' })

export function AuthProvider({
  userId,
  groupId,
  children,
}: {
  userId: string
  groupId: string
  children: React.ReactNode
}) {
  return (
    <AuthContext.Provider value={{ userId, groupId }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
