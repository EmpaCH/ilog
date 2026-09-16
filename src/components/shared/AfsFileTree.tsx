import React, { useState } from 'react';
import { AfsListEntry } from '../../apis/dataset/commonDataset';

// ---------------------------------------------------------------------------
// Tree building
// ---------------------------------------------------------------------------

interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  children: TreeNode[];
  entry?: AfsListEntry;
}

function buildTree(entries: AfsListEntry[]): TreeNode[] {
  const root: TreeNode[] = [];
  const nodeMap = new Map<string, TreeNode>();

  // Sort: directories first, then by path
  const sorted = [...entries].sort((a, b) => {
    if (a.directory !== b.directory) return a.directory ? -1 : 1;
    return a.path.localeCompare(b.path);
  });

  for (const entry of sorted) {
    const parts = entry.path.replace(/^\//, '').split('/').filter(Boolean);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const partPath = '/' + parts.slice(0, i + 1).join('/');
      const isLast = i === parts.length - 1;

      let node = nodeMap.get(partPath);
      if (!node) {
        node = {
          name: parts[i],
          path: partPath,
          isDirectory: isLast ? entry.directory : true,
          size: isLast ? entry.size : undefined,
          children: [],
          entry: isLast ? entry : undefined,
        };
        nodeMap.set(partPath, node);
        current.push(node);
      }
      current = node.children;
    }
  }

  return root;
}

/** Collect all file (non-directory) paths under a node, recursively. */
function collectFilePaths(node: TreeNode): string[] {
  if (!node.isDirectory) return [node.path];
  return node.children.flatMap(collectFilePaths);
}

// ---------------------------------------------------------------------------
// TreeNodeRow component
// ---------------------------------------------------------------------------

interface TreeNodeRowProps {
  node: TreeNode;
  depth: number;
  pendingDeletes: string[];
  isEditMode: boolean;
  onDelete: (path: string) => void;
  onUndoDelete: (path: string) => void;
  selectedTargetDir?: string;
  onSelectTargetDir?: (path: string) => void;
}

const TreeNodeRow: React.FC<TreeNodeRowProps> = ({
  node,
  depth,
  pendingDeletes,
  isEditMode,
  onDelete,
  onUndoDelete,
  selectedTargetDir,
  onSelectTargetDir,
}) => {
  const [open, setOpen] = useState(false);
  const isPendingDelete = pendingDeletes.includes(node.path);

  if (node.isDirectory) {
    const allFilePaths = collectFilePaths(node);
    const allPending = allFilePaths.length > 0 && allFilePaths.every((p) => pendingDeletes.includes(p));
    const somePending = allFilePaths.some((p) => pendingDeletes.includes(p));
    const relDirPath = node.path.replace(/^\//, '');
    const isSelectedTarget = onSelectTargetDir !== undefined && selectedTargetDir === relDirPath;

    return (
      <div className={allPending ? 'opacity-60' : undefined}>
        <div
          className={`flex items-center justify-between px-2 py-1 rounded text-sm select-none ${isSelectedTarget ? 'bg-blue-50' : allPending ? 'bg-red-50' : 'hover:bg-gray-100'}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          <div className="flex items-center gap-1 min-w-0 cursor-pointer" onClick={() => setOpen((o) => !o)}>
            <span className="text-gray-400 w-3 shrink-0">{open ? '▾' : '▸'}</span>
            <span className="text-gray-500 mr-1">📁</span>
            <span className="font-medium text-gray-700">{node.name}</span>
          </div>
          <div className="flex items-center gap-2 ml-2 shrink-0">
            {onSelectTargetDir && (
              <button
                type="button"
                onClick={() => onSelectTargetDir(relDirPath)}
                className={`text-xs underline ${isSelectedTarget ? 'text-green-700 font-semibold' : 'text-blue-600 hover:text-blue-800'}`}
              >
                {isSelectedTarget ? '✓ Target' : 'Add here'}
              </button>
            )}
            {isEditMode && (
              allPending ? (
                <button
                  type="button"
                  onClick={() => allFilePaths.forEach((p) => onUndoDelete(p))}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Undo
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => allFilePaths.forEach((p) => onDelete(p))}
                  className={`text-xs underline ${somePending ? 'text-orange-500 hover:text-orange-700' : 'text-red-600 hover:text-red-800'}`}
                >
                  Remove all
                </button>
              )
            )}
          </div>
        </div>
        {open && node.children.map((child) => (
          <TreeNodeRow
            key={child.path}
            node={child}
            depth={depth + 1}
            pendingDeletes={pendingDeletes}
            isEditMode={isEditMode}
            onDelete={onDelete}
            onUndoDelete={onUndoDelete}
            selectedTargetDir={selectedTargetDir}
            onSelectTargetDir={onSelectTargetDir}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between rounded px-2 py-1 text-sm ${isPendingDelete ? 'bg-red-50 opacity-60' : 'bg-gray-50'}`}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      <div className="flex items-center gap-1 min-w-0">
        <span className="text-gray-400 mr-1">📄</span>
        <span className="break-all text-gray-700">{node.name}</span>
      </div>
      <div className="flex items-center gap-2 ml-2 shrink-0">
        {node.size !== undefined && (
          <span className="text-xs text-gray-400">{(node.size / 1024).toFixed(1)} KB</span>
        )}
        {isEditMode && (
          isPendingDelete ? (
            <button
              type="button"
              onClick={() => onUndoDelete(node.path)}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Undo
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onDelete(node.path)}
              className="text-xs text-red-600 hover:text-red-800 underline"
            >
              Remove
            </button>
          )
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface AfsFileTreeProps {
  entries: AfsListEntry[];
  pendingDeletes: string[];
  isEditMode: boolean;
  onDelete: (path: string) => void;
  onUndoDelete: (path: string) => void;
  /** When provided, renders "Add here" controls letting the user pick which folder new uploads should go into. */
  selectedTargetDir?: string;
  onSelectTargetDir?: (path: string) => void;
}

export const AfsFileTree: React.FC<AfsFileTreeProps> = ({
  entries,
  pendingDeletes,
  isEditMode,
  onDelete,
  onUndoDelete,
  selectedTargetDir,
  onSelectTargetDir,
}) => {
  const tree = buildTree(entries);

  if (tree.length === 0) return null;

  return (
    <div className="mb-3 border border-gray-200 rounded-lg overflow-hidden">
      {onSelectTargetDir && (
        <div
          className={`flex items-center justify-between px-2 py-1 text-sm select-none border-b border-gray-100 ${selectedTargetDir === '' ? 'bg-blue-50' : 'hover:bg-gray-100'}`}
        >
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-gray-500 mr-1">📁</span>
            <span className="font-medium text-gray-700">/ (root)</span>
          </div>
          <button
            type="button"
            onClick={() => onSelectTargetDir('')}
            className={`text-xs underline ${selectedTargetDir === '' ? 'text-green-700 font-semibold' : 'text-blue-600 hover:text-blue-800'}`}
          >
            {selectedTargetDir === '' ? '✓ Target' : 'Add here'}
          </button>
        </div>
      )}
      {tree.map((node) => (
        <TreeNodeRow
          key={node.path}
          node={node}
          depth={0}
          pendingDeletes={pendingDeletes}
          isEditMode={isEditMode}
          onDelete={onDelete}
          onUndoDelete={onUndoDelete}
          selectedTargetDir={selectedTargetDir}
          onSelectTargetDir={onSelectTargetDir}
        />
      ))}
    </div>
  );
};
