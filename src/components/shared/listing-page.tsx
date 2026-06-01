'use client';

import React from 'react';
import { IconAlertCircle, IconArrowLeft, IconRefresh, IconSearch } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TablerIcon } from '@tabler/icons-react';

export const listingStyles = {
  container: 'max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-700',
  sectionHeader:
    'flex flex-col md:flex-row md:items-center justify-between border-b border-[#18181b] pb-4 gap-4',
  title: 'text-xl font-bold text-white tracking-tight flex items-center gap-2',
  titleIcon: 'text-[#d8b4fe]',
  subtitle: 'text-xs text-zinc-500 mt-1',
  toolbar:
    'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#09090b] border border-[#18181b] p-4 rounded-xl',
  countBadge:
    'text-[10px] font-bold text-[#d8b4fe] bg-[#1c122c] px-2.5 py-1 rounded-md border border-[#3b1a60] tracking-wider uppercase select-none',
  searchInput:
    'pl-8 h-8 text-xs bg-zinc-900/60 border-zinc-800 text-zinc-300 placeholder:text-zinc-600 rounded-lg',
  refreshButton:
    'h-8 w-8 shrink-0 border-[#18181b] bg-[#09090b] hover:bg-[#18181b] rounded-lg',
  primaryButton:
    'flex items-center gap-2 h-8 px-4 text-xs font-bold uppercase tracking-wider bg-[#d8b4fe] text-[#3b0764] hover:bg-[#c084fc] shrink-0 rounded-lg transition-colors duration-200',
  tableWrapper:
    'bg-[#09090b] border border-[#18181b] rounded-xl shadow-2xl overflow-hidden animate-in fade-in-50 duration-350',
  tableHead:
    'text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-4 px-12 select-none',
  tableBody: 'divide-y divide-[#18181b]/60',
  tableRow: 'group hover:bg-[#0c0c0e] transition-colors duration-200',
  cellPrimary: 'py-5 px-12 text-sm font-semibold text-white',
  cellMuted: 'py-5 px-12 text-sm font-normal text-zinc-400',
  cellDefault: 'py-5 px-12',
  pagination:
    'flex items-center justify-between border-t border-[#18181b] px-12 py-4',
  paginationText: 'text-[11px] text-zinc-500 text-left',
  paginationButton:
    'h-7 px-3 text-[11px] bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-30 hover:bg-zinc-800 hover:text-white rounded-lg transition-all',
} as const;

/** Detail / form pages — same typography & surfaces as listing pages */
export const detailStyles = {
  card: 'bg-[#09090b] border border-[#18181b] rounded-xl shadow-2xl overflow-hidden',
  cardHeader: 'border-b border-[#18181b] px-6 py-4',
  cardTitle: 'text-sm font-bold text-white flex items-center gap-2',
  cardTitleIcon: 'text-[#d8b4fe]',
  sectionLabel: 'text-[10px] font-bold uppercase tracking-widest text-zinc-500',
  fieldLabel: 'text-[10px] font-bold uppercase tracking-widest text-zinc-500',
  fieldValue: 'text-xs text-zinc-300',
  innerPanel: 'bg-zinc-900/60 border border-zinc-800 rounded-lg',
  backLink:
    'flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-white transition-colors w-fit group',
  metricValue: 'text-2xl font-bold text-white',
  metricSubtext: 'text-[11px] text-zinc-500 mt-1',
  outlineButton:
    'h-8 text-xs font-bold uppercase tracking-wider border-[#18181b] bg-[#09090b] hover:bg-[#18181b] text-zinc-300 hover:text-white rounded-lg',
} as const;

type ListingPageContainerProps = {
  children: React.ReactNode;
  className?: string;
};

export const ListingPageContainer = ({ children, className = '' }: ListingPageContainerProps) => (
  <div className={`${listingStyles.container} ${className}`.trim()}>{children}</div>
);

export const DetailPageContainer = ListingPageContainer;

type ListingSectionHeaderProps = {
  icon: TablerIcon;
  title: string;
  subtitle: string;
  trailing?: React.ReactNode;
};

export const ListingSectionHeader = ({
  icon: Icon,
  title,
  subtitle,
  trailing,
}: ListingSectionHeaderProps) => (
  <div className={listingStyles.sectionHeader}>
    <div>
      <h1 className={listingStyles.title}>
        <Icon className={listingStyles.titleIcon} size={22} aria-hidden />
        {title}
      </h1>
      <p className={listingStyles.subtitle}>{subtitle}</p>
    </div>
    {trailing ? <div className="shrink-0">{trailing}</div> : null}
  </div>
);

type ListingToolbarProps = {
  countLabel?: string;
  showCount?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onRefresh?: () => void;
  refreshDisabled?: boolean;
  refreshLoading?: boolean;
  primaryAction?: React.ReactNode;
  leadingActions?: React.ReactNode;
};

export const ListingToolbar = ({
  countLabel,
  showCount = true,
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange,
  onRefresh,
  refreshDisabled = false,
  refreshLoading = false,
  primaryAction,
  leadingActions,
}: ListingToolbarProps) => (
  <div className={listingStyles.toolbar}>
    <div className="flex items-center gap-3 flex-wrap">
      {showCount && countLabel ? (
        <span className={listingStyles.countBadge}>{countLabel}</span>
      ) : null}
      {leadingActions}
    </div>

    <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap sm:flex-nowrap">
      {onSearchChange !== undefined ? (
        <div className="relative flex-1 sm:flex-initial sm:w-64">
          <IconSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500"
            aria-hidden
          />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className={listingStyles.searchInput}
            aria-label={searchPlaceholder}
          />
        </div>
      ) : null}
      {onRefresh ? (
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={refreshDisabled}
          className={listingStyles.refreshButton}
          title="Refresh"
          aria-label="Refresh list"
        >
          <IconRefresh size={12} className={refreshLoading ? 'animate-spin' : ''} />
        </Button>
      ) : null}
      {primaryAction}
    </div>
  </div>
);

type ListingTableWrapperProps = {
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export const ListingTableWrapper = ({ children, footer }: ListingTableWrapperProps) => (
  <div className={listingStyles.tableWrapper}>
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">{children}</table>
    </div>
    {footer}
  </div>
);

export const ListingTableHead = ({ children }: { children: React.ReactNode }) => (
  <thead>
    <tr className="border-b border-[#18181b]">{children}</tr>
  </thead>
);

type ListingThProps = {
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
};

export const ListingTh = ({ children, align = 'left', className = '' }: ListingThProps) => (
  <th
    className={`${align === 'right' ? 'text-right' : 'text-left'} ${listingStyles.tableHead} ${className}`.trim()}
  >
    {children}
  </th>
);

export const ListingTableBody = ({ children }: { children: React.ReactNode }) => (
  <tbody className={listingStyles.tableBody}>{children}</tbody>
);

type ListingStatusVariant = 'active' | 'inactive' | 'waitlist' | 'pending' | 'rejected';

const statusClassMap: Record<ListingStatusVariant, string> = {
  active:
    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1c122c]/60 border border-[#3b1a60]/50 text-[#d8b4fe] text-[11px] font-semibold select-none',
  waitlist:
    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#2d1f10]/60 border border-[#5f3e15]/50 text-amber-400 text-[11px] font-semibold select-none',
  pending:
    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#2d1f10]/60 border border-[#5f3e15]/50 text-amber-400 text-[11px] font-semibold select-none',
  inactive:
    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900/40 border border-zinc-800/60 text-zinc-400 text-[11px] font-semibold select-none',
  rejected:
    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-950/20 border border-red-900/30 text-rose-400 text-[11px] font-semibold select-none',
};

const statusDotMap: Record<ListingStatusVariant, string> = {
  active: 'bg-[#c084fc]',
  waitlist: 'bg-amber-400',
  pending: 'bg-amber-400',
  inactive: 'bg-zinc-500',
  rejected: 'bg-rose-500',
};

type ListingStatusBadgeProps = {
  variant: ListingStatusVariant;
  label: string;
};

export const ListingStatusBadge = ({ variant, label }: ListingStatusBadgeProps) => (
  <span className={statusClassMap[variant]}>
    <span className={`w-1.5 h-1.5 rounded-full ${statusDotMap[variant]}`} />
    {label}
  </span>
);

type ListingLoadingRowProps = {
  colSpan: number;
  message?: string;
};

export const ListingLoadingRow = ({
  colSpan,
  message = 'Loading...',
}: ListingLoadingRowProps) => (
  <tr>
    <td colSpan={colSpan} className="py-20 text-center">
      <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-zinc-800 border-t-zinc-400" />
      <p className="text-xs text-zinc-500 mt-2 font-medium">{message}</p>
    </td>
  </tr>
);

type ListingEmptyRowProps = {
  colSpan: number;
  icon?: TablerIcon;
  title: string;
  description?: string;
};

export const ListingEmptyRow = ({
  colSpan,
  icon: Icon,
  title,
  description,
}: ListingEmptyRowProps) => (
  <tr>
    <td colSpan={colSpan} className="py-20 text-center">
      <div className="flex flex-col items-center justify-center gap-2">
        {Icon ? <Icon size={32} className="text-zinc-600" aria-hidden /> : null}
        <p className="text-xs font-semibold text-zinc-400">{title}</p>
        {description ? <p className="text-[11px] text-zinc-600">{description}</p> : null}
      </div>
    </td>
  </tr>
);

type ListingErrorPanelProps = {
  title: string;
  message?: string;
  onRetry?: () => void;
};

export const ListingErrorPanel = ({ title, message, onRetry }: ListingErrorPanelProps) => (
  <div className="flex flex-col items-center justify-center gap-3 bg-[#09090b] border border-[#18181b] p-8 rounded-xl">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20">
      <IconAlertCircle size={24} className="text-destructive" />
    </div>
    <div className="text-center">
      <p className="text-sm font-semibold text-white">{title}</p>
      {message ? (
        <p className="text-xs text-zinc-500 max-w-xs mx-auto mt-0.5">{message}</p>
      ) : null}
    </div>
    {onRetry ? (
      <Button
        onClick={onRetry}
        variant="outline"
        size="sm"
        className="mt-1 gap-1.5 text-[10px] font-bold uppercase tracking-wider h-8 border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800"
      >
        <IconRefresh size={12} />
        Try Again
      </Button>
    ) : null}
  </div>
);

type ListingPaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  itemLabel?: string;
  onPrevious: () => void;
  onNext: () => void;
};

export const ListingPagination = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  itemLabel = 'entries',
  onPrevious,
  onNext,
}: ListingPaginationProps) => {
  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className={listingStyles.pagination}>
      <div className={listingStyles.paginationText}>
        Showing {start} to {end} of {totalItems} {itemLabel}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={currentPage === 1}
          onClick={onPrevious}
          className={listingStyles.paginationButton}
        >
          Previous
        </Button>
        <div className="text-[11px] text-zinc-400 px-1 font-semibold select-none">
          Page {currentPage} of {totalPages}
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={currentPage === totalPages}
          onClick={onNext}
          className={listingStyles.paginationButton}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

type DetailPageHeaderProps = {
  icon: TablerIcon;
  title: string;
  subtitle: string;
  onBack: () => void;
  backLabel?: string;
  trailing?: React.ReactNode;
};

export const DetailPageHeader = ({
  icon: Icon,
  title,
  subtitle,
  onBack,
  backLabel = 'Back to List',
  trailing,
}: DetailPageHeaderProps) => (
  <div className="space-y-4">
    <button
      type="button"
      onClick={onBack}
      className={`group ${detailStyles.backLink}`}
      aria-label={backLabel}
    >
      <IconArrowLeft size={16} className="transition-transform group-hover:-translate-x-1 shrink-0" />
      <span>{backLabel}</span>
    </button>
    <div className={listingStyles.sectionHeader}>
      <div>
        <h1 className={listingStyles.title}>
          <Icon className={listingStyles.titleIcon} size={22} aria-hidden />
          {title}
        </h1>
        <p className={listingStyles.subtitle}>{subtitle}</p>
      </div>
      {trailing ? <div className="flex items-center gap-2 shrink-0 flex-wrap">{trailing}</div> : null}
    </div>
  </div>
);

type DetailLoadingPanelProps = {
  message?: string;
};

export const DetailLoadingPanel = ({
  message = 'Loading details...',
}: DetailLoadingPanelProps) => (
  <DetailPageContainer className="min-h-[60vh] flex flex-col items-center justify-center">
    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-zinc-800 border-t-zinc-400" />
    <p className="text-xs text-zinc-500 mt-2 font-medium">{message}</p>
  </DetailPageContainer>
);
