import { expect, test } from "vitest";

import {
  ObjectTypeDefinition,
  PropertyTypesSchema,
  findAncestors,
  deriveType,
  checkValidSubType,
} from "../apis/type/commonType";
import { COMPONENT_SCHEMA } from "../apis/shared/types";
import { componentCategory } from "../apis/shared/category";

const COMPONENT_TYPE_DEFINITION: ObjectTypeDefinition = {
  code: "COMPONENT",
  generatedCodePrefix: "COMPONENT",
  description: "Component",
  propertyTypes: COMPONENT_SCHEMA,
  category: componentCategory,
};

test("The right ancestors of a derived type are listed", () => {
  const typeChain = ["T1", "T2", "T3"];

  const derivedTypes = typeChain.reduce(
    (acc, current) => [...acc, deriveType(acc[acc.length - 1], current)],
    [COMPONENT_TYPE_DEFINITION]
  );

  // The ancestors are listed from the root type down to the direct base type
  derivedTypes.slice(1).forEach((type, index) => {
    expect(findAncestors(type, derivedTypes)).toEqual(
      derivedTypes.slice(0, index + 1).map((t) => t.code)
    );
  });
});

test("A type without a base type has no ancestors", () => {
  expect(findAncestors(COMPONENT_TYPE_DEFINITION, [COMPONENT_TYPE_DEFINITION])).toEqual([]);
});

test("Derived subtype is structurally compatible with parent type", () => {
  const newProperties: PropertyTypesSchema = {
    ...COMPONENT_TYPE_DEFINITION.propertyTypes,
    newGroup: [
      {
        code: "newProperty",
        label: "newProperty",
        description: "newProperty",
        dataType: "VARCHAR",
        type: "local",
        multivalued: false,
        metadata: null,
      },
    ],
  };
  const newType: ObjectTypeDefinition = {
    ...COMPONENT_TYPE_DEFINITION,
    code: "newType",
    propertyTypes: newProperties,
  };
  expect(checkValidSubType(COMPONENT_TYPE_DEFINITION, newType)).toBeTruthy();
});
