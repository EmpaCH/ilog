import { useMemo } from "react";
import { Autocomplete, AutocompleteItem } from "@heroui/react";
import { useGetCollections } from "../../apis/collection/useGetCollections";

interface CollectionSelectProps {
  label: string;
  // Collection identifier, e.g. "/SPACE/PROJECT/COLLECTION"
  value: string;
  onChange: (identifier: string) => void;
  isRequired?: boolean;
  isReadOnly?: boolean;
  description?: string;
}

/**
 * Searchable picker over all openBIS collections (experiments) visible to the user.
 * Values are collection identifiers, so they can be stored and used across instances.
 */
export const CollectionSelect: React.FC<CollectionSelectProps> = ({
  label,
  value,
  onChange,
  isRequired,
  isReadOnly,
  description,
}) => {
  const collections = useGetCollections();

  const items = useMemo(
    () =>
      (collections.data ?? [])
        .map((c) => c.getIdentifier().getIdentifier())
        .sort((a, b) => a.localeCompare(b))
        .map((id) => ({ id })),
    [collections.data]
  );

  return (
    <Autocomplete
      isRequired={isRequired}
      isReadOnly={isReadOnly}
      isLoading={collections.isLoading}
      label={label}
      description={description}
      placeholder="Type to search..."
      className="form-field"
      defaultItems={items}
      selectedKey={value || null}
      onSelectionChange={(key) => onChange(key?.toString() ?? "")}
    >
      {(item) => <AutocompleteItem key={item.id}>{item.id}</AutocompleteItem>}
    </Autocomplete>
  );
};
