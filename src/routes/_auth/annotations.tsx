import { createFileRoute } from '@tanstack/react-router'
import Annotations from '../../components/type/Annotations'

export const Route = createFileRoute('/_auth/annotations')({
  component: () => <Annotations />,
})