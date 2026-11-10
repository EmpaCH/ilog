import { createFileRoute } from '@tanstack/react-router'
import { Trashcan } from '../../components/trashcan/Trashcan'
import { AdminOnly } from '../../components/shared/AdminOnly'

export const Route = createFileRoute('/_auth/trashcan')({
  // Only admins have the rights to restore or permanently delete trashed objects
  component: () => <AdminOnly><Trashcan /></AdminOnly>,
})
