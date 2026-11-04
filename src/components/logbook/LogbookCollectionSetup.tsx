import { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Radio,
  RadioGroup,
} from "@heroui/react";
import { CollectionSelect } from "../shared/CollectionSelect";
import { useSetupLogbookCollection } from "../../apis/logbook/useLogbookCollection";

const CODE_PATTERN = /^[A-Z0-9_\-.]+$/;

/**
 * One-time dialog to choose the collection all logbook entries of this openBIS instance are stored in,
 * either an existing collection or a new one created with user-chosen codes.
 * It closes by itself once the logbook collection query returns the new collection.
 */
export const LogbookCollectionSetup = (props: {
  isOpen: boolean;
}) => {
  const setup = useSetupLogbookCollection();
  const [mode, setMode] = useState<"existing" | "create">("existing");
  const [existing, setExisting] = useState("");
  const [space, setSpace] = useState("");
  const [project, setProject] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const codes = [space, project, code];
  const isValid = mode === "existing"
    ? existing !== ""
    : codes.every((c) => CODE_PATTERN.test(c));

  const onSave = () => {
    setError("");
    setup.mutate(
      mode === "existing" ? { existing } : { create: { space, project, code, name } },
      {
        onError: (err) => setError(err.message.split(" (Context:")[0]),
      },
    );
  };

  const codeInput = (label: string, value: string, onChange: (value: string) => void, placeholder: string) => (
    <Input
      isRequired
      label={label}
      placeholder={placeholder}
      value={value}
      onValueChange={(v) => onChange(v.toUpperCase())}
      isInvalid={value !== "" && !CODE_PATTERN.test(value)}
      errorMessage="Only letters, digits, '_', '-' and '.' are allowed"
    />
  );

  return (
    // Without a logbook collection nothing can be logged, so the dialog can't be dismissed
    <Modal
      isOpen={props.isOpen}
      isDismissable={false}
      hideCloseButton
      isKeyboardDismissDisabled
      size="lg"
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader>Logbook collection</ModalHeader>
            <ModalBody>
              <p className="text-sm text-gray-600">
                All logbook entries of this openBIS instance are stored in one collection.
                It is chosen once and can't be changed afterwards from iLog.
              </p>
              <p className="text-sm text-warning-600">
                Only an openBIS admin has the rights to set this, because it is saved in the ELN settings.
                If you are not an admin, please ask one to open the logbook page and complete this step.
              </p>
              <RadioGroup
                orientation="horizontal"
                value={mode}
                onValueChange={(value) => setMode(value as "existing" | "create")}
              >
                <Radio value="existing">Use existing collection</Radio>
                <Radio value="create">Create new collection</Radio>
              </RadioGroup>
              {mode === "existing" ? (
                <CollectionSelect
                  isRequired
                  label="Collection"
                  value={existing}
                  onChange={setExisting}
                />
              ) : (
                <>
                  <p className="text-xs text-gray-500">
                    Space and project are created if they don't exist yet.
                  </p>
                  {codeInput("Space", space, setSpace, "e.g. MY_LAB")}
                  {codeInput("Project", project, setProject, "e.g. ILOG")}
                  {codeInput("Collection code", code, setCode, "e.g. LOGBOOK")}
                  <Input
                    label="Collection name"
                    placeholder="e.g. Logbook"
                    value={name}
                    onValueChange={setName}
                  />
                </>
              )}
              {error && <p className="text-sm text-danger">{error}</p>}
            </ModalBody>
            <ModalFooter>
              <Button
                color="primary"
                onPress={onSave}
                isDisabled={!isValid}
                isLoading={setup.isPending}
              >
                Save
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
