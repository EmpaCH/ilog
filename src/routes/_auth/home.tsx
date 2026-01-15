import { createFileRoute } from "@tanstack/react-router";
import { useGetCurrentUser } from "../../apis/user/useGetCurrentUser";
import { InitComponent } from "../../components/auth/Init";
import { UserInfo } from "../../components/auth/UserInfo";
import { ImportProgress } from "../../components/auth/ImportProgress";
import { useState, useContext, useRef } from "react";
import { Divider, Button } from "@heroui/react";
import { AuthContext } from "../../context/auth/authContext";
import { useExportImportObjectTypes } from "../../apis/type/useExportImportObjectTypes";

export const Route = createFileRoute("/_auth/home")({
  component: () => {
    const [showInitModal, setShowInitModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importProgress, setImportProgress] = useState<string[]>([]);
    const [importStats, setImportStats] = useState<{
      success: number;
      skipped: number;
      failed: number;
    } | null>(null);
    const { apiFacade } = useContext(AuthContext);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { exportObjectTypes, importObjectTypes } =
      useExportImportObjectTypes({ apiFacade });
    const {
      data: currentUser,
      isLoading,
      isError,
      error,
      isSuccess,
    } = useGetCurrentUser();
    
    const handleInitializeWorkspace = () => {
      console.log("Initializing workspace...");
      setShowInitModal(true);
    };

    const handleExportObjectTypes = async () => {
      try {
        await exportObjectTypes();
      } catch (err) {
        console.error("Export failed:", err);
      }
    };

    const handleImportObjectTypes = async (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setShowImportModal(true);
      setImportProgress(["Starting import..."]);
      setImportStats(null);

      try {
        const stats = await importObjectTypes(file, (message: string) => {
          setImportProgress((prev) => [...prev, message]);
        });
        setImportStats(stats);
      } catch (err) {
        setImportProgress((prev) => [
          ...prev,
          `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
        ]);
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
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
          <h1>Welcome, {currentUser?.[0]?.getUserId?.() ?? "User"} 👋</h1>
          <div className="flex gap-4 items-center justify-center my-8">
            <Button
              color="primary"
              onPress={handleInitializeWorkspace}
              size="lg"
              isDisabled={showInitModal} // Disable button if init modal was shown
            >
              Initialize Workspace
            </Button>
            <Button
              onPress={handleExportObjectTypes}
              size="lg"
            >
              Export Object Types
            </Button>
            <Button
              onPress={() => fileInputRef.current?.click()}
              size="lg"
            >
              Import Object Types
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportObjectTypes}
              style={{ display: "none" }}
            />
          </div>
          {showInitModal && <InitComponent show={showInitModal} />}
          <ImportProgress
            isOpen={showImportModal}
            onOpenChange={setShowImportModal}
            progress={importProgress}
            stats={importStats}
          />
          <Divider className="my-8" />
          <UserInfo />
        </>
      );
    }
  },
});
