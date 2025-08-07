import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouter,
  redirect,
} from "@tanstack/react-router";
import { useContext } from "react";
import { AuthContext } from "../context/auth/authContext";
import { Button } from "@heroui/react";

export const Route = createFileRoute("/_auth")({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      // Store the redirect path in sessionStorage
      const currentPath = location.pathname + (location.searchStr || '');
      if (currentPath !== "/login" && currentPath !== "/" && currentPath !== "") {
        sessionStorage.setItem('redirectAfterLogin', currentPath);
      }
      console.log("User is not authenticated, redirecting to /login, storing path:", sessionStorage.getItem('redirectAfterLogin'));
      throw redirect({ to: "/login" });
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  const router = useRouter();
  const navigate = useNavigate();
  const { logout, isLoading } = useContext(AuthContext);

  // Show loading state while checking authentication
  if (isLoading) {
    return <div>Loading...</div>;
  }

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to logout?")) {
      try {
        await logout();
        await router.invalidate();
        sessionStorage.removeItem('redirectAfterLogin');
        navigate({ to: "/" });
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
            <Link to="/user_info" className="[&.active]:font-bold">
              User Info
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
            <Link to="/trashcan" className="[&.active]:font-bold">
              Trashcan
            </Link>
            {" | "}
            <Link to="/logbook" className="[&.active]:font-bold">
              Logbook
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
