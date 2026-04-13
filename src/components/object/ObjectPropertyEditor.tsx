import React, { useEffect } from "react";
import { Tabs, Tab } from "@mui/material";
import { ObjectCreatorState, ObjectCreatorActions } from "./ObjectActions";
import { SpecificPropertyEditor } from "./SpecificPropertyEditor";
import { LocalPropertyTypeVariants } from "../../apis/propertyType/commonPropertyType";

interface ObjectPropertyEditorsProps {
  state: ObjectCreatorState;
  dispatch?: React.Dispatch<ObjectCreatorActions>;
  hiddenPropertyCodes?: string[];
  currentObjectCode?: string;
  onSelectedComponentsChange?: (propertyCode: string, permIds: string[]) => void;
  currentInstrumentPermId?: string;
  currentSamplePermId?: string;
  isComponent?: boolean;
  isReadOnly?: boolean;
}

export const ObjectPropertyEditor: React.FC<ObjectPropertyEditorsProps> = ({
  state,
  dispatch,
  hiddenPropertyCodes,
  currentObjectCode,
  onSelectedComponentsChange,
  currentInstrumentPermId,
  currentSamplePermId,
  isComponent,
  isReadOnly,
}) => {
  const [selectedTab, setSelectedTab] = React.useState(0);

  useEffect(() => {
    setSelectedTab(0);
  }, [state.type]);

  const handleTabChange = (_event: React.ChangeEvent<{}>, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleValueChange = React.useCallback((propertyCode: string, value: any) => {
    dispatch?.({
      type: "SET_PROPERTY_VALUES",
      payload: {
        [propertyCode]: value,
      },
    });
  }, [dispatch]);

  return (
    <>
      <Tabs value={selectedTab} onChange={handleTabChange}>
        {Object.keys(state.propertiesSchema).map((propertyGroup) => (
          <Tab key={propertyGroup} label={propertyGroup} />
        ))}
      </Tabs>
      {Object.entries(state.propertiesSchema).map(
        ([propertyGroup, properties], index) => (
          <div
            role="tabpanel"
            hidden={selectedTab !== index}
            key={propertyGroup}
            id={`tabpanel-${index}`}
            aria-labelledby={`tab-${index}`}
          >
            {selectedTab === index && (
              <div style={{ marginTop: "1rem"}}>
                {properties
                  .filter((property) => !hiddenPropertyCodes?.includes(property.code))
                  .map((property) => (
                    <div
                      key={property.code}
                      aria-label={property.code}
                      className="mb-4"
                    >
                      <p style={{ fontWeight: "bold", textAlign: "left"}}>
                        {property.code}
                      </p>
                      <SpecificPropertyEditor
                        propertyValue={state.propertyValues[property.code]}
                        propertyDefinition={property as LocalPropertyTypeVariants}
                        onValueChange={(value) => {
                          handleValueChange(property.code, value);
                        }}
                        currentObjectCode={currentObjectCode}
                        propertyCode={property.code}
                        onSelectedComponentsChange={(permIds) => {
                          onSelectedComponentsChange?.(property.code, permIds);
                        }}
                        currentInstrumentPermId={currentInstrumentPermId}
                        currentSamplePermId={currentSamplePermId}
                        isComponent={isComponent}
                        isReadOnly={isReadOnly}
                      />
                    </div>
                  ))}
              </div>
            )}
          </div>
        )
      )}
    </>
  );
};
