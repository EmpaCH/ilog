import { describe, expect, test } from "vitest";
import { getDroppedFiles } from "../components/shared/droppedFiles";

// Minimal stand-ins for the browser's file system entries of a drop
const fileEntry = (name: string) => ({
  name,
  isFile: true,
  isDirectory: false,
  file: (resolve: (file: File) => void) => resolve(new File(["x"], name)),
});

// readEntries returns the children in batches, then an empty list
const dirEntry = (name: string, children: object[], batchSize = 2) => ({
  name,
  isFile: false,
  isDirectory: true,
  createReader: () => {
    let position = 0;
    return {
      readEntries: (resolve: (entries: object[]) => void) => {
        const batch = children.slice(position, position + batchSize);
        position += batch.length;
        resolve(batch);
      },
    };
  },
});

const dataTransfer = (entries: object[], files: File[] = []) =>
  ({
    items: entries.map((entry) => ({ kind: "file", webkitGetAsEntry: () => entry })),
    files,
  }) as unknown as DataTransfer;

const paths = async (transfer: DataTransfer) =>
  (await getDroppedFiles(transfer)).map((dropped) => dropped.relativePath);

describe("getDroppedFiles", () => {
  test("returns dropped files with their names", async () => {
    expect(await paths(dataTransfer([fileEntry("a.txt"), fileEntry("b.png")]))).toEqual(["a.txt", "b.png"]);
  });

  test("reads dropped folders with their structure", async () => {
    const folder = dirEntry("data", [fileEntry("x.csv"), dirEntry("run1", [fileEntry("y.csv")])]);
    expect(await paths(dataTransfer([folder, fileEntry("notes.txt")]))).toEqual([
      "data/x.csv",
      "data/run1/y.csv",
      "notes.txt",
    ]);
  });

  test("reads all entries of folders returned in several batches", async () => {
    const folder = dirEntry("many", ["1", "2", "3", "4", "5"].map((n) => fileEntry(`${n}.txt`)), 2);
    expect(await paths(dataTransfer([folder]))).toEqual([
      "many/1.txt",
      "many/2.txt",
      "many/3.txt",
      "many/4.txt",
      "many/5.txt",
    ]);
  });

  test("returns nothing for empty folders", async () => {
    expect(await paths(dataTransfer([dirEntry("empty", [])]))).toEqual([]);
  });

  test("falls back to the plain file list without folder support", async () => {
    const transfer = { items: [], files: [new File(["x"], "plain.txt")] } as unknown as DataTransfer;
    expect(await paths(transfer)).toEqual(["plain.txt"]);
  });
});
