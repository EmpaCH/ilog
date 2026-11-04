import { ReactNode } from "react";
import { useIsAdmin } from "../../apis/user/useIsAdmin";

/**
 * Renders its children only for openBIS instance admins, e.g. for pages that create
 * object types or change the ELN settings. Other users see a short explanation.
 */
export const AdminOnly = ({ children }: { children: ReactNode }) => {
  const isAdmin = useIsAdmin();

  if (isAdmin.isLoading) {
    return <div>Loading...</div>;
  }
  if (!isAdmin.data) {
    return (
      <div className="md-size-div">
        <p className="text-gray-500">This page is only available to admins.</p>
      </div>
    );
  }
  return <>{children}</>;
};
