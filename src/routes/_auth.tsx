import { createFileRoute, Link, Outlet, redirect, useRouter } from '@tanstack/react-router'
import { useContext } from 'react'
import { LoginContext } from '../auth/LoginContext'

export const Route = createFileRoute('/_auth')({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      console.log('Redirecting to login')
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }
  },
  component: AuthLayout,
})

function AuthLayout() {
  const router = useRouter()
  const navigate = Route.useNavigate()
  const auth = useContext(LoginContext)

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      auth.logout().then(() => {
        router.invalidate().finally(() => {
          navigate({ to: '/' })
        })
      })
    }
  }

  return (
    <div className="p-2 h-full">
      <h1>{auth.user}</h1>
      <h1>Authenticated Route</h1>
      <p>This route's content is only visible to authenticated users.</p>
      <ul className="py-2 flex gap-2">
        <li>
          <Link
            to="/info"
            className="hover:underline data-[status='active']:font-semibold"
          >
            Dashboard
          </Link>
        </li>
        <li>
          <Link to="/objects" className="hover:underline">
            Objects
          </Link>
        </li>
        <li>
          <button
            type="button"
            className="hover:underline"
            onClick={handleLogout}
          >
            Logout
          </button>
        </li>
      </ul>
      <hr />
      <Outlet />
    </div>
  )
}