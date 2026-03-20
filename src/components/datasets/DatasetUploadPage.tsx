import { DatasetUploadDssPage } from './DatasetUploadDssPage'
import { DatasetUploadAfsPage } from './DatasetUploadAfsPage'

/**
 * Backwards-compat wrapper.
 *
 * Historically the UI exposed a single combined "dataset upload" page.
 * We now have dedicated pages:
 * - `DatasetUploadDssPage` (DSS session-workspace upload)
 * - `DatasetUploadAfsPage` (AFS chunked write + AS registration)
 *
 * Some older routes/imports still reference `DatasetUploadPage`; keep it to
 * avoid churn, and default it to the DSS workflow.
 */
export function DatasetUploadPage() {
  return <DatasetUploadDssPage />
}

/**
 * Named exports so routes can explicitly choose DSS vs AFS.
 */
export { DatasetUploadDssPage, DatasetUploadAfsPage }
