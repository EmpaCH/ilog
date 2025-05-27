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
            .map((ancestor) => (
              <BreadcrumbItem
                href={`/types/creator?mode=edit&objecttypecode=${ancestor}`}
              >
                {ancestor}
              </BreadcrumbItem>
            ))}
        </Breadcrumbs>
      </CardBody>
    </Card>
  );
};
