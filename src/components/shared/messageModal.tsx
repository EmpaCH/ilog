import {Modal, ModalContent, ModalBody} from '@nextui-org/react';

export const MessageModal = (props: {
  message: string,
  isOpen: boolean,
  isSuccess: boolean,
}) => {
  const classNames = {
    base: props.isSuccess ? "bg-[#bbf7d0] text-[#0a0a0a]" : "bg-[#fecaca] text-[#0a0a0a]",
    closeButton: "hover:bg-white/5 active:bg-white/10",
  };

  return (
    <Modal
      isOpen={props.isOpen}
      size="lg"
      placement="bottom"
      backdrop="transparent"
      classNames={classNames}
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
