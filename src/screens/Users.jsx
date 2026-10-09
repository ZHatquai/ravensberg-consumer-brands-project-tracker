import { data, siteLabel } from '../lib/data.js'
import { fmtDate, ROLE_LABEL } from '../lib/format.js'
import { Eyebrow } from '../components/ui.jsx'

export default function Users() {
  const users = [...data.profiles].sort((a, b) => (a.retired_at ? 1 : 0) - (b.retired_at ? 1 : 0) || a.name.localeCompare(b.name))
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>{users.filter((u) => !u.retired_at).length} active · {users.filter((u) => u.retired_at).length} retired</Eyebrow>
          <h1 className="mt-0.5">Users</h1>
          <div className="rb-rule mt-1.5" />
        </div>
        <button className="rb-btn rb-btn--primary" disabled title="Comes with the access phase">
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
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-semibold whitespace-nowrap">{u.name}</td>
                <td>{u.email}</td>
                <td className="whitespace-nowrap">{ROLE_LABEL[u.role]}</td>
                <td className="whitespace-nowrap">{u.role === 'site_user' ? siteLabel(u.site_id) : '–'}</td>
                <td className="whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`rb-dot ${u.retired_at ? 'rb-dot--closed' : 'rb-dot--ok'}`} aria-hidden="true" />
                    {u.retired_at ? 'retired' : 'active'}
                  </span>
                </td>
                <td className="whitespace-nowrap">{fmtDate(u.created_at)}</td>
                <td className="whitespace-nowrap">{u.retired_at ? fmtDate(u.retired_at) : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="rb-caption text-[12px]">Add user, change role or site, and retire (comment required) come with the access phase: the admin function creates the login identity and the profile together. There is no delete. A retired user keeps their name on every record they touched.</p>
    </div>
  )
}
