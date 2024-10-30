import { createFileRoute } from '@tanstack/react-router'
import { TypeList } from '../../../components/type/TypeList'

export const Route = createFileRoute('/_auth/types/')({
  component: () => TypeList(),
})
