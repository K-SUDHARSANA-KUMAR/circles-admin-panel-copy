'use client';

import { useCallback, useState } from 'react';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { createColumns } from '@/components/data-display/orders/sales-return/columns';
import { Eye, History, Search } from 'lucide-react';
import { MasterRecordDropdown } from '@/components/business-logic/master-record-dropdown-filter';
import { WarehouseDropdown } from '@/components/business-logic/warehouse-dropdown';
import { useRouter } from 'next/navigation';
import { usePermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { Action } from '@/components/data-display/util/types';
import NavKeys from '@/constants/navkeys';

const mockSalesReturns = [
	{
		date: '2024-06-01',
		name: 'Return #001',
		type: 'Damaged',
		criteriaType: 'Full',
		validity: '2024-06-10',
		productApplied: 'Product A',
		status: 'Pending',
		onViewLogs: () => alert('Logs for Return #001'),
	},
	{
		date: '2024-06-02',
		name: 'Return #002',
		type: 'Expired',
		criteriaType: 'Partial',
		validity: '2024-06-12',
		productApplied: 'Product B',
		status: 'Approved',
		onViewLogs: () => alert('Logs for Return #002'),
	},
	{
		date: '2024-06-03',
		name: 'Return #003',
		type: 'Damaged',
		criteriaType: 'Full',
		validity: '2024-06-15',
		productApplied: 'Product C',
		status: 'Rejected',
		onViewLogs: () => alert('Logs for Return #003'),
	},
];

export default function SalesReturnSection() {
	const permission = usePermissionChecker('orders');

	const [search, setSearch] = useState('');
	const [selectedWarehouse, setSelectedWarehouse] = useState<string | undefined>();
	const [selectedStatus, setSelectedStatus] = useState<string | undefined>();
	const [selectedChannel, setSelectedChannel] = useState<string | undefined>(undefined);
	const router = useRouter();

	const salesReturnsWithActions = mockSalesReturns;

	const getActionsForPermissions = useCallback((record: any): Action[] => {
		const actions: Action[] = [];
		if (permission.has('view')) {
			actions.push({
				title: 'View Report',
				icon: <Eye />,
				handleAction: () => router.push(NavKeys.OrdersReportView),
			});
		}
		if (permission.has('log')) {
			actions.push({
				title: 'Logs',
				icon: <History />,
				handleAction: () => window.alert("Logs: " + record.date),
			});
		}
		return actions;
	}, [permission]);

	return (
		<section className="w-full space-y-4 rounded-lg bg-card">
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div className="relative w-full md:w-1/3">
					<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-500" />
					<Input
						placeholder="Search sales return"
						className="pl-10"
						value={search}
						onChange={e => setSearch(e.target.value)}
					/>
				</div>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-4 gap-2">
				<MasterRecordDropdown
					masterName="channel"
					value={selectedChannel}
					onChange={setSelectedChannel}
					placeholder="Channel"
					className="w-full"
				/>
				<WarehouseDropdown
					value={selectedWarehouse}
					onChange={setSelectedWarehouse}
					placeholder="Warehouse"
					className="w-full"
				/>
				<MasterRecordDropdown
					masterName="status"
					value={selectedStatus}
					onChange={setSelectedStatus}
					placeholder="Status"
					className="w-full"
				/>
				<div />
				<div />
			</div>
			<div>
				<DataTable
					columns={createColumns(getActionsForPermissions)}
					data={salesReturnsWithActions}
            tableId="sales-return-component-table"

				/>
			</div>
		</section>
	);
}
