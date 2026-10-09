import { useState } from 'react'
import { useAppState } from '../lib/appState.jsx'
import { siteLabel } from '../lib/data.js'
import { Modal } from './ui.jsx'

/** Review pack: choose the reporting year, Generate, then the download link. ESG lead and CFO only (the button is not shown to a site user). */
export function ReviewPackDialog({ onClose }) {
  const { year: currentYear, years, siteId, viewer, canExportPdf } = useAppState()
  const [year, setYear] = useState(currentYear)
  const [state, setState] = useState({ status: 'idle' })

  if (!canExportPdf) return null

  const generate = async () => {
    setState({ status: 'working' })
    try {
      const { generateReviewPack } = await import('../lib/reviewPack.js') // loaded on demand: jsPDF stays out of the main bundle
      const { blob, fileName } = await generateReviewPack({ year, siteId, generatedBy: viewer.name })
      const url = URL.createObjectURL(blob)
      setState({ status: 'done', url, fileName })
    } catch (err) {
      console.error(err)
      setState({ status: 'error', message: err.message })
    }
  }

  return (
    <Modal title="Export review pack (PDF)" onClose={onClose}>
      <p className="text-[14px]">
        The CFO review pack: four pages (summary, pathways, approved projects, committee decisions) for {siteId ? siteLabel(siteId) : 'the group'}, from the same calculations as the Overview.
      </p>
      <label className="block my-3">
        <span className="rb-label">Reporting year</span>
        <select className="rb-select !w-auto" value={year} onChange={(e) => { setYear(Number(e.target.value)); setState({ status: 'idle' }) }}>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button className="rb-btn rb-btn--primary" onClick={generate} disabled={state.status === 'working'}>
          {state.status === 'working' ? 'Generating…' : 'Generate'}
        </button>
        {state.status === 'done' && (
          <a className="rb-btn no-underline" href={state.url} download={state.fileName}>
            Download {state.fileName}
          </a>
        )}
        <button className="rb-btn" onClick={onClose}>
          Close
        </button>
      </div>
      {state.status === 'error' && <p className="rb-error mt-2">The pack could not be generated: {state.message}</p>}
    </Modal>
  )
}
