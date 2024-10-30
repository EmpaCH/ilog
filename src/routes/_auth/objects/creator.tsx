import { createFileRoute } from '@tanstack/react-router'
import { ObjectCreator } from '../../../components/object/ObjectCreator'

export const Route = createFileRoute('/_auth/objects/creator')({
  component: () => ObjectCreator(),
})
