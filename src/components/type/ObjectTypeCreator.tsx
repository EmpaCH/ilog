import React, { ChangeEvent, useReducer, useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Button,
  Input,
  Textarea,
  Divider,
  Select,
  SelectItem,
  Spinner,
  RadioGroup,
  Radio,
} from "@heroui/react";
import {
  EMPTY_TYPE_DEFINITION,
  COMPONENT_SCHEMA,
  INSTRUMENT_SCHEMA,
  iLogGeneralInfoGroup,
} from "../../apis/shared/common";
import {
  componentCollectionID,
  instrumentCollectionID,
} from "../../apis/shared/environment";
import {
  PropertyTypesSchema,
  ObjectTypeDefinition,
  convertOpenBISSampleTypeToObjectTypeDefinition,
  findAncestors,
  checkValidSubType,
} from "../../apis/type/commonType";
import { LocalPrimitivePropertyType } from "../../apis/propertyType/commonPropertyType";
import { useGetPropertyTypes } from "../../apis/propertyType/useGetPropertyTypes";
import { typeCreatorReducer } from "./TypeActions";
import { GroupedPropertyEditors } from "./GroupedPropertyEditors";
import { GroupedPropertyEditorsEvents } from "./GroupedPropertyEditors";
import { useCreateObjectType } from "../../apis/type/useCreateObjectType";
import { useUpdateObjectType } from "../../apis/type/useUpdateObjectType";
import { useGetAllObjectTypes } from "../../apis/type/useGetAllObjectTypes";
import openbis from "@openbis/openbis.esm";
import "../../index.css";
import { TypeInheritanceChain } from "./TypeInheritanceChain";

// define whether this will be a Type Creator or Editor component
const creatorModes = ["create", "edit", "view"] as const;
type CreatorMode = (typeof creatorModes)[number];
interface TypeCreatorProps {
  mode: CreatorMode;
  objectTypeCode: string;
}

export const ObjectTypeCreator: React.FC<TypeCreatorProps> = ({
  mode,
  objectTypeCode,
}) => {
  const typeCreation = useCreateObjectType();
  const typeUpdate = useUpdateObjectType();
  const allPropertyTypesResult = useGetPropertyTypes();
  // const objectTypeResult = useGetObjectType(objectTypeCode);
  const allObjectTypesResult = useGetAllObjectTypes();
  const navigate = useNavigate();

  const [state, dispatch] = useReducer(typeCreatorReducer, {
    schema: EMPTY_TYPE_DEFINITION,
  });

  const [loading, setLoading] = useState(false);
  const [initial, setInitial] = useState(true);
  const [message, setMessage] = useState("");
  const [showMessage, setShowMessage] = useState(false);
  const [messageColor, setMessageColor] = useState("success-message");
  const [objectBaseType, setObjectBaseType] = useState(EMPTY_TYPE_DEFINITION);
  const [isEditMode, setIsEditMode] = useState(mode === "edit" || mode === "create");

  const getLockedPropertiesSource = () => {
    if ((mode === "edit" || (mode === "view" && isEditMode)) && (!state.schema.baseType || state.schema.baseType === "")) {
      // In edit mode (or view mode with edit enabled) with no parent - lock base type properties (COMPONENT or INSTRUMENT)
      return state.schema.collectionType === instrumentCollectionID 
        ? { propertyTypes: INSTRUMENT_SCHEMA }
        : { propertyTypes: COMPONENT_SCHEMA };
    }
    
    if (mode === "create" && (!objectBaseType.code || objectBaseType === EMPTY_TYPE_DEFINITION)) {
      // In create mode with no parent selected - lock default properties based on collection type
      if (state.schema.collectionType === instrumentCollectionID) {
        return { propertyTypes: INSTRUMENT_SCHEMA };
      } else if (state.schema.collectionType === componentCollectionID) {
        return { propertyTypes: COMPONENT_SCHEMA };
      }
      // If no collection type is selected yet, don't lock anything
      return { propertyTypes: {} };
    }
    
    return objectBaseType;
  };

  const lockedPropertiesSource = getLockedPropertiesSource();
  const lockedPropertyCodes = useMemo(() => {
    return Object.entries(lockedPropertiesSource.propertyTypes)
      .flatMap(([_, assignment]) => assignment.map((el: any) => el.code));
  }, [lockedPropertiesSource, state.schema.collectionType, objectBaseType]);

  const lockedGroups = [...new Set([
    ...Object.keys(lockedPropertiesSource.propertyTypes), 
    "Components", 
    iLogGeneralInfoGroup
  ])];

  const objectTypes = allObjectTypesResult.isSuccess
    ? allObjectTypesResult.data.map((type) =>
        convertOpenBISSampleTypeToObjectTypeDefinition(type)
      )
    : [];

  const filterObjectTypesByCollection = (collection: string) => {
    // This function is kept for the radio button onChange handler
    // The actual filtering is now done by getCurrentFilteredTypes()
  };

  // Get the current filtered types based on the selected collection type
  const getCurrentFilteredTypes = () => {
    if (!state.schema.collectionType) return [];
    return objectTypes.filter((oj) => {
      const matchesCollection = oj.collectionType && oj.collectionType === state.schema.collectionType;
      const isNotCurrentType = mode === "create" || oj.code !== state.schema.code;
      return matchesCollection && isNotCurrentType;
    });
  };

  // Initialize component from query data
  if (
    allPropertyTypesResult.status == "success" &&
    allObjectTypesResult.status == "success" &&
    initial
  ) {
    // Set the object type template
    const openbisSampleType = allObjectTypesResult.data?.find((it) => {
      return it.getCode().toUpperCase() === objectTypeCode.toUpperCase();
    }) as openbis.SampleType;
    const objectTypeTemplate: ObjectTypeDefinition = openbisSampleType
      ? convertOpenBISSampleTypeToObjectTypeDefinition(openbisSampleType)
      : EMPTY_TYPE_DEFINITION;

    dispatch({
      type: "SET_OBJECT_TYPE_TEMPLATE",
      payload: { objecttypetemplate: objectTypeTemplate },
    });

    // Set the property types
    const resolvedTypes = Object.keys(objectTypeTemplate.propertyTypes).map(
      (group) => {
        const propertyTypesGroup = objectTypeTemplate.propertyTypes[group];
        return [
          group,
          propertyTypesGroup.map((propertyType: any) => {
            const apiPropertyType = allPropertyTypesResult.data.find(
              (it) => it.code === propertyType.code
            );

            if (!apiPropertyType) {
              return propertyType;
            }

            const mergedPropertyType: any = {
              ...apiPropertyType,
              multivalued: propertyType.multivalued !== undefined ? Boolean(propertyType.multivalued) : Boolean(apiPropertyType.multivalued),
              description: propertyType.description || apiPropertyType.description,
              label: propertyType.label || apiPropertyType.label,
              // Only include typeId if it's a number
              ...(typeof (apiPropertyType as any).typeId === "number"
                ? { typeId: (apiPropertyType as any).typeId }
                : {}),
            };

            if ((propertyType as any).vocabulary || (apiPropertyType as any).vocabulary) {
              mergedPropertyType.vocabulary = (propertyType as any).vocabulary || (apiPropertyType as any).vocabulary;
            }

            if ((propertyType as any).sampleType || (apiPropertyType as any).sampleType) {
              mergedPropertyType.sampleType = (propertyType as any).sampleType || (apiPropertyType as any).sampleType;
            }

            return mergedPropertyType;
          }),
        ];
      }
    );

    dispatch({
      type: "SET_ALL_PROPERTYTYPES",
      payload: {
        schema: Object.fromEntries(resolvedTypes) as PropertyTypesSchema,
      },
    });

    // In edit or view mode, if the type has a parent, set objectBaseType to the parent
    if ((mode === "edit" || mode === "view") && objectTypeTemplate.baseType) {
      const parentType = objectTypes.find(type => type.code === objectTypeTemplate.baseType);
      if (parentType) {
        setObjectBaseType(parentType);
      }
    }

    if (objectTypeTemplate.collectionType) {
      filterObjectTypesByCollection(objectTypeTemplate.collectionType);
    }
    setInitial(false);
  }

  const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Prevent form submission in view mode
    if (mode === "view" && !isEditMode) {
      return;
    }
    
    setShowMessage(false);
    setLoading(true);

    const ancestors = findAncestors(state.schema, objectTypes);
    const ancestorType = objectTypes.find((type) => type.code === ancestors[0]);
    if (ancestorType) {
      const isValidSubtype = checkValidSubType(ancestorType, state.schema);
      if (!isValidSubtype) {
        setMessage(
          `The base type is not a valid subtype of ${ancestorType?.code}.`
        );
        setMessageColor("error-message");
        setShowMessage(true);
        setLoading(false);
        return;
      }
    }
    const baseType = ancestors[0];

    if (
      baseType === "INSTRUMENT" &&
      state.schema.propertyTypes.Components &&
      state.schema.propertyTypes.Components.length === 0
    ) {
      setMessage("An instrument or a type derived from INSTRUMENT must have at least one component.");
      setMessageColor("error-message");
      setShowMessage(true);
      setLoading(false);
      return;
    }

    if (
      mode === "create" &&
      state.schema.collectionType === instrumentCollectionID &&
      (!state.schema.propertyTypes.Components || 
       state.schema.propertyTypes.Components.length === 0)
    ) {
      setMessage("When creating a new instrument type, you must add at least one property to the COMPONENTS section.");
      setMessageColor("error-message");
      setShowMessage(true);
      setLoading(false);
      return;
    }

    // Clean schema: remove typeId if not a number from all properties
    const cleanSchema = {
      ...state.schema,
      propertyTypes: Object.fromEntries(
        Object.entries(state.schema.propertyTypes).map(([group, props]) => [
          group,
          props.map((prop) => {
            // Create a clean copy without typeId if it's not a number
            const cleanProp = { ...prop };
            if (typeof (cleanProp as any).typeId !== "number") {
              delete (cleanProp as any).typeId;
            }
            return cleanProp;
          }),
        ])
      ),
    };

    if (mode === "edit" || (mode === "view" && isEditMode)) {
      typeUpdate.mutate(
        {
          definition: cleanSchema,
        },
        {
          onError: (err) => {
            setMessage(err.message.split(" (Context:")[0]);
            setMessageColor("error-message");
            setShowMessage(true);
            setLoading(false);
          },
          onSuccess: () => {
            setMessage("Type updated successfully!");
            setMessageColor("success-message");
            setShowMessage(true);
            setLoading(false);
            setTimeout(() => {
              setMessage("");
              setShowMessage(false);
              navigate({ to: "/types" });
            }, 2000);
          },
        }
      );
    } else {
      typeCreation.mutate(
        {
          definition: cleanSchema,
        },
        {
          onError: (err) => {
            setMessage(err.message.split(" (Context:")[0]);
            setMessageColor("error-message");
            setShowMessage(true);
            setLoading(false);
          },
          onSuccess: () => {
            setMessage("Type created successfully!");
            setMessageColor("success-message");
            setShowMessage(true);
            handleClear(2000);
          },
        }
      );
    }
  };

  const onBack = () => {
    navigate({ to: "/types" });
  };

  const handleAddProperty = (propertyGroup: string, propertyCode: string) => {
    // Check if this is an existing property
    const existingProperty = allPropertyTypesResult.data?.find(
      (prop) => prop.code === propertyCode
    );
    let newProp: LocalPrimitivePropertyType;
    if (existingProperty) {
      // Use existing property data
      newProp = {
        code: propertyCode,
        label: existingProperty.label || propertyCode,
        description: existingProperty.description || "",
        dataType: existingProperty.dataType as any,
        type: "local",
        multivalued: existingProperty.multivalued || false,
      };
      // Add vocabulary/sampleType if they exist
      if ((existingProperty as any).vocabulary) {
        (newProp as any).vocabulary = (existingProperty as any).vocabulary;
      }
      if ((existingProperty as any).sampleType) {
        (newProp as any).sampleType = (existingProperty as any).sampleType;
      }
      // Do NOT set typeId: "PREVIEW" or any string!
    } else {
      // Create new property with defaults
      newProp = {
        code: propertyCode,
        label: "New Property",
        description: "New description",
        dataType: "VARCHAR",
        type: "local",
        multivalued: false,
        // Do NOT set typeId: "PREVIEW" or any string!
      } as LocalPrimitivePropertyType;
    }
    // Add the property to the schema
    dispatch({ type: "SET_NEW_PROPERTY", payload: { group: propertyGroup, property: newProp } });
  };

  const handleClear = (ms: number) => {
    if (mode === "edit") {
      setLoading(false);
      setTimeout(() => {
        setMessage("");
        setShowMessage(false);
      }, ms);
    } else {
      dispatch({ type: "CLEAR", payload: {} });
      setObjectBaseType(EMPTY_TYPE_DEFINITION);
      setLoading(false);
      setTimeout(() => {
        setMessage("");
        setShowMessage(false);
      }, ms);
    }
  };

  const handleSelectBaseType = (value: PropertyTypesSchema) => {
    dispatch({ 
      type: "SET_ALL_PROPERTYTYPES", 
      payload: { schema: value } 
    });
  };

  const handleSelectParentType = (value: ChangeEvent<HTMLSelectElement>) => {
    const newTemplate = objectTypes.find((el) => el.code == value.target.value);
    if (newTemplate !== undefined) {
      setObjectBaseType(newTemplate);
    }
  };

  const handlePropertyEditorEvents = (event: GroupedPropertyEditorsEvents) => {
    switch (event.type) {
      case "ADD_PROPERTY":
        handleAddProperty(event.payload.group, event.payload.code);
        break;
      case "EDIT_PROPERTY":
        dispatch({
          type: "CHANGE_PROPERTY",
          payload: {
            group: event.payload.group,
            property: event.payload.property,
          },
        });
        break;
      case "CHANGE_PROPERTY_CODE":
        dispatch({
          type: "CHANGE_PROPERTY_CODE",
          payload: {
            oldCode: event.payload.oldCode,
            newCode: event.payload.newCode,
            group: event.payload.group,
          },
        });
        break;
      case "REMOVE_PROPERTY":
        dispatch({
          type: "REMOVE_PROPERTY_ASSIGNMENT",
          payload: {
            property: event.payload.property,
            group: event.payload.group,
          },
        });
        break;
      case "RENAME_GROUP":
        dispatch({
          type: "RENAME_GROUP",
          payload: {
            oldGroup: event.payload.oldGroup,
            newGroup: event.payload.newGroup,
          },
        });
        break;
      case "ADD_GROUP":
        dispatch({ type: "ADD_GROUP", payload: "newgroup" });
        break;
      case "REMOVE_GROUP":
        dispatch({
          type: "REMOVE_GROUP",
          payload: { group: event.payload.group },
        });
        break;
    }
  };

  // If trying to edit an object, then show a spinner until the object is fetched
  if (initial && mode === "edit") {
    const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        const form = (event.target as HTMLInputElement).form;
        const index = Array.prototype.indexOf.call(form, event.target);
        (form?.elements[index + 1] as HTMLElement)?.focus();
      }
    };

    // If trying to edit an object, then show a spinner until the object is fetched
    if (initial && mode === "edit") {
      return <Spinner />;
    }
  }

  return (
    <div className="md-size-div">
      <h2>{mode === "create" ? "Create Type" : mode === "edit" ? "Edit Type" : "View Type"}</h2>
      <form onSubmit={handleSubmit}>
        <RadioGroup
          isRequired
          isDisabled={mode === "edit" || (mode === "view" && !isEditMode)}
          label="What is the base type of this object type?"
          orientation="horizontal"
          style={{ textAlign: "left", justifyContent: "flex-start", marginBottom: "15px" }}
          value={state.schema.collectionType || ""}
          onValueChange={(value) => {
            dispatch({ type: "SET_COLLECTION_TYPE", payload: value });
            handleSelectBaseType(value === instrumentCollectionID ? INSTRUMENT_SCHEMA : COMPONENT_SCHEMA);
            filterObjectTypesByCollection(value);
          }}
        >
          <Radio value={instrumentCollectionID}>Instrument</Radio>
          <Radio value={componentCollectionID}>Component</Radio>
        </RadioGroup>

        <Select
          label="Does it have a parent?"
          isDisabled={mode === "view" && !isEditMode}
          selectedKeys={state.schema.baseType ? [state.schema.baseType] : []}
          onChange={handleSelectParentType}
        >
          {getCurrentFilteredTypes().map((type) => (
            <SelectItem key={type.code} value={type.code}>
              {type.code}
            </SelectItem>
          ))}
        </Select>

        <TypeInheritanceChain type={state.schema} allTypes={objectTypes} />
        <Divider className="my-4" />

        <Input
          isRequired
          isDisabled={mode === "view" && !isEditMode}
          isReadOnly={mode === "view" && !isEditMode}
          id="code"
          label="Code"
          type="text"
          className="form-field"
          value={state.schema.code ?? ""}
          onValueChange={(value) => {
            dispatch({ type: "SET_CODE", payload: value });
          }}
          onBlur={(event) => {
            if (objectTypeCode !== (event.target as HTMLInputElement).value) {
              const existingType = allObjectTypesResult.data?.find(
                (type) =>
                  type.getCode() === (event.target as HTMLInputElement).value
              );
              if (existingType) {
                const confirmSwitch = window.confirm(
                  "This type already exists. Do you want to switch to edit mode? Note: changes will remain, to get original use reset."
                );
                if (confirmSwitch) {
                  navigate({
                    to: `/types/creator?mode=edit&objecttypecode=${(event.target as HTMLInputElement).value}`,
                  });
                }
              } else if (mode === "edit") {
                const confirmSwitch = window.confirm(
                  "You cannot change the code of an Objecttype. Do you want to switch to create mode?"
                );
                if (confirmSwitch) {
                  navigate({
                    to: `/types/creator?mode=create&objecttypecode=${(event.target as HTMLInputElement).value}`,
                  });
                } else {
                  dispatch({ type: "SET_CODE", payload: objectTypeCode });
                }
              }
            }
          }}
          autoComplete="off"
          list="type-suggestions"
        />
        <datalist id="type-suggestions">
          {allObjectTypesResult.data?.map((type) => (
            <option key={type.getCode()} value={type.getCode()} />
          ))}
        </datalist>
        <Input
          id="prefix"
          isDisabled={mode === "view" && !isEditMode}
          isReadOnly={mode === "view" && !isEditMode}
          label="Prefix"
          placeholder="If left empty then the code's first 4 characters will be used as a prefix"
          type="text"
          className="form-field"
          value={state.schema.generatedCodePrefix ?? ""}
          onValueChange={(value) =>
            dispatch({ type: "SET_PREFIX", payload: value })
          }
        />
        <Textarea
          id="description"
          isReadOnly={mode === "view" && !isEditMode}
          label="Description"
          className="form-field"
          value={state.schema.description ?? ""}
          onValueChange={(value) =>
            dispatch({ type: "SET_DESCRIPTION", payload: value })
          }
        />
        <Divider className="my-4" />

        <GroupedPropertyEditors
          schema={state.schema.propertyTypes}
          lockedPropertyCodes={lockedPropertyCodes}
          onEvent={handlePropertyEditorEvents}
          lockedGroups={lockedGroups}
          mode={mode}
          isViewOnly={mode === "view" && !isEditMode}
          isEditMode={isEditMode}
        />

        <Divider className="my-4" />
        {showMessage && (
          <div style={{ marginBottom: "15px" }} className={messageColor}>
            {message}
          </div>
        )}
        <div className="items-center">
          <Button
            type="button"
            color="default"
            className="mx-2"
            onPress={onBack}
          >
            Back
          </Button>
          {mode === "view" && !isEditMode && (
            <Button
              type="button"
              color="primary"
              className="mx-2"
              onPress={() => setIsEditMode(true)}
            >
              Edit
            </Button>
          )}
          {isEditMode && (
            <>
              <Button
                type="button"
                color="danger"
                className="mx-2"
                onPress={() => {
                  if (mode === "view") {
                    setIsEditMode(false);
                  } else if (mode === "edit") {
                    window.location.reload();
                  } else {
                    handleClear(0);
                  }
                }}
              >
                {mode === "view" ? "Cancel" : mode === "edit" ? "Reset" : "Clear"}
              </Button>
              <Button
                type="submit"
                color="primary"
                className="mx-2"
                isDisabled={mode === "edit" || (mode === "view" && isEditMode) ? typeUpdate.isPending : typeCreation.isPending}
                isLoading={loading}
              >
                {mode === "edit" || (mode === "view" && isEditMode) ? "Update" : "Create"}
              </Button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};
