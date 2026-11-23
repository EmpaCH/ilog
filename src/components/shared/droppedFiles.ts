export interface DroppedFile {
  file: File;
  // Path relative to the drop, e.g. "data/run1/result.csv" for a file inside a dropped folder "data"
  relativePath: string;
}

/**
 * Get the files of a drop event, including the files inside dropped folders with their folder
 * structure. Must be called synchronously in the drop handler: the browser only gives access to
 * the dropped items during the event.
 */
export function getDroppedFiles(dataTransfer: DataTransfer): Promise<DroppedFile[]> {
  // Read the entries now, before the first await
  const entries = Array.from(dataTransfer.items ?? [])
    .filter((item) => item.kind === "file")
    .map((item) => item.webkitGetAsEntry?.())
    .filter((entry): entry is FileSystemEntry => !!entry);

  if (entries.length === 0) {
    // Browsers without folder support: plain files only
    return Promise.resolve(
      Array.from(dataTransfer.files ?? []).map((file) => ({ file, relativePath: file.name }))
    );
  }
  return Promise.all(entries.map((entry) => readEntry(entry, ""))).then((nested) => nested.flat());
}

async function readEntry(entry: FileSystemEntry, parentPath: string): Promise<DroppedFile[]> {
  const path = parentPath ? `${parentPath}/${entry.name}` : entry.name;
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) =>
      (entry as FileSystemFileEntry).file(resolve, reject)
    );
    return [{ file, relativePath: path }];
  }
  if (entry.isDirectory) {
    const children = await readAllDirectoryEntries((entry as FileSystemDirectoryEntry).createReader());
    const nested = await Promise.all(children.map((child) => readEntry(child, path)));
    return nested.flat();
  }
  return [];
}

// readEntries returns the entries of a folder in batches (e.g. 100 in Chrome) until it returns none
async function readAllDirectoryEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  const all: FileSystemEntry[] = [];
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject)
    );
    if (batch.length === 0) return all;
    all.push(...batch);
  }
}
