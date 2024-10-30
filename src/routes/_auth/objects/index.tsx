import { createFileRoute } from '@tanstack/react-router'
import { ObjectList } from '../../../components/object/ObjectList'

export const Route = createFileRoute('/_auth/objects/')({
  component: () => ObjectList(),
})
