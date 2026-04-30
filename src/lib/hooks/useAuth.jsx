/**
 * useAuth — Authentication context provider and hook.
 * Manages Google OAuth sign-in/sign-out via Supabase and exposes
 * the current user object to the entire component tree.
 *
 * Usage: const { user, loading, signInWithGoogle, signOut } = useAuth()
 */
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Sync Google picture to profiles table for existing members
  const syncGooglePicture = async (authUser) => {
    if (!authUser) return

    const googlePicture = authUser.user_metadata?.picture
    if (!googlePicture) return

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', authUser.id)
        .single()

      // Only update if they don't have a picture or if it's different
      if (!profile?.avatar_url || profile.avatar_url !== googlePicture) {
        await supabase
          .from('profiles')
          .update({ avatar_url: googlePicture })
          .eq('id', authUser.id)
      }
    } catch (err) {
      console.warn('Failed to sync Google picture:', err.message)
    }
  }

  useEffect(() => {
    const init = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')

      if (code) {
        await supabase.auth.exchangeCodeForSession(code)
        window.history.replaceState(null, '', window.location.pathname + window.location.hash)
      }

      const { data: { session } } = await supabase.auth.getSession()
      const authUser = session?.user
      
      if (authUser) {
        await syncGooglePicture(authUser)
      }
      
      setUser(authUser ?? null)
      setLoading(false)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const authUser = session?.user
      
      if (authUser) {
        await syncGooglePicture(authUser)
      }
      
      setUser(authUser ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname,
      },
    })

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
