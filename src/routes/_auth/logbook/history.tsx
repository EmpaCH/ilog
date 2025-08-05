import { createFileRoute, useLocation } from '@tanstack/react-router'
import { LogbookEntryHistory } from '../../../components/logbook/LogbookEntryHistory'

export const Route = createFileRoute('/_auth/logbook/history')({
  component: () => {
    const location = useLocation()
    const searchParams = new URLSearchParams(location.search)
    const logbookEntryCode = decodeURIComponent(searchParams.get('logbookentrycode') || '')

    return LogbookEntryHistory({
      logbookEntryCode: logbookEntryCode || '',
    })
  },
})
