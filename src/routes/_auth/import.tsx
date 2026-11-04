import { createFileRoute } from "@tanstack/react-router";
import { useGetCurrentUser } from "../../apis/user/useGetCurrentUser";
import { ImportProgress } from "../../components/auth/ImportProgress";
import { ImportTypesToIlog } from "../../components/auth/ImportTypesToIlog";
import { useState, useContext, useRef } from "react";
import { Button } from "@heroui/react";
import { AuthContext } from "../../context/auth/authContext";
import { useExportImportObjectTypes } from "../../apis/type/useExportImportObjectTypes";

export const Route = createFileRoute("/_auth/import")({
  component: () => {
    const OPENBIS_URL = import.meta.env.VITE_OPENBIS_URL;

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
      return (
        <>
          {OPENBIS_URL && OPENBIS_URL.includes("localhost") ? (
            <>
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
