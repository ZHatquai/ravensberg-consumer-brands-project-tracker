import { useState } from 'react'
import { useAppState } from '../lib/appState.jsx'
import { data, sitesSorted, siteLabel } from '../lib/data.js'
import { fmtDate, ROLE_LABEL } from '../lib/format.js'
import { Eyebrow, Modal } from '../components/ui.jsx'
import { ActionDialog } from '../components/ActionDialog.jsx'
import { adminUsers, anonymisePerson } from '../lib/actions.js'

const ANONYMISED = 'retired user'

/** ESG lead only (the route and the policies enforce it). Create, change and retire go through the admin function; anonymise through its narrow function. */
export default function Users() {
  const { viewer, version, notify } = useAppState()
  const [dialog, setDialog] = useState(null) // { kind: 'add' | 'change' | 'retire' | 'anonymise', user }
  const users = [...data.profiles].sort((a, b) => (a.retired_at ? 1 : 0) - (b.retired_at ? 1 : 0) || a.name.localeCompare(b.name))
  void version
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>
            {users.filter((u) => !u.retired_at).length} active · {users.filter((u) => u.retired_at).length} retired
          </Eyebrow>
          <h1 className="mt-0.5">Users</h1>
          <div className="rb-rule mt-1.5" />
        </div>
        <button className="rb-btn rb-btn--primary" onClick={() => setDialog({ kind: 'add' })}>
          Add user
        </button>
      </div>
      <div className="rb-card overflow-x-auto">
        <table className="rb-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Site</th>
              <th>Status</th>
              <th>Added on</th>
              <th>Retired on</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const me = u.id === viewer.id
              return (
                <tr key={u.id}>
                  <td className="font-semibold whitespace-nowrap">
                    {u.name}
                    {me && <span className="rb-caption font-normal"> (you)</span>}
                  </td>
                  <td>{u.email}</td>
                  <td className="whitespace-nowrap">{ROLE_LABEL[u.role]}</td>
                  <td className="whitespace-nowrap">{u.role === 'site_user' ? siteLabel(u.site_id) : '–'}</td>
                  <td className="whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`rb-dot ${u.retired_at ? 'rb-dot--closed' : 'rb-dot--ok'}`} aria-hidden="true" />
                      {u.retired_at ? 'retired' : 'active'}
                    </span>
                    {!u.retired_at && !u.auth_user_id && <div className="rb-caption text-[12px]">no login yet</div>}
                  </td>
                  <td className="whitespace-nowrap">{fmtDate(u.created_at)}</td>
                  <td className="whitespace-nowrap">
                    {u.retired_at ? fmtDate(u.retired_at) : '–'}
                    {u.retired_comment && <div className="rb-caption text-[12px] max-w-[220px]">{u.retired_comment}</div>}
                  </td>
                  <td className="whitespace-nowrap">
                    {me ? (
                      <span className="rb-caption text-[12px]">your own row: no change here</span>
                    ) : !u.retired_at ? (
                      <span className="inline-flex gap-1">
                        {!u.auth_user_id && (
                          <button className="rb-btn rb-btn--small rb-btn--primary" onClick={() => setDialog({ kind: 'login', user: u })}>
                            Create login
                          </button>
                        )}
                        <button className="rb-btn rb-btn--small" onClick={() => setDialog({ kind: 'change', user: u })}>
                          Change role or site
                        </button>
                        <button className="rb-btn rb-btn--small" onClick={() => setDialog({ kind: 'retire', user: u })}>
                          Retire
                        </button>
                      </span>
                    ) : u.name !== ANONYMISED ? (
                      <button className="rb-btn rb-btn--small" onClick={() => setDialog({ kind: 'anonymise', user: u })}>
                        Anonymise (GDPR)
                      </button>
                    ) : (
                      <span className="rb-caption text-[12px]">anonymised</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="rb-caption text-[12px]">
        Adding a user creates the login identity and the profile together; the person then requests a magic link on the login screen. Role and site change only here, never on the caller's own row. Retiring refuses the next login at once and keeps the name on every record; there is no delete. A GDPR request is actioned as anonymisation of the retired person's name, owner names and attendee mentions; the platform owner then removes the login identity in the Supabase dashboard.
      </p>

      {dialog?.kind === 'add' && <UserDialog onClose={() => setDialog(null)} />}
      {dialog?.kind === 'change' && <UserDialog user={dialog.user} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'login' && (
        <ActionDialog
          title={`Create the login for ${dialog.user.name}`}
          intro={`A login identity is created for ${dialog.user.email} (no password: they request a magic link on the login screen). Name, role and site stay as they are.`}
          confirmLabel="Create login"
          comment={false}
          onConfirm={async () => {
            await adminUsers('create', { name: dialog.user.name, email: dialog.user.email, role: dialog.user.role, site_id: dialog.user.site_id || null })
            notify({ title: `Login created for ${dialog.user.name}`, lines: [dialog.user.email, 'They enter this address on the login page and open the link they receive'] })
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'retire' && (
        <ActionDialog
          title={`Retire ${dialog.user.name}`}
          intro="Their next login is refused at once; their name stays on every project, decision and history row they touched."
          confirmLabel="Retire"
          danger
          onConfirm={async ({ comment }) => {
            await adminUsers('retire', { id: dialog.user.id, comment })
            notify({ title: `${dialog.user.name} retired`, lines: [`Comment: ${comment}`, 'Their next login is refused; their name stays on every record they touched'] })
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'anonymise' && (
        <ActionDialog
          title={`Anonymise ${dialog.user.name}`}
          intro={`On a GDPR erasure request only. The profile's name and email, every project owner "${dialog.user.name}" and every attendee mention become "retired user"; rows, status and figures stay, and the history logs the action. This cannot be undone. Afterwards the platform owner deletes the login identity in the Supabase dashboard.`}
          confirmLabel="Anonymise"
          comment={false}
          danger
          onConfirm={async () => {
            const n = await anonymisePerson(dialog.user.id, dialog.user.name)
            notify({ title: `${dialog.user.name} anonymised`, lines: [`${n} row${n === 1 ? '' : 's'} changed: the profile, the owner names and the attendee mentions now read "retired user"`, 'Next: the platform owner deletes the login identity in the Supabase dashboard'] })
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}

/** Add (no `user`) or change role and site (`user`). The admin function validates every input again and refuses the caller's own row. */
function UserDialog({ user, onClose }) {
  const { notify } = useAppState()
  const [values, setValues] = useState({ name: user?.name || '', email: user?.email || '', role: user?.role || 'site_user', site_id: user?.site_id || '' })
  const [state, setState] = useState({ status: 'idle' })
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }))
  const activeSites = sitesSorted.filter((s) => s.active !== false || s.id === values.site_id)
  const submit = async (e) => {
    e.preventDefault()
    const siteId = values.role === 'site_user' ? values.site_id : null
    if (!user && !values.name.trim()) return setState({ status: 'error', message: 'A name is required.' })
    if (!user && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) return setState({ status: 'error', message: 'A valid email is required.' })
    if (values.role === 'site_user' && !siteId) return setState({ status: 'error', message: 'A site user needs a site.' })
    setState({ status: 'working' })
    try {
      const siteLine = values.role === 'site_user' ? `Site: ${siteLabel(siteId)}` : null
      if (user) {
        await adminUsers('update', { id: user.id, role: values.role, site_id: siteId })
        notify({ title: `${user.name} changed`, lines: [`Role: ${ROLE_LABEL[values.role]}`, siteLine, 'Applies at their next login'] })
      } else {
        await adminUsers('create', { name: values.name.trim(), email: values.email.trim().toLowerCase(), role: values.role, site_id: siteId })
        notify({ title: `${values.name.trim()} added`, lines: [values.email.trim().toLowerCase(), `Role: ${ROLE_LABEL[values.role]}`, siteLine, 'Login identity created: they enter their address on the login page and open the link they receive'] })
      }
      onClose()
    } catch (err) {
      setState({ status: 'error', message: err.message || String(err) })
    }
  }
  return (
    <Modal title={user ? `Change ${user.name}` : 'Add a user'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="rb-label" htmlFor="u-name">
            Name
          </label>
          <input id="u-name" className="rb-input" value={values.name} onChange={set('name')} readOnly={!!user} autoFocus={!user} />
        </div>
        <div>
          <label className="rb-label" htmlFor="u-email">
            Email (the login)
          </label>
          <input id="u-email" type="email" className="rb-input" value={values.email} onChange={set('email')} readOnly={!!user} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="rb-label" htmlFor="u-role">
              Role
            </label>
            <select id="u-role" className="rb-select" value={values.role} onChange={set('role')}>
              {Object.entries(ROLE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          {values.role === 'site_user' && (
            <div>
              <label className="rb-label" htmlFor="u-site">
                Site
              </label>
              <select id="u-site" className="rb-select" value={values.site_id} onChange={set('site_id')}>
                <option value="">Choose…</option>
                {activeSites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {user && <p className="rb-caption text-[12px]">Name and email stay as they are; the change applies at the person's next login.</p>}
        {state.status === 'error' && <div className="rb-error">{state.message}</div>}
        <div className="flex gap-2 pt-1">
          <button type="submit" className="rb-btn rb-btn--primary" disabled={state.status === 'working'}>
            {state.status === 'working' ? 'Working…' : user ? 'Save change' : 'Add user'}
          </button>
          <button type="button" className="rb-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}
