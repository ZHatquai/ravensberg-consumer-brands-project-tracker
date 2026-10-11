// The approval presentation (spec v1.3): one PowerPoint file per project version in the private bucket `presentations`,
// under the key <project id>/presentation.pptx. The rules live in the database (docs/access-matrix.md lines 50 to 62);
// this module holds what the form and the Project page share: the limits the form checks before the upload (the bucket
// checks the same), the key, and the three templates offered for download (static files under /templates/).
export const BUCKET = 'presentations'
export const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
export const MAX_BYTES = 20 * 1024 * 1024
export const MAX_LABEL = '20 MB'
export const ACCEPT = `.pptx,${PPTX_MIME}`
export const SIGNED_URL_SECONDS = 60
export const presentationKey = (projectId) => `${projectId}/presentation.pptx`

export const TEMPLATES = [
  { category: 'Emissions', file: 'ravensberg-project-approval-template-emissions.pptx' },
  { category: 'Water', file: 'ravensberg-project-approval-template-water.pptx' },
  { category: 'Waste', file: 'ravensberg-project-approval-template-waste.pptx' },
]
export const templatePath = (t) => `/templates/${t.file}`

const mb = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`

/** The message the form shows, or null when the file passes: a .pptx by name and type, at most 20 MB. */
export function checkPresentationFile(file) {
  if (!file) return `Attach the approval presentation (.pptx, max ${MAX_LABEL}).`
  if (!/\.pptx$/i.test(file.name)) return 'The presentation must be a PowerPoint file (.pptx).'
  if (file.type && file.type !== PPTX_MIME) return 'The presentation must be a PowerPoint file (.pptx).'
  if (file.size > MAX_BYTES) return `The presentation must be at most ${MAX_LABEL}; this file is ${mb(file.size)}.`
  return null
}

/** The Storage API's errors in the tool's words. */
export function storageMessage(error) {
  const m = error?.message || String(error)
  if (/row-level security|permission denied|42501|not authorized|Unauthorized/i.test(m)) return 'The database refused it: only the owner attaches or replaces a presentation, and only while the project is Potential.'
  if (/maximum allowed size|too large|exceeded/i.test(m)) return `The file is larger than ${MAX_LABEL}.`
  if (/mime type/i.test(m)) return 'Only PowerPoint files (.pptx) are accepted.'
  if (/not found/i.test(m)) return 'No file is stored for this project.'
  return m
}
