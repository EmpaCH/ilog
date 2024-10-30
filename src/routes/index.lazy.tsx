import { createLazyFileRoute, Link } from '@tanstack/react-router';
import { Divider } from '@nextui-org/react';

export const Route = createLazyFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <div className="main-div">
      <div className="login-div">
        <h2>Welcome!</h2>
        <Divider className="my-4" />
        <Link to="/login" className="[&.active]:font-bold">
          Log In
        </Link>
      </div>
    </div>
  )
}
