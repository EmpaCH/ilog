import { createFileRoute, useLocation } from '@tanstack/react-router'
import { ObjectHistory } from '../../../components/object/ObjectHistory'
import { AdminOnly } from '../../../components/shared/AdminOnly'

export const Route = createFileRoute('/_auth/types/history')({
  component: () => {
    const location = useLocation()
    const searchParams = new URLSearchParams(location.search)
    const objectCode = searchParams.get('objectcode')

    return (
      <AdminOnly>
        <ObjectHistory objectCode={objectCode || ''} />
      </AdminOnly>
    )
  },
})
