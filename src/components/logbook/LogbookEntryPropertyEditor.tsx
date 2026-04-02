import React from "react";
import { LogbookEntryState, LogbookEntryActions } from "./LogbookEntryActions";
import { LocalPropertyTypeVariants } from "../../apis/propertyType/commonPropertyType";
import { SpecificPropertyEditor } from "../object/SpecificPropertyEditor";

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
  const allProperties = Object.values(state.propertiesSchema)
    .flat()
    .filter((p) => p.type === "local") as LocalPropertyTypeVariants[];

  return (
    <div className="space-y-4">
      {allProperties.map((property) => {
        if (hiddenPropertyCodes?.includes(property.code)) {
          return null;
        }
        return (
          <div key={property.code} aria-label={property.code} className="mb-4">
            <p style={{ fontWeight: "bold", textAlign: "left" }}>
              {(property.label || property.code).toUpperCase()}
            </p>
            <SpecificPropertyEditor
              propertyDefinition={property}
              propertyValue={state.propertyValues[property.code] ?? ""}
              propertyCode={property.code}
              isReadOnly={isReadOnly}
              onValueChange={(value) => {
                dispatch({
                  type: "SET_PROPERTY_VALUES",
                  payload: { [property.code]: value },
                });
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
