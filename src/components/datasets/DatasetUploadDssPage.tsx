import { useContext, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Autocomplete, AutocompleteItem, Button, Input } from '@heroui/react'
import openbis from '@openbis/openbis.esm'
import { AuthContext } from '../../context/auth/authContext'
import { useGetObjects } from '../../apis/object/useGetObjects'
import { DatasetsSection } from './DatasetsSection'
import { buildSampleAutocompleteItems, generateUploadId, toErrorInfo } from './datasetHelpers'

/**
 * DSS upload page.
 *
 * Uploads file(s) into the DSS session workspace and then registers a dataset
 * via the DSS JSON API (`createUploadedDataSet`).
 */
export function DatasetUploadDssPage() {
  const { apiFacade } = useContext(AuthContext)
  const queryClient = useQueryClient()

  const allObjectsQuery = useGetObjects()

  const [experimentIdentifier, setExperimentIdentifier] = useState('')
  const [sampleIdentifier, setSampleIdentifier] = useState('')
  const [dataSetTypeCode, setDataSetTypeCode] = useState('ELN_PREVIEW')
  const [uploadDataStoreCode, setUploadDataStoreCode] = useState('')

  const [uploadStatus, setUploadStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'working' }
    | { kind: 'ok'; dataSetPermId: string }
    | { kind: 'error'; message: string; details?: string }
  >({ kind: 'idle' })

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  /**
   * Items for the "Sample (Object)" autocomplete.
   *
   * Shared with the AFS page to keep labels/behavior consistent.
   */
  const sampleItems = useMemo(() => {
    return buildSampleAutocompleteItems(allObjectsQuery.data ?? [])
  }, [allObjectsQuery.data])

  const dataSetTypesQuery = useQuery({
    queryKey: ['as', 'searchDataSetTypes'],
    queryFn: async () => {
      const sc = new openbis.DataSetTypeSearchCriteria()
      const fo = new openbis.DataSetTypeFetchOptions()
      fo.from(0)
      fo.count(200)
      const result = await apiFacade.searchDataSetTypes(sc, fo)
      const types = result.getObjects()

      const items = types
        .map((t: any) => {
          const code = typeof t?.getCode === 'function' ? String(t.getCode()) : String(t?.code ?? '')
          if (!code) return null
          return { key: code, code }
        })
        .filter(Boolean) as Array<{ key: string; code: string }>

      items.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
      return items
    },
    staleTime: 60_000,
  })

  const dataSetTypeItems = dataSetTypesQuery.data ?? []
  const selectedDataSetTypeKey = useMemo(() => {
    const code = dataSetTypeCode.trim()
    if (!code) return null
    return dataSetTypeItems.some((t: any) => t?.key === code) ? code : null
  }, [dataSetTypeCode, dataSetTypeItems])

  /**
   * Upload handler for the DSS workflow.
   *
   * Steps:
   * 1) POST file chunks to `/datastore_server/session_workspace_file_upload`
   * 2) Call `createUploadedDataSet` on the DSS JSON API to register the dataset
   */
  const onUpload = async () => {
    setUploadStatus({ kind: 'working' })

    try {
      const input = fileInputRef.current
      const files = input?.files
      if (!files || files.length === 0) {
        setUploadStatus({ kind: 'error', message: 'Please choose a file to upload.' })
        return
      }

      const expId = experimentIdentifier.trim()
      const sampId = sampleIdentifier.trim()
      if (!expId && !sampId) {
        setUploadStatus({ kind: 'error', message: 'Please set an experiment and/or sample identifier.' })
        return
      }

      const sessionToken = (apiFacade as any)?._private?.sessionToken
      if (!sessionToken) {
        throw new Error('Missing openBIS session token (please log in again)')
      }

      const directDssJsonUrl = '/datastore_server/rmi-data-store-server-v3.json'

      /**
       * Uploads a single file to the DSS session workspace.
       *
       * The DSS endpoint expects chunked uploads with byte ranges.
       */
      const uploadFileToSessionWorkspace = async (uploadId: string, file: File) => {
        const chunkSize = 1024 * 1024
        const relativeName = file.webkitRelativePath || file.name
        const filenameParam = encodeURIComponent(`${uploadId}/${relativeName}`)
        const size = file.size

        for (let startByte = 0; startByte < size; startByte += chunkSize) {
          const endByte = Math.min(startByte + chunkSize, size)
          const url =
            `/datastore_server/session_workspace_file_upload` +
            `?sessionID=${encodeURIComponent(sessionToken)}` +
            `&filename=${filenameParam}` +
            `&id=1` +
            `&startByte=${startByte}` +
            `&endByte=${endByte}` +
            `&size=${size}` +
            `&emptyFolder=false`

          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: file.slice(startByte, endByte),
          })
          if (!resp.ok) {
            const body = await resp.text().catch(() => '')
            throw new Error(`DSS upload failed (${relativeName}): HTTP ${resp.status} ${resp.statusText}. ${body}`)
          }
        }
      }

      /**
       * Uploads all selected files (supports folder uploads via webkitRelativePath).
       */
      const uploadFilesToSessionWorkspace = async (uploadId: string, list: FileList) => {
        for (const file of Array.from(list)) {
          await uploadFileToSessionWorkspace(uploadId, file)
        }
      }

      /**
       * Registers the dataset by calling the DSS JSON API directly.
       *
       * We use a direct call (same-origin) to avoid cross-origin issues and to
       * keep this flow independent from the higher-level facade behavior.
       */
      const createUploadedDataSetDirect = async (creation: openbis.UploadedDataSetCreation) => {
        const priv = (apiFacade as any)?._private
        if (!priv?.ajaxRequest) {
          throw new Error('openBIS client cannot access internal ajaxRequest for direct DSS call')
        }

        return priv.ajaxRequest({
          url: directDssJsonUrl,
          data: {
            method: 'createUploadedDataSet',
            params: [sessionToken, creation],
          },
          returnType: { name: 'DataSetPermId' },
        })
      }

      const trimmedTypeCode = dataSetTypeCode.trim()
      if (!trimmedTypeCode) {
        setUploadStatus({ kind: 'error', message: 'Please set a dataset type code.' })
        return
      }

      const uploadId = generateUploadId('upload')

      await uploadFilesToSessionWorkspace(uploadId, files)

      const creation = new openbis.UploadedDataSetCreation()
      creation.setUploadId(uploadId)
      if (expId) {
        creation.setExperimentId(new openbis.ExperimentIdentifier(expId))
      }
      if (sampId) {
        creation.setSampleId(new openbis.SampleIdentifier(sampId))
      }
      creation.setTypeId(new openbis.EntityTypePermId(trimmedTypeCode, openbis.EntityKind.DATA_SET))

      const createdPermId = await createUploadedDataSetDirect(creation)
      const createdPermIdStr =
        typeof (createdPermId as any)?.getPermId === 'function'
          ? String((createdPermId as any).getPermId())
          : String(createdPermId)

      setUploadStatus({ kind: 'ok', dataSetPermId: createdPermIdStr })
      await queryClient.invalidateQueries({ queryKey: ['as', 'searchDataSets'] })
    } catch (e: any) {
      const info = toErrorInfo(e)
      const context = {
        experimentIdentifier: experimentIdentifier.trim() || null,
        sampleIdentifier: sampleIdentifier.trim() || null,
        dataSetTypeCode: dataSetTypeCode.trim(),
        uploadDataStoreCode: uploadDataStoreCode.trim() || null,
      }
      const details = [info.details, '--- context ---', JSON.stringify(context, null, 2)].filter(Boolean).join('\n')

      console.error('DSS dataset upload failed', { error: e, context })
      setUploadStatus({ kind: 'error', message: info.summary || 'Upload failed.', details })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <DatasetsSection />

      <div className="flex flex-col gap-4">
        <h3>Upload file as dataset (DSS)</h3>

        <div className="text-small text-default-600">API used: DSS (workspace upload + createUploadedDataSet)</div>
        <pre className="text-xs text-default-600 whitespace-pre-wrap break-words">
          {[
            'DSS endpoints (same-origin):',
            '  POST /datastore_server/session_workspace_file_upload',
            '  POST /datastore_server/rmi-data-store-server-v3.json (method=createUploadedDataSet)',
          ].join('\n')}
        </pre>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Experiment"
            placeholder="/SPACE/PROJECT/EXPERIMENT"
            value={experimentIdentifier}
            onValueChange={setExperimentIdentifier}
            description="Optional (set either Experiment or Sample)"
          />
          <Autocomplete
            label="Sample (Object)"
            placeholder={allObjectsQuery.isLoading ? 'Loading objects…' : 'Select an object'}
            items={sampleItems}
            selectedKey={sampleIdentifier || null}
            onSelectionChange={(key) => {
              const nextIdentifier = key == null ? '' : String(key)
              setSampleIdentifier(nextIdentifier)

              if (!nextIdentifier) return
              const selected = sampleItems.find((it: any) => it.identifier === nextIdentifier)
              if (selected?.experiment) {
                setExperimentIdentifier(String(selected.experiment))
              }
            }}
            isDisabled={allObjectsQuery.isLoading || allObjectsQuery.isError}
            allowsCustomValue={false}
            description={allObjectsQuery.isError ? 'Failed to load objects' : 'Selecting an object will auto-fill its experiment'}
          >
            {(item: any) => (
              <AutocompleteItem key={item.key} textValue={item.label}>
                <div className="flex flex-col">
                  <div className="text-small">{item.label}</div>
                  <div className="text-tiny text-default-500">{[item.type, item.experiment].filter(Boolean).join(' • ')}</div>
                </div>
              </AutocompleteItem>
            )}
          </Autocomplete>
          <Autocomplete
            label="Dataset type"
            placeholder={dataSetTypesQuery.isLoading ? 'Loading dataset types…' : 'Select a dataset type'}
            items={dataSetTypeItems}
            selectedKey={selectedDataSetTypeKey}
            inputValue={dataSetTypeCode}
            onInputChange={(value) => setDataSetTypeCode(value)}
            onSelectionChange={(value) => setDataSetTypeCode(value?.toString() ?? '')}
            allowsCustomValue={true}
            isDisabled={dataSetTypesQuery.isLoading}
            description={
              dataSetTypesQuery.isError
                ? `Failed to load dataset types: ${toErrorInfo(dataSetTypesQuery.error).summary}`
                : 'Type code used for the uploaded dataset'
            }
          >
            {(type: any) => <AutocompleteItem key={type.key}>{type.code}</AutocompleteItem>}
          </Autocomplete>
        </div>

        <Input
          label="Upload data store (optional)"
          placeholder="e.g. DSS1"
          value={uploadDataStoreCode}
          onValueChange={setUploadDataStoreCode}
          description="Currently not used for same-origin workspace upload; kept for parity/debugging"
        />

        <div className="flex flex-col gap-2">
          <div className="text-small text-default-600">File</div>
          <input ref={fileInputRef} type="file" />
        </div>

        <div className="flex items-center gap-3">
          <Button color="primary" isLoading={uploadStatus.kind === 'working'} onPress={onUpload}>
            Upload
          </Button>
          {uploadStatus.kind === 'ok' && <div className="text-small text-success">Created dataset: {uploadStatus.dataSetPermId}</div>}
          {uploadStatus.kind === 'error' && (
            <div className="flex flex-col gap-2">
              <div className="text-small text-danger">{uploadStatus.message}</div>
              <pre className="text-xs text-default-600 whitespace-pre-wrap break-words">{String(uploadStatus.details ?? '')}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
