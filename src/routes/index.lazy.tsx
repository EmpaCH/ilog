import { createLazyFileRoute, Link } from '@tanstack/react-router';
import { Divider } from "@heroui/react";

export const Route = createLazyFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <div className="min-h-screen flex flex-col justify-between">
      <header className="w-full flex items-center justify-between p-4">
        <div className="flex items-end gap-3">
          <img src="/openbis_logo.png" alt="openBIS logo" className="h-10 logo-margin"/>
          <div className="text-2xl font-bold">iLog</div>
        </div>
        <img src="/company_logo.png" alt="Company logo" className="h-16" />
      </header>

      <div className="login-div flex-grow flex items-center justify-center">
        <div>
          <h2>Welcome!</h2>
          <Divider className="my-4" />
          <Link to="/login" className="[&.active]:font-bold">
            Log In
          </Link>
        </div>
      </div>
    </div>
  )
}
