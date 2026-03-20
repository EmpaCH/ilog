import { useMemo, useRef, useState } from 'react'
import {
  Autocomplete,
  AutocompleteItem,
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@heroui/react'
import DownloadIcon from '@mui/icons-material/Download'
import {
  AfsListEntry,
  AfsListParams,
} from '../../apis/dataset/commonDataset'
import { toErrorInfo } from '../../apis/dataset/helpersDatasetAPI'
import { useDownloadAfsEntry, useGetAfsEntries, useUploadAfsDataSet } from '../../apis/dataset/useDatasets'
import { useGetObjects } from '../../apis/object/useGetObjects'
import { buildSampleAutocompleteItems, SampleAutocompleteItem } from './datasetHelpers'

function formatDateTime(value?: number) {
  if (!value) return ''

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().replace('T', ' ').slice(0, 19)
}

export function DatasetUploadAfsPage() {
  const allObjectsQuery = useGetObjects()
  const uploadMutation = useUploadAfsDataSet()
  const downloadMutation = useDownloadAfsEntry()

  const [experimentIdentifier, setExperimentIdentifier] = useState('')
  const [sampleIdentifier, setSampleIdentifier] = useState('')
  const [samplePermId, setSamplePermId] = useState('')
  const [afsOwnerText, setAfsOwnerText] = useState('')
  const [afsSourceText, setAfsSourceText] = useState('')
  const [afsListParams, setAfsListParams] = useState<AfsListParams | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const sampleItems = useMemo(() => buildSampleAutocompleteItems(allObjectsQuery.data ?? []), [allObjectsQuery.data])
  const resolvedAfsOwner = afsOwnerText.trim() || samplePermId.trim() || sampleIdentifier.trim() || experimentIdentifier.trim()

  const afsEntriesQuery = useGetAfsEntries(afsListParams)
  const afsEntries = afsEntriesQuery.data ?? []

  const onListAfs = () => {
    downloadMutation.reset()

    const nextParams: AfsListParams = {
      owner: resolvedAfsOwner,
      source: afsSourceText.trim(),
      recursively: true,
    }

    if (!nextParams.owner) {
      setAfsListParams(null)
      return
    }

    const sameParams =
      afsListParams?.owner === nextParams.owner &&
      afsListParams?.source === nextParams.source &&
      afsListParams?.recursively === nextParams.recursively

    if (sameParams) {
      afsEntriesQuery.refetch()
      return
    }

    setAfsListParams(nextParams)
  }

  const onUpload = () => {
    uploadMutation.reset()
    uploadMutation.mutate({
      experimentIdentifier,
      sampleIdentifier,
      samplePermId,
      afsOwnerText,
      file: fileInputRef.current?.files?.[0] ?? null,
    })
  }

  const onDownloadEntry = (entry: AfsListEntry) => {
    if (entry.directory) return

    downloadMutation.reset()
    downloadMutation.mutate({
      owner: afsListParams?.owner ?? '',
      entry,
    })
  }

  const listError = afsEntriesQuery.isError ? toErrorInfo(afsEntriesQuery.error) : null
  const uploadError = uploadMutation.isError ? toErrorInfo(uploadMutation.error) : null
  const downloadError = downloadMutation.isError ? toErrorInfo(downloadMutation.error) : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h3>Upload file to AFS</h3>

        <div className="text-small text-default-600">API used: AFS list, write, move, and read. To list files select a sample first.</div>
        <pre className="whitespace-pre-wrap break-words text-xs text-default-600">
          {[
            'AFS endpoints used by the hooks:',
            '  GET  /afs-server/api?method=list',
            '  POST /afs-server/api?method=write',
            '  POST /afs-server/api?method=read',
            '  POST /afs-server/api (move)',
          ].join('\n')}
        </pre>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Experiment"
            placeholder="/SPACE/PROJECT/EXPERIMENT"
            value={experimentIdentifier}
            onValueChange={setExperimentIdentifier}
            description="Optional. Used as a fallback AFS owner when no sample is selected."
          />

          <Autocomplete
            label="Sample (Object)"
            placeholder={allObjectsQuery.isLoading ? 'Loading objects…' : 'Select an object'}
            items={sampleItems}
            selectedKey={sampleIdentifier || null}
            onSelectionChange={(key) => {
              const nextIdentifier = key == null ? '' : String(key)
              setSampleIdentifier(nextIdentifier)

              const selectedItem = sampleItems.find((item) => item.identifier === nextIdentifier)
              setSamplePermId(selectedItem?.permId ?? '')
              if (selectedItem?.experiment) {
                setExperimentIdentifier(selectedItem.experiment)
              }
            }}
            isDisabled={allObjectsQuery.isLoading || allObjectsQuery.isError}
            allowsCustomValue={false}
            description={allObjectsQuery.isError ? 'Failed to load objects' : 'Selecting an object also stores its permId for AFS ownership fallback.'}
          >
            {(item: SampleAutocompleteItem) => (
              <AutocompleteItem key={item.key} textValue={item.label}>
                <div className="flex flex-col">
                  <div className="text-small">{item.label}</div>
                  <div className="text-tiny text-default-500">{[item.type, item.experiment].filter(Boolean).join(' • ')}</div>
                </div>
              </AutocompleteItem>
            )}
          </Autocomplete>

          <Input
            label="AFS owner override"
            placeholder="Defaults to sample permId, sample identifier, or experiment"
            value={afsOwnerText}
            onValueChange={setAfsOwnerText}
            description={`Resolved owner: ${resolvedAfsOwner || 'none'}`}
          />

          <Input
            label="AFS source"
            placeholder="e.g. / or /folder"
            value={afsSourceText}
            onValueChange={setAfsSourceText}
            description="Folder path used for listing existing AFS files."
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-small text-default-600">File</div>
          <input ref={fileInputRef} type="file" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button color="primary" onPress={onListAfs} isLoading={afsEntriesQuery.isFetching && !!afsListParams}>
            List AFS files
          </Button>
          <Button color="secondary" onPress={onUpload} isLoading={uploadMutation.isPending}>
            Upload to AFS
          </Button>
          {downloadMutation.isSuccess && <div className="text-small text-success">Downloaded {downloadMutation.data.fileName}</div>}
          {uploadMutation.isSuccess && <div className="text-small text-success">File written to {uploadMutation.data.afsPath}</div>}
        </div>

        {uploadError && <div className="text-small text-danger">{uploadError.summary}</div>}
        {uploadError?.details && <pre className="whitespace-pre-wrap break-words text-xs text-default-600">{uploadError.details}</pre>}

        {downloadError && <div className="text-small text-danger">{downloadError.summary}</div>}
        {downloadError?.details && <pre className="whitespace-pre-wrap break-words text-xs text-default-600">{downloadError.details}</pre>}

        {listError && <div className="text-small text-danger">Failed to list AFS entries: {listError.summary}</div>}

        <Table aria-label="AFS files table">
          <TableHeader>
            <TableColumn>PATH</TableColumn>
            <TableColumn>TYPE</TableColumn>
            <TableColumn>SIZE</TableColumn>
            <TableColumn>LAST MODIFIED</TableColumn>
            <TableColumn>DOWNLOAD</TableColumn>
          </TableHeader>
          <TableBody emptyContent={afsEntriesQuery.isLoading ? 'Loading AFS entries…' : 'No AFS entries found'}>
            {afsEntries.map((entry) => {
              const isDownloading = downloadMutation.isPending && downloadMutation.variables?.entry.path === entry.path

              return (
                <TableRow key={entry.path}>
                  <TableCell>{entry.path}</TableCell>
                  <TableCell>{entry.directory ? 'Directory' : 'File'}</TableCell>
                  <TableCell>{entry.size ?? ''}</TableCell>
                  <TableCell>{formatDateTime(entry.lastModified)}</TableCell>
                  <TableCell>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="flat"
                      onPress={() => onDownloadEntry(entry)}
                      isLoading={isDownloading}
                      isDisabled={entry.directory || (downloadMutation.isPending && !isDownloading)}
                      aria-label={`Download ${entry.path}`}
                    >
                      <DownloadIcon fontSize="small" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}