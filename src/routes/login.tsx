import { createFileRoute } from '@tanstack/react-router'
import Login from '../auth/components/Login'

export const Route = createFileRoute('/login')({
  component: () => Login()
})

