import { useMemo, useRef, useState } from 'react'
import { Autocomplete, AutocompleteItem, Button, Input } from '@heroui/react'
import { useGetDataSetTypes } from '../../apis/dataset/useGetDataSetTypes'
import { useUploadDssDataSet } from '../../apis/dataset/useUploadDssDataSet'
import { DatasetTypeItem } from '../../apis/dataset/commonDataset'
import { toErrorInfo } from '../../apis/dataset/helpersDatasetAPI'
import { useGetObjects } from '../../apis/object/useGetObjects'
import { DatasetsSection } from './DatasetsSection'
import { buildSampleAutocompleteItems, SampleAutocompleteItem } from './datasetHelpers'

export function DatasetUploadDssPage() {
  const allObjectsQuery = useGetObjects()
  const dataSetTypesQuery = useGetDataSetTypes()
  const uploadMutation = useUploadDssDataSet()

  const [experimentIdentifier, setExperimentIdentifier] = useState('')
  const [sampleIdentifier, setSampleIdentifier] = useState('')
  const [dataSetTypeCode, setDataSetTypeCode] = useState('ELN_PREVIEW')

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const sampleItems = useMemo(() => buildSampleAutocompleteItems(allObjectsQuery.data ?? []), [allObjectsQuery.data])
  const dataSetTypeItems = dataSetTypesQuery.data ?? []
  const selectedDataSetTypeKey = dataSetTypeItems.some((item) => item.key === dataSetTypeCode.trim())
    ? dataSetTypeCode.trim()
    : null

  const onUpload = () => {
    uploadMutation.reset()
    uploadMutation.mutate({
      experimentIdentifier,
      sampleIdentifier,
      dataSetTypeCode,
      files: fileInputRef.current?.files,
    })
  }

  const uploadError = uploadMutation.isError ? toErrorInfo(uploadMutation.error) : null
  const typeError = dataSetTypesQuery.isError ? toErrorInfo(dataSetTypesQuery.error) : null

  return (
    <div className="flex flex-col gap-6">
      <DatasetsSection />

      <div className="flex flex-col gap-4">
        <h3>Upload file as dataset (DSS)</h3>

        <div className="text-small text-default-600">API used: DSS workspace upload plus dataset registration hook.</div>
        <pre className="whitespace-pre-wrap break-words text-xs text-default-600">
          {[
            'DSS endpoints used by the mutation:',
            '  POST /datastore_server/session_workspace_file_upload',
            '  POST /datastore_server/rmi-data-store-server-v3.json (method=createUploadedDataSet)',
          ].join('\n')}
        </pre>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Experiment"
            placeholder="/SPACE/PROJECT/EXPERIMENT"
            value={experimentIdentifier}
            onValueChange={setExperimentIdentifier}
            description="Optional. Set either Experiment or Sample."
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
              if (selectedItem?.experiment) {
                setExperimentIdentifier(selectedItem.experiment)
              }
            }}
            isDisabled={allObjectsQuery.isLoading || allObjectsQuery.isError}
            allowsCustomValue={false}
            description={allObjectsQuery.isError ? 'Failed to load objects' : 'Selecting an object auto-fills its experiment.'}
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

          <Autocomplete
            label="Dataset type"
            placeholder={dataSetTypesQuery.isLoading ? 'Loading dataset types…' : 'Select a dataset type'}
            items={dataSetTypeItems}
            selectedKey={selectedDataSetTypeKey}
            inputValue={dataSetTypeCode}
            onInputChange={setDataSetTypeCode}
            onSelectionChange={(key) => setDataSetTypeCode(key == null ? '' : String(key))}
            allowsCustomValue={true}
            isDisabled={dataSetTypesQuery.isLoading}
            description={typeError ? `Failed to load dataset types: ${typeError.summary}` : 'Type code used for the uploaded dataset'}
          >
            {(item: DatasetTypeItem) => <AutocompleteItem key={item.key}>{item.code}</AutocompleteItem>}
          </Autocomplete>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-small text-default-600">File</div>
          <input ref={fileInputRef} type="file" />
        </div>

        <div className="flex items-center gap-3">
          <Button color="primary" onPress={onUpload} isLoading={uploadMutation.isPending}>
            Upload
          </Button>
          {uploadMutation.isSuccess && <div className="text-small text-success">Created dataset: {uploadMutation.data}</div>}
          {uploadError && <div className="text-small text-danger">{uploadError.summary}</div>}
        </div>

        {uploadError?.details && (
          <pre className="whitespace-pre-wrap break-words text-xs text-default-600">{uploadError.details}</pre>
        )}
      </div>
    </div>
  )
}