import { createFileRoute } from '@tanstack/react-router';
import Login from '../components/auth/Login';
import { redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/login')({ 
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      // Get the stored redirect path or default to home
      const redirectTo = sessionStorage.getItem('redirectAfterLogin') || '/home';
      // Clear the stored path
      sessionStorage.removeItem('redirectAfterLogin');

      throw redirect({ to: redirectTo });
    }
  },
  component: () => Login(),
});
