import { createFileRoute } from '@tanstack/react-router'
import { DataSetList } from '../../../components/datasets/DataSetList'

export const Route = createFileRoute('/_auth/datasets/')({
  component: () => DataSetList(),
})
  