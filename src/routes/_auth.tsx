import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  redirect,
} from "@tanstack/react-router";
import { useContext, useEffect } from "react";
import { AuthContext } from "../context/auth/authContext";
import { Button } from "@heroui/react";

export const Route = createFileRoute("/_auth")({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      // Store the redirect path in sessionStorage
      const currentPath = location.pathname + (location.searchStr || '');
      if (currentPath !== "/" && currentPath !== "") {
        sessionStorage.setItem('redirectAfterLogin', currentPath);
      }
      console.log("User is not authenticated, redirecting and storing path:", sessionStorage.getItem('redirectAfterLogin'));
      throw redirect({ to: "/" });
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  const navigate = useNavigate();
  const { logout, isAuthenticated } = useContext(AuthContext);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/" });
    }
  }, [isAuthenticated, navigate]);

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to logout?")) {
      try {
        await logout();
        sessionStorage.removeItem('redirectAfterLogin');
      } catch (error) {
        console.error('Logout failed:', error);
      }
    }
  };

  return (
    <>
      <div className="main-menu">
        <div className="main-menu-container">
          <div className="main-menu-buttons">
            <Link to="/home" className="[&.active]:font-bold">
              Home
            </Link>
            {" | "}
            <Link to="/types" className="[&.active]:font-bold">
              Types
            </Link>
            {" | "}
            <Link to="/objects" className="[&.active]:font-bold">
              Objects
            </Link>
            {" | "}
            <Link to="/logbook" className="[&.active]:font-bold">
              Logbook
            </Link>
            {" | "}
            <Link to="/trashcan" className="[&.active]:font-bold">
              Trashcan
            </Link>
          </div>
        </div>
        <div className="main-menu-container">
          <div className="logout-button">
            <Button
              type="button"
              color="primary"
              variant="ghost"
              onPress={handleLogout}
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
  );
}
