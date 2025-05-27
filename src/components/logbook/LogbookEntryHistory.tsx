import React, { useState, useMemo } from 'react';
import { useNavigate } from "@tanstack/react-router";
import { useGetAllLogbookEntries } from "../../apis/logbook/useGetAllLogbookEntry";
import openbis from "@openbis/openbis.esm";
import { Accordion, AccordionItem, Button, Card, CardBody, Divider } from "@heroui/react";
import { parseZonedDateTime } from "@internationalized/date";
import {
  reconstructHistory,
  convertOpenBISPropertyHistoryEntryListToLogbookEntryDefinition,
} from "../../apis/logbook/helpersLogbookEntryAPI";
import { GroupedHistory } from "../../apis/logbook/commonLogbookEntry";
import { iLogID } from "../../apis/shared/environment";
import { iLogBaseTypesPropertyCode } from "../../apis/shared/types";
import { LogbookEntryPropertyEditor } from "./LogbookEntryPropertyEditor";
import {
  PropertyTypesSchema,
  ObjectTypeDefinition,
  convertOpenBISSampleTypeToObjectTypeDefinition,
} from "../../apis/type/commonType";

interface LogbookEntryHistoryProps {
  logbookEntryCode: string;
}

export const LogbookEntryHistory: React.FC<LogbookEntryHistoryProps> = ({ logbookEntryCode }) => {
  const allEntriesResult = useGetAllLogbookEntries();
  const navigate = useNavigate();
  const [history, setHistory] = useState<GroupedHistory>({});

  useMemo(() => {
    if (allEntriesResult.status === "success") {
      const logbookEntry = allEntriesResult.data?.find(
        (it) => it.getCode().toUpperCase() === logbookEntryCode.toUpperCase()
      ) as openbis.Sample;

      if (logbookEntry) {
        const entryHistory = logbookEntry.getPropertiesHistory() as openbis.PropertyHistoryEntry[];
        const reconstructedHistory = reconstructHistory(entryHistory);

        const groupedHistory: GroupedHistory = {};
        for (const timestamp of Object.keys(reconstructedHistory)) {
          const logbookEntryDefinition = convertOpenBISPropertyHistoryEntryListToLogbookEntryDefinition(
            logbookEntry,
            reconstructedHistory[timestamp],
          );

          const entryTypeTemplate: ObjectTypeDefinition = convertOpenBISSampleTypeToObjectTypeDefinition(
            logbookEntry.getType()
          );
          const resolvedTypes = Object.entries(entryTypeTemplate.propertyTypes).map(
            ([group, propertyTypesGroup]) => {
              return [ group, propertyTypesGroup ];
            }
          );
          logbookEntryDefinition.propertiesSchema = Object.fromEntries(resolvedTypes) as PropertyTypesSchema;
          groupedHistory[timestamp] = logbookEntryDefinition;
        }
        setHistory(groupedHistory);
      }
    }
  }, [logbookEntryCode, allEntriesResult.status, allEntriesResult.data]);

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
      <h2>Logbook Entry History</h2>
      <p><strong>Entry code:</strong> {logbookEntryCode}</p>
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
                  <LogbookEntryPropertyEditor
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
          onPress={() => navigate({ to: "/logbook" })}
        >
          Back
        </Button>
      </div>
    </>
  );
};
