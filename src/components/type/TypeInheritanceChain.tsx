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
    <Card
      style={{ marginTop: "15px" }}
    >
      <CardHeader>
        <span>Object type ancestors:</span>
      </CardHeader>
      <CardBody>
        {ancestors.length === 0 ? (<p><i>No ancestors found.</i></p>) : 
        <Breadcrumbs>
          {ancestors
            .filter((el) => el !== undefined)
            .map((ancestor) => (
              <BreadcrumbItem
                key={ancestor}
                href={`/types/creator?mode=edit&objecttypecode=${ancestor}`}
              >
                {ancestor}
              </BreadcrumbItem>
            ))}
        </Breadcrumbs>
        }
      </CardBody>
    </Card>
  );
};
