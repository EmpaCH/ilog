import { createFileRoute } from '@tanstack/react-router'
import { TypeList } from '../../../components/type/TypeList'
import { AdminOnly } from '../../../components/shared/AdminOnly'

export const Route = createFileRoute('/_auth/types/')({
  component: () => <AdminOnly><TypeList /></AdminOnly>,
})
