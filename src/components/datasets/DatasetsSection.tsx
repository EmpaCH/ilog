import { useState } from 'react'
import {
  Button,
  Input,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@heroui/react'
import DownloadIcon from '@mui/icons-material/Download'
import { useDownloadDataSetFile, useGetDataStores, useSearchDataSets } from '../../apis/dataset/useDatasets'
import { DataSetSearchParams, DatasetFileListingMode } from '../../apis/dataset/commonDataset'
import { toErrorInfo } from '../../apis/dataset/helpersDatasetAPI'

const ROWS_PER_PAGE = 20

function formatDateTime(value?: number) {
  if (!value) return ''

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().replace('T', ' ').slice(0, 19)
}

const emptyFilters = (): DataSetSearchParams => ({
  page: 1,
  rowsPerPage: ROWS_PER_PAGE,
  dataStoreCodesText: '',
  dataSetCodesText: '',
  dataSetTypeCodesText: '',
  sampleFilterIdentifiersText: '',
})

export function DatasetsSection({ fileListingMode = 'dss' }: { fileListingMode?: DatasetFileListingMode }) {
  const [filters, setFilters] = useState<DataSetSearchParams>(emptyFilters)

  const dataStoresQuery = useGetDataStores()
  const dataSetsQuery = useSearchDataSets(filters)
  const downloadMutation = useDownloadDataSetFile(fileListingMode)

  const rows = dataSetsQuery.data?.rows ?? []
  const totalCount = dataSetsQuery.data?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / ROWS_PER_PAGE))
  const availableStoreCodes = dataStoresQuery.data?.codes.join(', ') ?? ''

  const updateFilter = (key: keyof DataSetSearchParams, value: string) => {
    downloadMutation.reset()
    setFilters((current) => ({ ...current, page: 1, [key]: value }))
  }

  const onSearch = () => {
    downloadMutation.reset()
    if (filters.page !== 1) {
      setFilters((current) => ({ ...current, page: 1 }))
      return
    }
    dataSetsQuery.refetch()
  }

  const onReset = () => {
    downloadMutation.reset()
    setFilters(emptyFilters())
  }

  const onPageChange = (page: number) => {
    downloadMutation.reset()
    setFilters((current) => ({ ...current, page }))
  }

  const onDownload = (row: (typeof rows)[number]) => {
    downloadMutation.reset()
    downloadMutation.mutate(row)
  }

  const dataSetError = dataSetsQuery.isError ? toErrorInfo(dataSetsQuery.error) : null
  const dataStoreError = dataStoresQuery.isError ? toErrorInfo(dataStoresQuery.error) : null
  const downloadError = downloadMutation.isError ? toErrorInfo(downloadMutation.error) : null

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Input
          label="Data stores"
          placeholder="e.g. DSS1, DSS2"
          value={filters.dataStoreCodesText}
          onValueChange={(value) => updateFilter('dataStoreCodesText', value)}
          description={
            dataStoresQuery.isLoading
              ? 'Loading data stores…'
              : dataStoreError
                ? `Failed to load data stores: ${dataStoreError.summary}`
                : availableStoreCodes
                  ? `Available: ${availableStoreCodes}`
                  : 'Optional comma or whitespace separated store codes'
          }
        />
        <Input
          label="Dataset codes"
          placeholder="e.g. 20240312101122334-1"
          value={filters.dataSetCodesText}
          onValueChange={(value) => updateFilter('dataSetCodesText', value)}
          description="Optional comma or whitespace separated dataset codes"
        />
        <Input
          label="Dataset types"
          placeholder="e.g. ELN_PREVIEW"
          value={filters.dataSetTypeCodesText}
          onValueChange={(value) => updateFilter('dataSetTypeCodesText', value)}
          description="Optional comma or whitespace separated dataset type codes"
        />
        <Input
          label="Sample identifiers"
          placeholder="e.g. /SPACE/PROJECT/SAMPLE"
          value={filters.sampleFilterIdentifiersText}
          onValueChange={(value) => updateFilter('sampleFilterIdentifiersText', value)}
          description="Optional comma or whitespace separated sample identifiers"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button color="primary" onPress={onSearch} isLoading={dataSetsQuery.isFetching && !dataSetsQuery.isLoading}>
          Search
        </Button>
        <Button variant="flat" onPress={onReset}>
          Reset
        </Button>
        {downloadMutation.isSuccess && (
          <div className="text-small text-success">Downloaded {downloadMutation.data.fileName}</div>
        )}
        {downloadError && <div className="text-small text-danger">{downloadError.summary}</div>}
      </div>

      {downloadError?.details && (
        <pre className="whitespace-pre-wrap break-words text-xs text-default-600">{downloadError.details}</pre>
      )}

      {dataSetError && <div className="text-small text-danger">Failed to load datasets: {dataSetError.summary}</div>}

      <Table aria-label="Datasets table">
        <TableHeader>
          <TableColumn>CODE</TableColumn>
          <TableColumn>TYPE</TableColumn>
          <TableColumn>DATA STORE</TableColumn>
          <TableColumn>SAMPLE</TableColumn>
          <TableColumn>EXPERIMENT</TableColumn>
          <TableColumn>REGISTERED</TableColumn>
          <TableColumn>DOWNLOAD</TableColumn>
        </TableHeader>
        <TableBody emptyContent={dataSetsQuery.isLoading ? 'Loading datasets…' : 'No datasets found'}>
          {rows.map((row) => {
            const isDownloading = downloadMutation.isPending && downloadMutation.variables?.code === row.code

            return (
              <TableRow key={row.permId ?? row.code}>
                <TableCell>{row.code}</TableCell>
                <TableCell>{row.type ?? ''}</TableCell>
                <TableCell>{row.dataStore ?? ''}</TableCell>
                <TableCell>{row.sample ?? ''}</TableCell>
                <TableCell>{row.experiment ?? ''}</TableCell>
                <TableCell>{formatDateTime(row.registrationDate)}</TableCell>
                <TableCell>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="flat"
                    onPress={() => onDownload(row)}
                    isLoading={isDownloading}
                    isDisabled={downloadMutation.isPending && !isDownloading}
                    aria-label={`Download ${row.code}`}
                  >
                    <DownloadIcon fontSize="small" />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <div className="flex justify-center">
        <Pagination page={filters.page} total={totalPages} onChange={onPageChange} />
      </div>

      <div className="text-small text-default-500">
        Showing {rows.length} of {totalCount} datasets.
      </div>
    </div>
  )
}