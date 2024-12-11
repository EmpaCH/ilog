import { createFileRoute } from '@tanstack/react-router'
import { TypeCreator } from '../../../components/type/TypeCreator'
import { EMPTY_TYPE_DEFINITION } from '../../../apis/shared/common'

export const Route = createFileRoute('/_auth/types/creator')({
  component: () => TypeCreator({
    objectTypeDefinition: EMPTY_TYPE_DEFINITION,
    type: 'create'
  }),
})
