import { createFileRoute } from "@tanstack/react-router";
import { useGetCurrentUser } from "../../apis/user/useGetCurrentUser";
import { InitComponent } from "../../components/auth/Init";
import { UserInfo } from "../../components/auth/UserInfo";
import { ImportProgress } from "../../components/auth/ImportProgress";
import { ImportTypesToIlog } from "../../components/auth/ImportTypesToIlog";
import { useState, useContext, useRef } from "react";
import { Divider, Button } from "@heroui/react";
import { AuthContext } from "../../context/auth/authContext";
import { useExportImportObjectTypes } from "../../apis/type/useExportImportObjectTypes";
import { useExportImportObjects } from "../../apis/object/useExportImportObjects";

export const Route = createFileRoute("/_auth/home")({
  component: () => {
    const OPENBIS_URL = import.meta.env.VITE_OPENBIS_URL;

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
    const fileInputObjectsRef = useRef<HTMLInputElement>(null);
    const fileInputAdminRef = useRef<HTMLInputElement>(null);
    const { exportObjectTypes, importObjectTypes } =
      useExportImportObjectTypes({ apiFacade });
    const { exportObjects, exportAdministrativeData, importObjects, importAdministrativeData } =
      useExportImportObjects({ apiFacade });
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

    const handleExportObjects = async () => {
      try {
        await exportObjects();
      } catch (err) {
        console.error("Export failed:", err);
      }
    };

    const handleExportAdministrativeData = async () => {
      try {
        await exportAdministrativeData();
      } catch (err) {
        console.error("Export failed:", err);
      }
    };

    const handleImportAdministrativeData = async (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setShowImportModal(true);
      setImportProgress(["Starting import..."]);
      setImportStats(null);

      try {
        const stats = await importAdministrativeData(file, (message: string) => {
          setImportProgress((prev) => [...prev, message]);
        });
        setImportStats(stats);
      } catch (err) {
        setImportProgress((prev) => [
          ...prev,
          `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
        ]);
      } finally {
        if (fileInputAdminRef.current) {
          fileInputAdminRef.current.value = "";
        }
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

    const handleImportObjects = async (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setShowImportModal(true);
      setImportProgress(["Starting import..."]);
      setImportStats(null);

      try {
        const stats = await importObjects(file, (message: string) => {
          setImportProgress((prev) => [...prev, message]);
        });
        setImportStats(stats);
      } catch (err) {
        setImportProgress((prev) => [
          ...prev,
          `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
        ]);
      } finally {
        if (fileInputObjectsRef.current) {
          fileInputObjectsRef.current.value = "";
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
          <h2>Welcome, {currentUser?.[0]?.getUserId?.() ?? "User"} 👋</h2>
          <Divider className="my-8" />
          <UserInfo />
          <Divider className="my-8" />
          {OPENBIS_URL && OPENBIS_URL.includes("localhost") ? (
            <>
              <div className="flex gap-4 items-center justify-center my-8">
                <Button
                  color="primary"
                  onPress={handleInitializeWorkspace}
                  size="lg"
                  isDisabled={showInitModal}
                >
                  Initialize Workspace
                </Button>
              </div>
              <Divider className="my-4" />
              <div className="flex gap-4 items-center justify-center my-8">
                <h3 className="w-full text-center">Types</h3>
              </div>
              <div className="flex gap-4 items-center justify-center my-8">
                <Button
                  onPress={handleExportObjectTypes}
                  size="lg"
                >
                  ⬆️ Export Types
                </Button>
                <Button
                  onPress={() => fileInputRef.current?.click()}
                  size="lg"
                >
                  ⬇️ Import Types
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportObjectTypes}
                  style={{ display: "none" }}
                />
              </div>
              <Divider className="my-4" />
              <div className="flex gap-4 items-center justify-center my-8">
                <h3 className="w-full text-center">Administrative Data</h3>
              </div>
              <div className="flex gap-4 items-center justify-center my-8">
                <Button
                  onPress={handleExportAdministrativeData}
                  size="lg"
                >
                  ⬆️ Export Admin Data
                </Button>
                <Button
                  onPress={() => fileInputAdminRef.current?.click()}
                  size="lg"
                >
                  ⬇️ Import Admin Data
                </Button>
                <input
                  ref={fileInputAdminRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportAdministrativeData}
                  style={{ display: "none" }}
                />
              </div>
              <Divider className="my-4" />
              <div className="flex gap-4 items-center justify-center my-8">
                <h3 className="w-full text-center">Objects</h3>
              </div>
              <div className="flex gap-4 items-center justify-center my-8">
                <Button
                  onPress={handleExportObjects}
                  size="lg"
                >
                  ⬆️ Export Objects
                </Button>
                <Button
                  onPress={() => fileInputObjectsRef.current?.click()}
                  size="lg"
                >
                  ⬇️ Import Objects
                </Button>
                <input
                  ref={fileInputObjectsRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportObjects}
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
            </>
          ) : (
            <ImportTypesToIlog />
          )}
        </>
      );
    }
  },
});
