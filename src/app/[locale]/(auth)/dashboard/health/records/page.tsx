'use client';

import { getTranslations } from 'next-intl/server';
import { Suspense, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { HealthRecordsFilters } from '@/components/health/HealthRecordsFilters';
import { AddHealthRecordModal } from '@/components/health/AddHealthRecordModal';

// Remove the 'use client' directive from line 1

// Remove the generateMetadata function (lines 10-20)

type HealthRecord = {
  id: number;
  type_id: number;
  type_name: string;
  value: number;
  unit: string;
  recorded_at: string;
  created_at: string;
};

type HealthType = {
  id: number;
  slug: string;
  display_name: string;
  unit: string;
};

async function getHealthRecords(_searchParams: {
  page?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}): Promise<{
  records: HealthRecord[];
  totalCount: number;
  totalPages: number;
}> {
  // This will be replaced with actual API call once the API routes are implemented
  // For now, return mock data structure
  return {
    records: [],
    totalCount: 0,
    totalPages: 0,
  };
}

async function getHealthTypes(): Promise<HealthType[]> {
  // This will be replaced with actual API call once the API routes are implemented
  // For now, return mock data structure
  return [];
}

function HealthRecordsTable({
  records,
  t,
  onAddRecord,
}: {
  records: HealthRecord[];
  t: any;
  onAddRecord: () => void;
}) {
  if (records.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">{t('no_records_title')}</h3>
        <p className="mt-1 text-sm text-gray-500">{t('no_records_description')}</p>
        <div className="mt-6">
          <button
            type="button"
            onClick={onAddRecord}
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            {t('button_add_first_record')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('table_header_type')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('table_header_value')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('table_header_recorded_at')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('table_header_actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {records.map(record => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                  {record.type_name}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {record.value}
                  {' '}
                  {record.unit}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {new Date(record.recorded_at).toLocaleDateString()}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-900"
                    >
                      {t('button_edit')}
                    </button>
                    <button
                      type="button"
                      className="text-red-600 hover:text-red-900"
                    >
                      {t('button_delete')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  t,
}: {
  currentPage: number;
  totalPages: number;
  t: any;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const showPages = pages.filter(page =>
    page === 1
    || page === totalPages
    || (page >= currentPage - 2 && page <= currentPage + 2),
  );

  return (
    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          disabled={currentPage <= 1}
          className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {t('pagination_previous')}
        </button>
        <button
          disabled={currentPage >= totalPages}
          className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {t('pagination_next')}
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            {t('pagination_showing')}
            {' '}
            <span className="font-medium">{(currentPage - 1) * 10 + 1}</span>
            {' '}
            {t('pagination_to')}
            {' '}
            <span className="font-medium">{Math.min(currentPage * 10, totalPages * 10)}</span>
            {' '}
            {t('pagination_of')}
            {' '}
            <span className="font-medium">{totalPages * 10}</span>
            {' '}
            {t('pagination_results')}
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button
              disabled={currentPage <= 1}
              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
            >
              <span className="sr-only">{t('pagination_previous')}</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
              </svg>
            </button>
            {showPages.map((page, _index) => (
              <button
                key={page}
                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                  page === currentPage
                    ? 'z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                    : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              disabled={currentPage >= totalPages}
              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
            >
              <span className="sr-only">{t('pagination_next')}</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}

export default function HealthRecordsPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }>;
}) {
  const t = useTranslations('HealthManagement');
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [healthRecordsData, setHealthRecordsData] = useState<{
    records: HealthRecord[];
    totalCount: number;
    totalPages: number;
  }>({ records: [], totalCount: 0, totalPages: 0 });
  const [healthTypes, setHealthTypes] = useState<HealthType[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchParams, setSearchParams] = useState<{
    page?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }>({});

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const { locale } = await props.params;
        const params = await props.searchParams;
        setSearchParams(params);
        setCurrentPage(Number.parseInt(params.page || '1', 10));

        const [recordsData, typesData] = await Promise.all([
          getHealthRecords(params),
          getHealthTypes(),
        ]);

        setHealthRecordsData(recordsData);
        setHealthTypes(typesData);
      } catch (error) {
        console.error('Error loading health records data:', error);
      }
    };

    loadData();
  }, [props.params, props.searchParams]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSuccess = async () => {
    // Refresh the page data after successful record creation
    try {
      const recordsData = await getHealthRecords(searchParams);
      setHealthRecordsData(recordsData);
      router.refresh();
    } catch (error) {
      console.error('Error refreshing health records:', error);
    }
  };

  return (
    <div className="py-5">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('page_title_records')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('records_empty_state')}</p>
        </div>
        <div className="flex space-x-3">
          <button
            type="button"
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t('button_export_data')}
          </button>
          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {t('button_add_record')}
          </button>
        </div>
      </div>

      <form method="GET" className="mb-6">
        <HealthRecordsFilters
          healthTypes={healthTypes}
          searchParams={searchParams}
        />
      </form>

      <Suspense fallback={(
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        </div>
      )}
      >
        <HealthRecordsTable
          records={healthRecordsData.records}
          t={t}
          onAddRecord={handleOpenModal}
        />
      </Suspense>

      <Pagination
        currentPage={currentPage}
        totalPages={healthRecordsData.totalPages}
        t={t}
      />

      <AddHealthRecordModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
