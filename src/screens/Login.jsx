import { useState } from 'react'
import { useAuth } from '../lib/auth.jsx'

/** The door: one email field, a magic link. An address without an active profile sees "This address has no access". */
export default function Login({ noAccess = false }) {
  const { signIn, signOut, session } = useAuth()
  const [email, setEmail] = useState('')
  const [state, setState] = useState({ status: 'idle' })

  const submit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setState({ status: 'sending' })
    const error = await signIn(email)
    if (error) {
      const m = String(error.message || '')
      const refused = /signups not allowed|not allowed|banned|not found|invalid/i.test(m)
      setState({ status: 'error', message: refused ? 'This address has no access.' : m })
    } else {
      setState({ status: 'sent' })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="rb-card w-full max-w-[420px] p-7">
        <img src="/assets/ravensberg-logo.svg" alt="Ravensberg Consumer Brands" className="h-10 w-auto" />
        <h1 className="mt-5">Project Tracker</h1>
        <div className="rb-rule mt-1.5 mb-4" />
        {noAccess ? (
          <div>
            <p className="font-semibold">This address has no access.</p>
            <p className="rb-caption mt-1">{session?.user?.email}</p>
            <p className="text-[14px] mt-3">Contact Group Sustainability.</p>
            <button className="rb-btn mt-4" onClick={signOut}>
              Try another address
            </button>
          </div>
        ) : state.status === 'sent' ? (
          <div>
            <p className="font-semibold">Check your inbox.</p>
            <p className="text-[14px] mt-1">A login link is on its way to {email.trim().toLowerCase()}. Open it on this device.</p>
            <p className="rb-caption mt-3">If the mail does not arrive, contact Group Sustainability.</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <label className="rb-label" htmlFor="email">
              Work email
            </label>
            <input id="email" type="email" autoComplete="email" className="rb-input" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            {state.status === 'error' && <div className="rb-error mt-2">{state.message}</div>}
            <button type="submit" className="rb-btn rb-btn--primary mt-4 w-full justify-center" disabled={state.status === 'sending'}>
              {state.status === 'sending' ? 'Sending…' : 'Send me a login link'}
            </button>
            <p className="rb-caption mt-4">No password. If the mail does not arrive, contact Group Sustainability.</p>
          </form>
        )}
        <p className="rb-caption text-[12px] mt-6">Ravensberg Consumer Brands | Group Sustainability | Internal</p>
      </div>
    </div>
  )
}
