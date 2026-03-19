import { createFileRoute } from '@tanstack/react-router'
import { DatasetUploadAfsPage } from '../../../../../components/datasets/DatasetUploadAfsPage'

export const Route = createFileRoute('/_auth/objects/datasets/upload/afs')({
  component: () => <DatasetUploadAfsPage />,
})
