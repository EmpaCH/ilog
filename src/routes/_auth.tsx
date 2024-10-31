import {
  createFileRoute,
  Link,
  Outlet,
  useRouter,
} from '@tanstack/react-router';
import { useContext, useEffect } from 'react';
import { AuthContext } from '../context/auth/authContext';
import { Button } from '@nextui-org/react';
import { initIlog } from '../apis/shared/init';

export const Route = createFileRoute('/_auth')({
  component: AuthLayout,
})

function AuthLayout() {
  const router = useRouter()
  const navigate = Route.useNavigate()
  const { apiFacade, logout }  = useContext(AuthContext)

  useEffect(() => {
    initIlog(apiFacade);
  }, []);

  useEffect(() => { 
    if (!localStorage.getItem('token')) {
      router.invalidate().finally(() => {
        navigate({ to: '/' })
      })
    }
  });

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout().then(() => {
        router.invalidate().finally(() => {
          navigate({ to: '/' })
        })
      })
    }
  }

  return (
    <>
      <div className="main-menu">
        <div className="main-menu-container">
          <div className="main-menu-buttons">
            <Link to="/home" className="[&.active]:font-bold">
              Home
            </Link>
            {' | '}
            <Link to="/user_info" className="[&.active]:font-bold">
              User Info
            </Link>
            {' | '}
            <Link to="/types" className="[&.active]:font-bold">
              Types
            </Link>
            {' | '}
            <Link to="/objects" className="[&.active]:font-bold">
              Objects
            </Link>
          </div>
        </div>
        <div className="main-menu-container">
          <div className="logout-button">
            <Button
              type="button"
              color="primary"
              variant="ghost"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
      <div className="main-div">
        <Outlet />
      </div>
    </>
  )
}
