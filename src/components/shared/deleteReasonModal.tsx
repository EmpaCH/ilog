import { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
} from "@heroui/react";

export const DeleteReasonModal = (props: {
  isOpen: boolean;
  itemName: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) => {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    props.onConfirm(reason);
    setReason("");
  };

  const handleCancel = () => {
    setReason("");
    props.onCancel();
  };

  return (
    <Modal isOpen={props.isOpen} onOpenChange={(open) => { if (!open) handleCancel(); }}>
      <ModalContent>
        {() => (
          <>
            <ModalHeader>Delete '{props.itemName}'</ModalHeader>
            <ModalBody>
              <p>Please provide a reason for deleting this object.</p>
              <Input
                label="Reason"
                placeholder="Enter deletion reason"
                value={reason}
                onValueChange={setReason}
                autoFocus
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={handleCancel}>
                Cancel
              </Button>
              <Button
                color="danger"
                onPress={handleConfirm}
                isDisabled={reason.trim() === ""}
              >
                Delete
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
