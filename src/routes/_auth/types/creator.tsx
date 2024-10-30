import { createFileRoute } from '@tanstack/react-router'
import { TypeCreator } from '../../../components/type/TypeCreator'

export const Route = createFileRoute('/_auth/types/creator')({
  component: () => TypeCreator(),
})
