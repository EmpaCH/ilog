import { createFileRoute } from '@tanstack/react-router'
import Login from '../components/auth/Login'
import { redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      console.log('User is logged in, redirecting to /home')
      throw redirect({
        to: '/home',
      })
    }
  },
  component: () => Login(),
})
