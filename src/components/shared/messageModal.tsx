import { useEffect } from "react";
import { Modal, ModalContent, ModalBody, useDisclosure } from "@heroui/react";

export const MessageModal = (props: {
  message: string,
  isOpen: boolean,
  isSuccess: boolean,
}) => {
  const classNames = {
    base: props.isSuccess ? "bg-[#bbf7d0] text-[#0a0a0a]" : "bg-[#fecaca] text-[#0a0a0a]",
    closeButton: "hover:bg-white/5 active:bg-white/10",
  };

  const {isOpen, onOpen, onClose, onOpenChange} = useDisclosure();

  useEffect(() => {
    if (props.isOpen) {
      onOpen();
    } else {
      onClose();
    }
  }, [props]);

  return (
    <Modal
      isOpen={isOpen}
      size="lg"
      placement="bottom"
      backdrop="transparent"
      isDismissable={true}
      classNames={classNames}
      onOpenChange={onOpenChange}
    >
      <ModalContent>
        {() => (
          <ModalBody>
            <p>{props.message}</p>
          </ModalBody>
        )}
      </ModalContent>
    </Modal>
  );
}
