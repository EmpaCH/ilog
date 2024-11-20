import React, { useState } from "react";
import {
  LocalPropertyTypeVariants,
  PropertyType,
  DataType,
  ALL_DATA_TYPES,
} from "../../apis/type/commonType";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Select,
  SelectItem,
  Checkbox,
} from "@nextui-org/react";

type PropertyEditorProps = {
  propertyTypeDefinitions: LocalPropertyTypeVariants;
  locked: boolean;
};

type DataTypeSelectProps = {
  defaultValue: DataType;
  onSelectionChange: (val: DataType) => void;
};

const DataTypeSelect = ({
  defaultValue,
  onSelectionChange,
}: DataTypeSelectProps) => {
  return (
    <Select
      label="Select a data type"
      defaultSelectedKeys={[defaultValue]}
      selectionMode="single"
      onSelectionChange={(selection) =>
        onSelectionChange(selection.currentKey as DataType)
      }
    >
      {ALL_DATA_TYPES.map((type) => {
        return <SelectItem key={type}>{type}</SelectItem>;
      })}
    </Select>
  );
};

export const PropertyEditor = ({
  propertyTypeDefinitions,
  locked,
}: PropertyEditorProps) => {
  const [label, setLabel] = useState(propertyTypeDefinitions.label);
  const [code, setCode] = useState(propertyTypeDefinitions.code);
  const [description, setDescription] = useState(
    propertyTypeDefinitions.description
  );
  const [dataType, setDataType] = useState(propertyTypeDefinitions.dataType);
  const [multivalued, setMultiValues] = useState(
    propertyTypeDefinitions.multivalued
  );
  return (
    <div
      className={`p-4 border rounded ${
        locked ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      <Card>
        <CardHeader>{`Property: ${code}`}</CardHeader>
        <CardBody>
          <form>
            <Input label="Code" defaultValue={code} />

            <Input label="Description" defaultValue={description} />
            <Input label="Label" defaultValue={label} />
            <DataTypeSelect
              defaultValue={propertyTypeDefinitions.dataType}
              onSelectionChange={setDataType}
            />

            {dataType === "CONTROLLEDVOCABULARY" ? (
              <Input label="Vocabulary ID" />
            ) : null}
            {dataType === "OBJECT" ? <Input label="Object type" /> : null}
            <Checkbox defaultChecked={multivalued}>Multivalued</Checkbox>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};
