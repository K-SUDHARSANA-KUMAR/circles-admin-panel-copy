'use client';

import ClaimsTab from '@/components/tabs/claims/claims-tabs';
import { columns } from '@/components/data-tables/claims/my-claims-columns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus } from 'lucide-react';
import { useState } from 'react';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import ViewClaimModal from '@/components/modals/claim/view-claim-modal';
import NewClaimModal from '@/components/modals/claim/new-claim-modal';
import { useClaims } from '@/features/dashboard/claims/hooks/useClaims';
import GenericPageLoading from '@/components/shared/generic-page-loading';
import GenericPageError from '@/components/shared/generic-page-error';
import EmptyState from '@/components/ui/empty-state';
import PageHeader from '@/components/shared/page-header';

export default function MyClaimsPage() {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [approvalClaimOpen, setApprovalClaimOpen] = useState(false);
  const [newClaimOpen, setNewClaimOpen] = useState(false);
  const [selectedDesignation, setSelectedDesignation] = useState<string>();

  const { claims } = useClaims();

  const onViewClaim = (record: any) => {
    setApprovalClaimOpen(true);
  };

  const handleAddNew = (record: any) => {
    setNewClaimOpen(true);
  };

  const mappedData =
    claims?.data?.data?.items?.map((item: any) => ({
      claimId: item.claimId,
      claimType: item.claimTypeId,
      claimDate: item.claimDate,
      description: item.description,
      totalAmount: item.claimAmount,
      aiScore: item.legitimacyScore,
      attachment: item.attachments && item.attachments.length > 0,
      claimStatus: item.claimStatus,
      invoiceNumber: item.invoiceNumber,
      invoiceDate: item.invoiceDate,
      handWritten: item.handWritten,
      aiResponse: item.aiResponse,
    })) || [];

  if (claims.error) {
    return (
      <GenericPageError
        title="Claims"
        errorText="Error loading claims. Please try again."
      />
    );
  }

  return (
    <>
      <section className="w-full space-y-6">
        <PageHeader title="Claims" />

        <div className="w-full space-y-4 rounded-lg bg-card p-4">
          <ClaimsTab />
          {claims.isLoading ? (
            <GenericPageLoading
              title="Claims"
              loadingText="Loading claims..."
              inline={true}
            />
          ) : (
            <>
              <div className="flex flex-col justify-between gap-10 md:flex-row">
                <div className="flex w-full justify-between">
                  <div className="flex flex-wrap items-center gap-2 md:flex-row">
                    <div className="relative w-full md:max-w-[250px] md:min-w-[180px] md:flex-1">
                      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-500" />
                      <Input placeholder="Search claim" className="pl-10" />
                    </div>

                    <Select
                      value={selectedDesignation}
                      onValueChange={setSelectedDesignation}
                    >
                      <SelectTrigger className="w-full md:max-w-[250px] md:min-w-[180px] md:flex-1">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sales">Sales Executive</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                      </SelectContent>
                    </Select>

                    <DatePicker
                      date={selectedDate}
                      onSelect={setSelectedDate}
                      className="w-full md:max-w-[250px] md:min-w-[180px] md:flex-1"
                    />
                  </div>
                  <Button onClick={handleAddNew}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Claim
                  </Button>
                </div>
              </div>
              {mappedData.length > 0 ? (
                <DataTable
                  columns={columns}
                  data={mappedData.map((record: any) => ({
                    ...record,
                    onViewClaim: () => onViewClaim(record),
                  }))}
                  tableId="my-claim-table"
                />
              ) : (
                <div className="flex h-64 items-center justify-center">
                  <EmptyState />
                </div>
              )}
            </>
          )}
        </div>

        <ViewClaimModal
          open={approvalClaimOpen}
          onOpenChange={setApprovalClaimOpen}
        />
        <NewClaimModal open={newClaimOpen} onOpenChange={setNewClaimOpen} />
      </section>
    </>
  );
}
