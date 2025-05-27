import { createFileRoute } from '@tanstack/react-router'
import { LogbookEntryList } from '../../../components/logbook/LogbookEntryList'

export const Route = createFileRoute('/_auth/logbook/')({
  component: () => LogbookEntryList(),
})
  