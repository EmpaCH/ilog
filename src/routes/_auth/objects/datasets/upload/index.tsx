import { createFileRoute } from '@tanstack/react-router'
import { DatasetUploadDssPage } from '../../../../../components/datasets/DatasetUploadDssPage'

// Default dataset upload route: DSS
export const Route = createFileRoute('/_auth/objects/datasets/upload/')({
  component: () => <DatasetUploadDssPage />,
})
