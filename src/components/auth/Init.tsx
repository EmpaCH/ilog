import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  Progress,
} from "@heroui/react";

import { useEffect, useState } from "react";
import { ILogProgress, useInitIlog } from "../../apis/shared/useInitIlog";
import { useGetInit } from "../../apis/shared/useGetInit";

export function InitComponent({ show }: { show: boolean }) {
  const init = useInitIlog();
  const [initDone, setInitDone] = useState(false);
  const [progressList, setProgressList] = useState<ILogProgress[]>([]);
  const initStatus = useGetInit();
  const [showModal, setShowModal] = useState(true);
  useEffect(() => {
    setProgressList((old) => [...old, init.message]);
  }, [init.message]);

  if (!initDone) {
    init.mutate();
    setInitDone(true);
  }

  const handleClose = () => {
    setShowModal(false);
  };

  return (
    <>
      <Modal isOpen={show || showModal}>
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            Initializing iLog
          </ModalHeader>
          <ModalBody>
            <Card>
              <CardHeader>
                <h3>Progress</h3>
              </CardHeader>
              <CardBody>
                <p className="text-md">
                  Please wait while we initialize the objects for iLog
                </p>
                <div className="flex flex-col gap-4 w-full">
                  {progressList.length >= 1 ? (
                    progressList.map((progress, index) => (
                      <Alert
                        key={index}
                        title={progress.message}
                        color={
                          progress.type == "success"
                            ? "success"
                            : progress.type == "idle"
                              ? "default"
                              : "danger"
                        }
                      />
                    ))
                  ) : (
                    <></>
                  )}
                </div>
              </CardBody>
            </Card>
            <Button onPress={handleClose}>Close</Button>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
