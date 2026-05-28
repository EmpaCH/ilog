import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { useContext, useEffect } from "react";
import Login from "../components/auth/Login";
import { AuthContext } from "../context/auth/authContext";

export const Route = createLazyFileRoute('/')({
  component: Index,
})

function Index() {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate({ to: '/home' });
    }
  }, [auth.isAuthenticated, navigate]);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="w-full flex items-center justify-between p-4">
        <div className="flex items-end gap-3">
          <img src="/openbis_logo.png" alt="openBIS logo" className="h-10 logo-margin"/>
          <div className="text-2xl font-bold">iLog</div>
        </div>
        <img src="/company_logo.png" alt="Empa logo" className="h-16" />
      </header>
      <div className="flex-grow flex items-center justify-center">
        <Login />
      </div>
    </div>
  )
}
