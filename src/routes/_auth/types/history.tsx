import { createFileRoute, useLocation } from '@tanstack/react-router'
import { ObjectHistory } from '../../../components/object/ObjectHistory'
import { AdminOnly } from '../../../components/shared/AdminOnly'

export const Route = createFileRoute('/_auth/types/history')({
  component: () => {
    const location = useLocation()
    const searchParams = new URLSearchParams(location.search)
    const objectPermId = searchParams.get('permid')

    return (
      <AdminOnly>
        <ObjectHistory objectPermId={objectPermId || ''} />
      </AdminOnly>
    )
  },
})
