import { useMemo } from 'react'
import { useAppState } from '../lib/appState.jsx'
import { data, siteLabel, personName } from '../lib/data.js'
import { registerRows } from '../lib/calculations.js'
import { CSV_COLUMNS, csvRows, toCsv, csvFileName, downloadCsv } from '../lib/csv.js'
import { Modal } from './ui.jsx'

/** Confirms the filters that apply and downloads the CSV. `rows` are the register rows as filtered on screen; without them the whole scope is exported. */
export function ExportCsvDialog({ onClose, filters = {}, rows }) {
  const { siteId, year, isSiteUser, viewer } = useAppState()
  const exportRows = useMemo(() => rows || registerRows(data, { siteId, year }).rows, [rows, siteId, year])
  const fileName = csvFileName({ year, siteId, category: filters.category, status: filters.status })
  const applied = [
    ['Reporting year', String(year)],
    ['Site', siteId ? siteLabel(siteId) : 'All sites and group'],
    ['Category', filters.category || 'All'],
    ['Status', filters.status || 'All'],
    ['Submitted by', filters.submittedBy ? personName(filters.submittedBy) : 'Anyone'],
  ]
  const download = () => {
    downloadCsv(fileName, toCsv(CSV_COLUMNS, csvRows(exportRows)))
    onClose()
  }
  return (
    <Modal title="Export CSV" onClose={onClose}>
      <p className="text-[14px]">The register exactly as filtered on screen, one row per project, {CSV_COLUMNS.length} columns.</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[13px] my-3">
        {applied.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="rb-caption">{k}</dt>
            <dd className="font-semibold">{v}</dd>
          </div>
        ))}
        <dt className="rb-caption">Rows</dt>
        <dd className="font-semibold">{exportRows.length}</dd>
        <dt className="rb-caption">File</dt>
        <dd className="font-semibold break-all">{fileName}</dd>
      </dl>
      {isSiteUser && <p className="rb-caption text-[12px] mb-3">Your file holds only {siteLabel(viewer.site_id)}.</p>}
      <div className="flex gap-2">
        <button className="rb-btn rb-btn--primary" onClick={download}>
          Download
        </button>
        <button className="rb-btn" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  )
}
