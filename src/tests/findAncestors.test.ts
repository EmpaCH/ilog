import { expect, test, vi } from "vitest";

import {
  ObjectTypeDefinition,
  findAncestors,
  deriveType,
  checkValidSubType,
} from "../apis/type/commonType";
import { COMPONENT_TYPE_DEFINITION } from "../apis/shared/types";



test("The right ancestors of a derived type are listed", () => {


    const typeChain = ["T1", "T2", "T3"];

    const derivedTypes = typeChain.reduce(
      (acc, current) => {
        return [...acc, deriveType(acc[acc.length - 1], current)];
      },
      [COMPONENT_TYPE_DEFINITION]
    );
    
    console.log("derivedTypes", derivedTypes.slice(1));

    derivedTypes.slice(1).forEach((type, index) => {
      expect(findAncestors(type, derivedTypes)).toEqual(
        derivedTypes[index-1])
    });
    
    })

test("Derived subtype is structurally compatible with parent type", () => {
  const newProperties = {...COMPONENT_TYPE_DEFINITION.propertyTypes, "newGroup": [
    {
      code: "newProperty",
      label: "newProperty",
      description: "newProperty",
      dataType: "VARCHAR",
      type: "local",
      multivalued: false,
      metadata: null,
    }
  ]}
  const newType: ObjectTypeDefinition = {
    ...COMPONENT_TYPE_DEFINITION,
    code: "newType",
    propertyTypes: newProperties,
  };
  console.log("newType", newType, "oldType", COMPONENT_TYPE_DEFINITION, newProperties);
  expect(checkValidSubType(
    COMPONENT_TYPE_DEFINITION,
    newType)).toBeTruthy();
}
)
  