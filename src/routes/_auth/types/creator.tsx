import { createFileRoute } from '@tanstack/react-router'
import { TypeCreator } from '../../../components/type/TypeCreator'
import { INSTRUMENT_TYPE_DEFINITION } from '../../../apis/shared/common'

export const Route = createFileRoute('/_auth/types/creator')({
  component: () => TypeCreator({objectTypeDefinition: INSTRUMENT_TYPE_DEFINITION, type: 'create'}),
})
