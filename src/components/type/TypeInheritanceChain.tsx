import React from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Breadcrumbs,
  BreadcrumbItem
} from "@heroui/react";
import { ResolvedObjectTypeDefinition, findAncestors } from "../../apis/type/commonType";

interface TypeInheritanceChainProps {
  type: ResolvedObjectTypeDefinition;
  allTypes: ResolvedObjectTypeDefinition[];
}

// Define a component to display the type inheritance chain
export const TypeInheritanceChain: React.FC<TypeInheritanceChainProps> = ({
  type, allTypes,
}) => {
  const ancestors = findAncestors(type, allTypes);
  return (
    <Card>
      <CardHeader>
        {" "}
        <p>Object type ancestors</p>
      </CardHeader>
      <CardBody>
        <Breadcrumbs>
          {ancestors
            .filter((el) => el !== undefined)
            .map((ancestor, index) => (
              <BreadcrumbItem
                key={`${ancestor}-${index}`} // Combine value + index for uniqueness
                href={`/types/creator?mode=edit&objecttypecode=${encodeURIComponent(ancestor)}`} // URL encode the ancestor
              >
                {ancestor}
              </BreadcrumbItem>
            ))}
        </Breadcrumbs>
      </CardBody>
    </Card>
  );
};
