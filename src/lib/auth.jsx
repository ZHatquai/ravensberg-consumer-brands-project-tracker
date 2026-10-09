// The login: Supabase Auth with a magic link. The session identifies the person; their profile (found by the link
// trigger through auth_user_id, readable by its owner under the profiles policy) says what they may do.
// An identity with no active profile sees "This address has no access" and nothing else.
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getSupabase } from './supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', session: null, profile: null })

  const loadProfile = useCallback(async (session) => {
    if (!session) return setState({ status: 'signed-out', session: null, profile: null })
    const sb = getSupabase()
    const { data, error } = await sb.from('profiles').select('*').eq('auth_user_id', session.user.id).is('retired_at', null).maybeSingle()
    if (error || !data) return setState({ status: 'no-access', session, profile: null })
    setState({ status: 'signed-in', session, profile: data })
  }, [])

  useEffect(() => {
    let sb
    try {
      sb = getSupabase()
    } catch (err) {
      setState({ status: 'misconfigured', session: null, profile: null, message: err.message })
      return undefined
    }
    sb.auth.getSession().then(({ data }) => loadProfile(data.session))
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      loadProfile(session)
    })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const signIn = useCallback(async (email) => {
    const sb = getSupabase()
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin + '/' },
    })
    return error
  }, [])

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut()
    setState({ status: 'signed-out', session: null, profile: null })
  }, [])

  return <AuthContext.Provider value={{ ...state, signIn, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
