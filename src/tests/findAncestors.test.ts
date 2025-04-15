import { expect, test, vi } from "vitest";

import {
  ObjectTypeDefinition,
  findAncestors,
  deriveType,
} from "../apis/type/commonType";
import { COMPONENT_TYPE_DEFINITION } from "../apis/shared/types";



test("findAncestors", () => {
    const typeChain = ["T1", "T2", "T3"];

    const derivedTypes = typeChain.reduce(
      (acc, current) => {
        return [...acc, deriveType(acc[acc.length - 1], current)];
      },
      [COMPONENT_TYPE_DEFINITION]
    );
    
    const ancestors = derivedTypes.map((type) => {
      return findAncestors(type, derivedTypes.concat([COMPONENT_TYPE_DEFINITION]));
    });

    console.log(ancestors);
    
    })