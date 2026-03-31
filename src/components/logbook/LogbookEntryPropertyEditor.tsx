import React from "react";
import { Input, Select, SelectItem } from "@heroui/react";
import { LogbookEntryState, LogbookEntryActions } from "./LogbookEntryActions";
import { ComponentListPropertyEditor } from "../object/ComponentListPropertyEditor";
import { LocalPropertyTypeVariants } from "../../apis/propertyType/commonPropertyType";

// The props that are received by the component
interface LogbookEntryPropertyEditorsProps {
  isReadOnly: boolean;
  state: LogbookEntryState;
  dispatch: React.Dispatch<LogbookEntryActions>;
  hiddenPropertyCodes?: string[];
}

export const LogbookEntryPropertyEditor: React.FC<LogbookEntryPropertyEditorsProps> = ({
  isReadOnly,
  state,
  dispatch,
  hiddenPropertyCodes,
}) => {
  // Get properties from the schema, flattening all property groups
  // Filter to only local properties (not references)
  const allProperties = Object.values(state.propertiesSchema)
    .flat()
    .filter((p) => p.type === "local") as LocalPropertyTypeVariants[];

  const getWidgetType = (property: LocalPropertyTypeVariants): string => {
    return (property.metadata?.["widget-type"] as string) || "string";
  };

  const getOptions = (property: LocalPropertyTypeVariants): string[] => {
    const opts = property.metadata?.["options"];
    if (Array.isArray(opts)) {
      return opts;
    }
    // Handle JSON string format from OpenBIS metadata
    if (typeof opts === "string") {
      try {
        const parsed = JSON.parse(opts);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const renderPropertyField = (property: LocalPropertyTypeVariants) => {
    const value = state.propertyValues[property.code] ?? "";
    const widgetType = getWidgetType(property);
    const options = getOptions(property);

    const handleChange = (newValue: string) => {
      dispatch({
        type: "SET_PROPERTY_VALUES",
        payload: { [property.code]: newValue },
      });
    };

    switch (widgetType) {
      case "dropdown":
        return (
          <Select
            disabled={isReadOnly}
            id={property.code}
            label={property.label}
            placeholder={property.description}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className="form-field"
          >
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </Select>
        );

      case "link":
        return (
          <ComponentListPropertyEditor
            isReadOnly={isReadOnly}
            dispatch={(permIds: string[]) => {
              dispatch({
                type: "SET_PROPERTY_VALUES",
                payload: { [property.code]: permIds.length > 0 ? permIds[0] : "" },
              });
            }}
            value={value}
          />
        );

      case "float":
        return (
          <Input
            disabled={isReadOnly}
            id={property.code}
            label={property.label}
            placeholder={property.description}
            type="number"
            inputMode="decimal"
            value={String(value)}
            onChange={(e) => handleChange(e.target.value)}
            className="form-field"
          />
        );

      case "duration":
        return (
          <Input
            disabled={isReadOnly}
            id={property.code}
            label={property.label}
            placeholder="hh:mm:ss"
            value={String(value)}
            onChange={(e) => handleChange(e.target.value)}
            className="form-field"
          />
        );

      case "string":
      default:
        return (
          <Input
            isRequired={property.code === "NAME"}
            disabled={isReadOnly}
            id={property.code}
            label={property.label}
            placeholder={property.description}
            value={String(value)}
            onChange={(e) => handleChange(e.target.value)}
            className="form-field"
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      {allProperties.map((property) => {
        if (hiddenPropertyCodes?.includes(property.code)) {
          return null;
        }
        return (
          <div key={property.code}>
            {renderPropertyField(property)}
          </div>
        );
      })}
    </div>
  );
};
