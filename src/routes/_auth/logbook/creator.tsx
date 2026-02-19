import { createFileRoute, useLocation } from '@tanstack/react-router'
import { LogbookEntryCreator } from '../../../components/logbook/LogbookEntryCreator'

export const Route = createFileRoute('/_auth/logbook/creator')({
  component: () => {
    const location = useLocation()
    const searchParams = new URLSearchParams(location.search)
    const mode = (searchParams.get('mode') as 'create' | 'edit') || 'create'
    const logbookEntryCode = searchParams.get('logbookEntryCode')

    return LogbookEntryCreator({
      logbookEntryCode: logbookEntryCode || '',
      mode: mode,
    })
  },
})
