import React, { useState, useMemo } from 'react';
import { useNavigate } from "@tanstack/react-router";
import { useGetObjects } from "../../apis/object/useGetObjects";
import openbis from "@openbis/openbis.esm";
import { Accordion, AccordionItem, Button, Card, CardBody, Divider } from "@heroui/react";
import { parseZonedDateTime } from "@internationalized/date";
import {
  reconstructHistory,
  convertOpenBISPropertyHistoryEntryListToObjectDefinition,
} from "../../apis/object/helpersObjectAPI";
import { GroupedHistory } from "../../apis/object/commonObject";
import { iLogID } from "../../apis/shared/environment";
import { iLogBaseTypesPropertyCode } from "../../apis/shared/types";
import { ObjectPropertyEditor } from "./ObjectPropertyEditor";
import {
  PropertyTypesSchema,
  ObjectTypeDefinition,
  convertOpenBISSampleTypeToObjectTypeDefinition,
} from "../../apis/type/commonType";

interface ObjectHistoryProps {
  objectCode: string;
}

export const ObjectHistory: React.FC<ObjectHistoryProps> = ({ objectCode }) => {
  const allObjectsResult = useGetObjects();
  const navigate = useNavigate();
  const [history, setHistory] = useState<GroupedHistory>({});

  useMemo(() => {
    if (allObjectsResult.status === "success") {
      const openbisSample = allObjectsResult.data?.find(
        (it) => it.getCode().toUpperCase() === objectCode.toUpperCase()
      ) as openbis.Sample;

      if (openbisSample) {
        const objectHistory = openbisSample.getPropertiesHistory() as openbis.PropertyHistoryEntry[];
        const reconstructedHistory = reconstructHistory(objectHistory);

        const groupedHistory: GroupedHistory = {};
        for (const timestamp of Object.keys(reconstructedHistory)) {
          const objectDefinition = convertOpenBISPropertyHistoryEntryListToObjectDefinition(
            openbisSample,
            reconstructedHistory[timestamp],
          );

          const objectTypeTemplate: ObjectTypeDefinition = convertOpenBISSampleTypeToObjectTypeDefinition(
            openbisSample.getType()
          );
          const resolvedTypes = Object.entries(objectTypeTemplate.propertyTypes).map(
            ([group, propertyTypesGroup]) => {
              return [ group, propertyTypesGroup ];
            }
          );
          objectDefinition.propertiesSchema = Object.fromEntries(resolvedTypes) as PropertyTypesSchema;
          groupedHistory[timestamp] = objectDefinition;
        }
        setHistory(groupedHistory);
      }
    }
  }, [objectCode, allObjectsResult.status, allObjectsResult.data]);

  const displayDateTime = (timestamp: string) => {
    const displayNumber = (num: number) => num < 10 ? `0${num}` : num.toString();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const parsedDate = parseZonedDateTime(timestamp);
    return (
      `${displayNumber(parsedDate.day)} ${monthNames[parsedDate.month - 1]} ${parsedDate.year}, ` +
      `${displayNumber(parsedDate.hour)}:${displayNumber(parsedDate.minute)}`
    );
  };

  return (
    <>
      <h2>Object History</h2>
      <p><strong>Object code:</strong> {objectCode}</p>
      <Divider className="my-4" />
      <Accordion
        selectionMode="multiple"
      >
        {Object.keys(history).map((timestamp) => {
          return (
            <AccordionItem
              key={timestamp}
              title={displayDateTime(timestamp)}
            >
              <Card>
                <CardBody>
                  <ObjectPropertyEditor
                    mode="view"
                    state={history[timestamp]}
                    hiddenPropertyCodes={[
                      iLogID,
                      iLogBaseTypesPropertyCode,
                      "VALID_FROM",
                    ]}
                  />
                </CardBody>
              </Card>
            </AccordionItem>
          );
        })}
      </Accordion>
      <Divider className="my-4" />
      <div className="items-center">
        <Button
          type="button"
          color="default"
          className="mx-2"
          onPress={() => navigate({ to: "/objects" })}
        >
          Back
        </Button>
      </div>
    </>
  );
};
