import { createFileRoute } from '@tanstack/react-router'
import Trashcan from '../../components/trashcan/Trashcan'

export const Route = createFileRoute('/_auth/trashcan')({
  component: () => Trashcan(),
})
