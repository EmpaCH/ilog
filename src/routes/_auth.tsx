import {
  createFileRoute,
  Link,
  Navigate,
  Outlet,
  useRouter,
} from "@tanstack/react-router";
import { useContext, useMemo } from "react";
import { AuthContext } from "../context/auth/authContext";
import { INIT_ILOG_KEY, useInitIlog } from "../apis/shared/useInitIlog";
import { Button } from "@heroui/react";
import { InitComponent } from "../components/auth/Init";
import { useGetInit } from "../apis/shared/useGetInit";

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
});

function AuthLayout() {
  const router = useRouter();
  const navigate = Route.useNavigate();
  const { logout, isAuthenticated } = useContext(AuthContext);
  const { status, data } = useGetInit();

  if (!isAuthenticated) {
    return <Navigate router={router} to="/" />;
  }

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      logout().then(() => {
        router.invalidate().finally(() => {
          navigate({ to: "/" });
        });
      });
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
        <InitComponent show={status !== "success"} />
      </div>
    </>
  );
}
