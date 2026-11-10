import { useState } from "react";
import { Button, Checkbox, Input, Radio, RadioGroup } from "@heroui/react";
import { CollectionSelect } from "../shared/CollectionSelect";
import {
  useLogbookCollectionSetting,
  useSetupLogbookCollection,
} from "../../apis/logbook/useLogbookCollection";

const CODE_PATTERN = /^[A-Z0-9_\-.]+$/;

/**
 * Settings section to choose the collection all logbook entries of this openBIS instance are stored in,
 * either an existing collection or a new one created with user-chosen codes. When switching away from
 * a collection that still holds entries, they can be moved to the new collection.
 */
export const LogbookCollectionSettings = () => {
  const setting = useLogbookCollectionSetting();
  const setup = useSetupLogbookCollection();
  const [isEditing, setIsEditing] = useState(false);
  const [mode, setMode] = useState<"existing" | "create">("existing");
  const [existing, setExisting] = useState("");
  const [space, setSpace] = useState("");
  const [project, setProject] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [moveEntries, setMoveEntries] = useState(true);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  if (setting.isLoading) {
    return <p className="text-sm text-gray-500 text-left">Loading...</p>;
  }
  if (setting.isError) {
    return <p className="text-sm text-danger text-left">{setting.error.message}</p>;
  }

  const current = setting.data?.identifier ?? null;
  const isWorking = !!current && !!setting.data?.exists;
  const entryCount = setting.data?.entryCount ?? 0;
  // Without a working collection the form is shown right away
  const showForm = isEditing || !isWorking;
  const canMoveEntries = isWorking && entryCount > 0;

  const isValid = mode === "existing"
    ? existing !== "" && existing !== current
    : [space, project, code].every((c) => CODE_PATTERN.test(c));

  const resetForm = () => {
    setIsEditing(false);
    setExisting("");
    setSpace("");
    setProject("");
    setCode("");
    setName("");
    setMoveEntries(true);
  };

  const onSave = () => {
    setMessage(null);
    setup.mutate(
      {
        setup: mode === "existing" ? { existing } : { create: { space, project, code, name } },
        moveEntriesFrom: canMoveEntries && moveEntries ? current! : undefined,
      },
      {
        onSuccess: ({ collectionIdentifier, movedEntries }) => {
          resetForm();
          setMessage({
            text: `Logbook entries are now stored in ${collectionIdentifier}.` +
              (movedEntries > 0 ? ` ${movedEntries} existing entries were moved there.` : ""),
            isError: false,
          });
        },
        onError: (err) => setMessage({ text: err.message.split(" (Context:")[0], isError: true }),
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
    <div className="flex flex-col gap-3 text-left">
      <h3 className="text-left ">Set Logbook Collection</h3>
      <p className="text-sm text-gray-600">
        All logbook entries created in iLog are stored in one openBIS collection.
        That collection is stored in the ELN settings, which only admins can edit.
      </p>
      <p className="text-sm">
        Current collection:{" "}
        {!current ? (
          <span className="text-warning-600">not set up yet</span>
        ) : isWorking ? (
          <span className="text-success-600 font-medium">{current}</span>
        ) : (
          <span className="text-danger">{current}, not found (deleted, moved or renamed)</span>
        )}
        {isWorking && ` (${entryCount} ${entryCount === 1 ? "entry" : "entries"})`}
      </p>

      {!showForm && (
        <div>
          <Button size="sm" onPress={() => { setMessage(null); setIsEditing(true); }}>
            Change…
          </Button>
        </div>
      )}

      {showForm && (
        <>
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
                Space and Project will be created if they don't yet exist.
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
          {canMoveEntries && (
            <div>
              <Checkbox isSelected={moveEntries} onValueChange={setMoveEntries}>
                Move the {entryCount} existing logbook {entryCount === 1 ? "entry" : "entries"} to the new collection
              </Checkbox>
              {!moveEntries && (
                <p className="text-xs text-warning-600 mt-1">
                  Entries will stay in {current} and will no longer appear in the logbook.
                </p>
              )}
            </div>
          )}
          <div className="flex gap-2">
            {isWorking && (
              <Button variant="light" onPress={resetForm}>
                Cancel
              </Button>
            )}
            <Button
              color="primary"
              onPress={onSave}
              isDisabled={!isValid}
              isLoading={setup.isPending}
            >
              Save
            </Button>
          </div>
        </>
      )}

      {message && (
        <p className={`text-sm ${message.isError ? "text-danger" : "text-success-600"}`}>{message.text}</p>
      )}
    </div>
  );
};
