import React, { useState, useMemo, useContext } from 'react';
import { useNavigate, Link } from "@tanstack/react-router";
import { useGetIlogObjects } from "../../apis/object/useGetIlogObjects";
import { usePreviewImages } from "../../apis/dataset/useDatasets";
import { AuthContext } from "../../context/auth/authContext";
import openbis from "@openbis/openbis.esm";
import { Accordion, AccordionItem, Button, Card, CardBody, Divider } from "@heroui/react";
import {
  reconstructHistory,
  convertOpenBISPropertyHistoryEntryListToObjectDefinition,
} from "../../apis/object/helpersObjectAPI";
import { GroupedHistory } from "../../apis/object/commonObject";
import { iLogID, instrumentCollectionID } from "../../apis/shared/environment";
import { ObjectPropertyEditor } from "./ObjectPropertyEditor";
import {
  PropertyTypesSchema,
  ObjectTypeDefinition,
  convertOpenBISSampleTypeToObjectTypeDefinition,
} from "../../apis/type/commonType";

interface ObjectHistoryProps {
  objectCode: string;
}

interface DiffEntry {
  property: string;
  oldValue: string | null;
  newValue: string | null;
}

function computeDiff(
  prev: Record<string, any> | null,
  curr: Record<string, any>,
  hiddenCodes: string[],
): DiffEntry[] {
  const changes: DiffEntry[] = [];
  const allKeys = new Set([
    ...Object.keys(curr),
    ...(prev ? Object.keys(prev) : []),
  ]);
  for (const key of allKeys) {
    if (hiddenCodes.includes(key)) continue;
    const oldVal = prev ? (prev[key] ?? null) : null;
    const newVal = curr[key] ?? null;
    const oldStr = Array.isArray(oldVal) ? oldVal.join(', ') : (oldVal ?? '');
    const newStr = Array.isArray(newVal) ? newVal.join(', ') : (newVal ?? '');
    if (oldStr !== newStr) {
      changes.push({ property: key, oldValue: oldStr || null, newValue: newStr || null });
    }
  }
  return changes;
}

function formatValue(val: string | null): string {
  if (val === null || val === '') return '(empty)';
  return val;
}

const DiffHeader: React.FC<{ changes: DiffEntry[]; timestamp: number }> = ({ changes, timestamp }) => {
  const displayDateTime = (ms: number) => {
    const pad = (n: number) => n < 10 ? `0${n}` : n.toString();
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    try {
      const d = new Date(ms);
      return `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    } catch {
      return new Date(ms).toISOString();
    }
  };

  return (
    <div className="w-full">
      <span className="font-bold">{displayDateTime(timestamp)}</span>
      {changes.length > 0 && (
        <div className="mt-2 rounded overflow-hidden border border-default-200 text-xs font-mono">
          <div className="grid grid-cols-2">
            <div className="bg-red-50 border-r border-default-200 px-2 py-1 font-semibold text-red-700">Before</div>
            <div className="bg-green-50 px-2 py-1 font-semibold text-green-700">After</div>
          </div>
          {changes.map((c) => (
            <div key={c.property} className="grid grid-cols-2 border-t border-default-200">
              <div className="bg-red-50 border-r border-default-200 px-2 py-1">
                <span className="text-default-500 mr-1">{c.property}:</span>
                <span className="bg-red-200 text-red-900 rounded px-0.5">{formatValue(c.oldValue)}</span>
              </div>
              <div className="bg-green-50 px-2 py-1">
                <span className="text-default-500 mr-1">{c.property}:</span>
                <span className="bg-green-200 text-green-900 rounded px-0.5">{formatValue(c.newValue)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const ObjectHistory: React.FC<ObjectHistoryProps> = ({ objectCode }) => {
  const allObjectsResult = useGetIlogObjects();
  const { apiFacade } = useContext(AuthContext);
  const navigate = useNavigate();
  const [history, setHistory] = useState<GroupedHistory>({});
  const [sortedTimestamps, setSortedTimestamps] = useState<number[]>([]);
  const [diffsByTimestamp, setDiffsByTimestamp] = useState<Record<string, DiffEntry[]>>({});
  const [collectionType, setCollectionType] = useState<string | null>(null);
  const [objectName, setObjectName] = useState<string | null>(null);

  // Derive permId directly from query data so usePreviewImages hits the cache immediately
  const resolvedSample = allObjectsResult.data?.find(
    (it) => it.getCode().toUpperCase() === objectCode.toUpperCase()
  );
  const derivedPermId = resolvedSample?.getPermId().getPermId() ?? null;

  const sessionToken = (apiFacade as any)?._private?.sessionToken as string | undefined;
  const { data: previewImages } = usePreviewImages(
    derivedPermId ? [derivedPermId] : [],
    sessionToken,
  );
  const previewUrl = derivedPermId ? (previewImages[derivedPermId] ?? null) : null;

  useMemo(() => {
    if (allObjectsResult.status === "success") {
      const openbisSample = allObjectsResult.data?.find(
        (it) => it.getCode().toUpperCase() === objectCode.toUpperCase()
      ) as openbis.Sample;

      if (openbisSample) {
        setCollectionType(openbisSample.getType().getMetaData()?.["collectionType"] ?? null);
        setObjectName(openbisSample.getProperty("NAME") || null);
        const objectHistory = openbisSample.getPropertiesHistory() as openbis.PropertyHistoryEntry[];
        const reconstructedHistory = reconstructHistory(objectHistory);

        const objectTypeTemplate: ObjectTypeDefinition = convertOpenBISSampleTypeToObjectTypeDefinition(
          openbisSample.getType()
        );
        const resolvedTypes = Object.entries(objectTypeTemplate.propertyTypes).map(
          ([group, propertyTypesGroup]) => [group, propertyTypesGroup]
        );
        const schema = Object.fromEntries(resolvedTypes) as PropertyTypesSchema;

        const groupedHistory: GroupedHistory = {};
        for (const timestamp of Object.keys(reconstructedHistory)) {
          const objectDefinition = convertOpenBISPropertyHistoryEntryListToObjectDefinition(
            openbisSample,
            reconstructedHistory[timestamp],
          );
          objectDefinition.propertiesSchema = schema;
          groupedHistory[timestamp] = objectDefinition;
        }

        const timestamps = Object.keys(groupedHistory).map(Number).sort((a, b) => a - b);

        const diffs: Record<string, DiffEntry[]> = {};
        for (let i = 0; i < timestamps.length; i++) {
          const ts = timestamps[i].toString();
          const prevTs = i > 0 ? timestamps[i - 1].toString() : null;
          const prevValues = prevTs ? groupedHistory[prevTs].propertyValues : null;
          diffs[ts] = computeDiff(prevValues, groupedHistory[ts].propertyValues, [iLogID]);
        }

        setHistory(groupedHistory);
        setSortedTimestamps([...timestamps].reverse());
        setDiffsByTimestamp(diffs);
      }
    }
  }, [objectCode, allObjectsResult.status, allObjectsResult.data]);

  const baseTypeName = collectionType === instrumentCollectionID ? "Instrument" : "Component";

  return (
    <>
      <h2>Object History</h2>
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-6 bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1 min-w-[260px] max-w-[25rem]">
            <div className="rounded-lg flex items-center justify-center" style={{ padding: "1rem", minHeight: "10rem" }}>
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={`Preview of ${objectCode}`}
                  className="max-w-full max-h-48 mx-auto rounded-lg shadow-md object-contain"
                />
              ) : (
                <p className="text-sm text-gray-400">No preview image</p>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-[260px] max-w-xl flex flex-col gap-2 justify-center">
            <p className="text-base text-left">
              <span className="font-semibold">Code: </span>
              <Link to="/objects/creator" search={{ mode: "view", objectcode: objectCode }}>
                {objectCode}
              </Link>
            </p>
            <p className="text-base text-left">
              <span className="font-semibold">Type: </span>{baseTypeName}
            </p>
            {objectName && (
              <p className="text-base text-left">
                <span className="font-semibold">Name: </span>{objectName}
              </p>
            )}
          </div>
        </div>
      </div>
      <Divider className="my-4" />
      <Accordion selectionMode="multiple">
        {sortedTimestamps.map((timestamp) => {
          const timestampStr = timestamp.toString();
          const changes = diffsByTimestamp[timestampStr] ?? [];
          return (
            <AccordionItem
              key={timestampStr}
              title={
                <DiffHeader changes={changes} timestamp={timestamp} />
              }
            >
              <Card>
                <CardBody>
                  <ObjectPropertyEditor
                    isReadOnly={true}
                    state={history[timestampStr]}
                    hiddenPropertyCodes={[iLogID]}
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
