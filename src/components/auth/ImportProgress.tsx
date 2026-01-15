import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";

interface ImportProgressProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  progress: string[];
  stats: { success: number; skipped: number; failed: number } | null;
}

export const ImportProgress = ({
  isOpen,
  onOpenChange,
  progress,
  stats,
}: ImportProgressProps) => {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="3xl">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          Importing Object Types
        </ModalHeader>
        <ModalBody>
          <div className="max-h-64 overflow-y-auto bg-gray-100 p-4 rounded">
            {progress.map((msg, idx) => (
              <div key={idx} className="text-sm font-mono mb-1">
                {msg}
              </div>
            ))}
          </div>
          {stats && (
            <div className="mt-4 p-3 bg-blue-50 rounded">
              <div className="text-sm">
                <p>✅ Imported: {stats.success}</p>
                <p>🚫 Skipped: {stats.skipped}</p>
                <p>❌ Failed: {stats.failed}</p>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            color="primary"
            onPress={() => onOpenChange(false)}
            isDisabled={!stats}
          >
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
