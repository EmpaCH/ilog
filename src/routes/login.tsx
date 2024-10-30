import { createFileRoute } from '@tanstack/react-router'
import Login from '../components/auth/Login'
import { redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      console.log('User is not logged in')
      throw redirect({
        to: '/home',
      })
    }
  },
  component: () => Login(),
})
