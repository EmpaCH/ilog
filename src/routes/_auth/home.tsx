import { createFileRoute } from "@tanstack/react-router";
import { useGetCurrentUser } from "../../apis/user/useGetCurrentUser";
import { InitComponent } from "../../components/auth/Init";
import { useState } from "react";

export const Route = createFileRoute("/_auth/home")({
  component: () => {
    const [showInitModal, setShowInitModal] = useState(false);
    const {
      data: currentUser,
      isLoading,
      isError,
      error,
      isSuccess,
    } = useGetCurrentUser();
    
    const handleInitializeWorkspace = () => {
      console.log("Initializing workspace...");
      // Use InitComponent which should be a popup - display the initialization progress
      setShowInitModal(true);
    };

    if (isLoading) {
      return <div>Loading...</div>;
    }
    if (isError) {
      return <div>Error: {error?.message}</div>;
    }
    if (isSuccess) {
      console.log("User is logged in, redirecting to /home from home");

      return (
        <>
          <h2>Welcome, {currentUser?.[0]?.getUserId?.() ?? "User"} &#128075;</h2>
            <button 
            onClick={handleInitializeWorkspace}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:hover:bg-gray-400 disabled:cursor-not-allowed"
            disabled={showInitModal} // Disable button if init modal was shown
            >
              Initialize Workspace
            </button>
          {showInitModal && <InitComponent show={showInitModal} />}
        </>
      );
    }
  },
});
