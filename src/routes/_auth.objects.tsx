import { createFileRoute } from '@tanstack/react-router'
import { ObjectCreator } from '../object/components/ObjectCreator'

export const Route = createFileRoute('/_auth/objects')({
  component: () => ObjectCreator()
})