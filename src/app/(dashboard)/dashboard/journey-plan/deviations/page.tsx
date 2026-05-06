'use client'


import PageHeader from '@/components/shared/page-header'
import PjpTab from '@/components/tabs/pjp/pjp-tabs'
import React, { useEffect, useMemo, useState } from 'react'
import { SearchInput } from '@/components/ui/search-input'
import { DataTable } from '@/components/ui/data-table'
import { createDeviationColumns } from '@/components/data-tables/pjp/deviations-columns'
import { usePlanDeviations, usePjpApprovals, useUpdatePjpApprovalStatus } from '@/features/dashboard/pjp/hooks/usePjp'
import GenericError from '@/components/shared/generic-page-error'
import { PaginationState } from '@tanstack/react-table'
import ApprovalModal from '@/components/modals/approval-modal'
import { toast } from 'sonner'
import { useAppSelector } from '@/store/hooks'
import { useRouter, useSearchParams } from 'next/navigation'
import NavKeys from '@/constants/navkeys'
import { LocationFilters, LocationFilters as LocationFiltersType } from '@/components/shared/location-filters'
import { StatusDropdown } from '@/components/shared/status-dropdown'
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue,} from '@/components/ui/select'
import { RoutePlannerApprovalStatus } from '@/constants/enums/pjp.enums'

const DeviationsPage = () => {
  const [locationFilters, setLocationFilters] = useState<LocationFiltersType>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const router = useRouter()
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const searchParams = useSearchParams()
  const routePlanIdFromQuery = searchParams?.get('routePlanId') || undefined
  const [approvalModalOpen, setApprovalModalOpen] = useState(false)
  const [selectedDeviation, setSelectedDeviation] = useState<any>(null)
  const user = useAppSelector((state) => state.auth.user)

  
  const { deviations, transformedDeviations, isLoading, error } = usePlanDeviations({
    skip: pagination.pageIndex * pagination.pageSize,
    limit: pagination.pageSize,
    search: searchTerm || undefined,
    ...(selectedStatus && { status: selectedStatus }),
    parentRoutePlanId: routePlanIdFromQuery,
    ...(locationFilters.warehouseIds && locationFilters.warehouseIds.length > 0 && {
      warehouseIds: locationFilters.warehouseIds,
    }),
    ...(locationFilters.divisionId && locationFilters.divisionId.length > 0 && {
      divisionId: JSON.stringify(locationFilters.divisionId),
    }),
    ...(locationFilters.channelId && locationFilters.channelId.length > 0 && {
      channelId: JSON.stringify(locationFilters.channelId),
    }),
    ...(locationFilters.zoneId && locationFilters.zoneId.length > 0 && {
      zoneId: JSON.stringify(locationFilters.zoneId),
    }),
    ...(locationFilters.subZoneId && locationFilters.subZoneId.length > 0 && {
      subZoneId: JSON.stringify(locationFilters.subZoneId),
    }),
    ...(locationFilters.salesPersonId && {
      salesPersonId: locationFilters.salesPersonId,
    }),
  })

  const { data: approvalData, isLoading: approvalLoading } = usePjpApprovals(
    selectedDeviation?.deviationId || '',
    user?.userId,
    user?.roleId,
    'pending'
  )

  const updateApprovalStatusMutation = useUpdatePjpApprovalStatus()

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [searchTerm, locationFilters, selectedStatus])

  const handlePaginationChange = (newPagination: PaginationState) => {
    setPagination(newPagination)
  }

  const handleViewApprovals = (deviation: any) => {
    setSelectedDeviation(deviation)
    setApprovalModalOpen(true)
  }

  const handleApprove = async (reason?: string) => {
    if (!selectedDeviation || !user?.userId || !user?.roleId) return

    try {
      await updateApprovalStatusMutation.mutateAsync({
        entityId: selectedDeviation.deviationId,
        approvalStatus: 'approved',
        remarks: reason || '',
        approverId: user.userId,
        roleId: user.roleId,
        entityType: 'manual-pjp',
      })
      toast.success('Deviation approved successfully')
    } catch (error) {
      toast.error('Failed to approve deviation')
      throw error
    }
  }

  const handleReject = async (reason: string) => {
    if (!selectedDeviation || !user?.userId || !user?.roleId) return

    try {
      await updateApprovalStatusMutation.mutateAsync({
        entityId: selectedDeviation.deviationId,
        approvalStatus: 'rejected',
        remarks: reason || '',
        approverId: user.userId,
        roleId: user.roleId,
        entityType: 'manual-pjp',
      })
      toast.success('Deviation rejected successfully')
    } catch (error) {
      toast.error('Failed to reject deviation')
      throw error
    }
  }

  const hasUserAlreadyApproved = approvalData?.data?.[0]?.approvals?.some(
    (approval: any) =>
      approval.roleId === user?.roleId &&
      (approval.approvalStatus === 'approved' || approval.approvalStatus === 'rejected')
  )

  const canUserTakeAction =
    approvalData?.data?.[0]?.approvals?.some(
      (approval: any) => approval.roleId === user?.roleId && approval.approvalStatus === 'pending'
    ) && !hasUserAlreadyApproved

  const columns = createDeviationColumns(
    pagination.pageIndex,
    pagination.pageSize,
    (item) => [
      {
        title: 'View/Edit',
        handleAction: (record) => {
          router.push(
            `${NavKeys.DeviationManage}?deviationId=${record.deviationId}`
          );
        },
      },
      {
        title: 'Approvals',
        handleAction: handleViewApprovals,
      },
    ]
  )
  const deviationsData = deviations?.data?.data

  return (
    <section className="w-full space-y-6">
      <PageHeader title="Deviations" />

      <div className="w-full space-y-3 rounded-lg bg-white p-4">
        <PjpTab />

        <div className="flex flex-col justify-between gap-4 md:flex-row">
          <div className="flex flex-col gap-2 md:flex-row">
            <SearchInput
              placeholder="Search Deviations"
              value={searchTerm}
              onChange={setSearchTerm}
              rotatingWords={['User Name', 'Route Plan ID', 'Plan Type']}
              staticPrefix="Search by"
              rotateDuration={2500}
            />
          </div>
        </div>

        <LocationFilters
          filters={locationFilters}
          onFiltersChange={setLocationFilters}
          showWarehouse={true}
          showSalesPerson={true}
          className="w-full"
          statusFilter={
            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value === "select-status" ? "" : value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="select-status">Select Status</SelectItem>
                <SelectItem value={RoutePlannerApprovalStatus.PENDING}>Pending</SelectItem>
                <SelectItem value={RoutePlannerApprovalStatus.APPROVED}>Approved</SelectItem>
                <SelectItem value={RoutePlannerApprovalStatus.REJECTED}>Rejected</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        {error ? (
          <div className="flex h-64 items-center justify-center">
            <GenericError errorText="Error loading deviations. Please try again." inline />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={transformedDeviations || []}
            pageCount={deviationsData?.totalPages || 0}
            totalItems={deviationsData?.totalItems || 0}
            manualPagination={true}
            initialPagination={pagination}
            onPaginationChange={handlePaginationChange}
            isLoading={isLoading}
            loadingText="Loading deviations..."
            tableId="pjp-deviations-table"
          />
        )}
      </div>

      <ApprovalModal
        open={approvalModalOpen}
        onOpenChange={(open) => {
          setApprovalModalOpen(open)
          if (!open) setSelectedDeviation(null)
        }}
        entityId={selectedDeviation?.deviationId || ''}
        approverId={user?.userId || ''}
        approverRoleId={user?.roleId || ''}
        status="pending"
        entityName={selectedDeviation?.userName}
        entityType="pjp-deviation"
        onApprove={canUserTakeAction ? handleApprove : undefined}
        onReject={canUserTakeAction ? handleReject : undefined}
        isLoading={approvalLoading || updateApprovalStatusMutation.isPending}
        currentUserId={user?.userId}
        currentUserRoleId={user?.roleId}
        onSuccess={() => {
          // optional: refetch if needed
        }}
      />
    </section>
  )
}


export default DeviationsPage