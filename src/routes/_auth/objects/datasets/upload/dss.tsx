import { createFileRoute } from '@tanstack/react-router'
import { DatasetUploadDssPage } from '../../../../../components/datasets/DatasetUploadDssPage'

export const Route = createFileRoute('/_auth/objects/datasets/upload/dss')({
  component: () => <DatasetUploadDssPage />,
})
