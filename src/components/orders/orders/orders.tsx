'use client';

import { createColumns } from '@/components/data-tables/orders/orders/columns';
import { MasterRecordDropdown } from '@/components/shared/master-record-dropdown-filter';
import { WarehouseDropdown } from '@/components/shared/warehouse-dropdown';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { History, Newspaper, PlusIcon, Search } from 'lucide-react';
import { useCallback, useState } from 'react';
import { DatePicker } from '@/components/ui/date-picker';
import { usePermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { Action } from '@/components/data-tables/util/types';

const mockOrders = [
	{
		outletName: 'ABC Retailers',
		businessType: 'Retail',
		orderDate: '2024-06-01',
		orderId: 'ORD001',
		weight: 120,
		amount: 15000,
		warehouse: 'Warehouse 1',
		status: 'Pending'
	},
	{
		outletName: 'XYZ Distributors',
		businessType: 'Distributor',
		orderDate: '2024-06-02',
		orderId: 'ORD002',
		weight: 200,
		amount: 25000,
		warehouse: 'Warehouse 2',
		status: 'Completed'
	},
	{
		outletName: 'LMN Wholesale',
		businessType: 'Wholesale',
		orderDate: '2024-06-03',
		orderId: 'ORD003',
		weight: 180,
		amount: 22000,
		warehouse: 'Warehouse 3',
		status: 'Cancelled'
	},
];

export default function OrdersSection() {
	const permission = usePermissionChecker('orders');

	const hasOrdersCreatePermission = permission.has('create');

	const [search, setSearch] = useState('');
	const [selectedOutletType, setSelectedOutletType] = useState<string | undefined>();
	const [selectedWarehouse, setSelectedWarehouse] = useState<string | undefined>();
	const [selectedStatus, setSelectedStatus] = useState<string | undefined>();
	const [selectedDate, setSelectedDate] = useState<Date | undefined>();
	const [selectedChannel, setSelectedChannel] = useState<string | undefined>(undefined);

	const getActionsForPermissions = useCallback((record: any): Action[] => {
		const actions: Action[] = [];
		if (permission.has('view')) {
			actions.push({
				title: 'Order Details',
				icon: <Newspaper />,
				handleAction: () => window.alert("Order: " + record.orderId),
			});
		}
		if (permission.has('log')) {
			actions.push({
				title: 'Logs',
				icon: <History />,
				handleAction: () => window.alert("Logs: "+record.orderDate),
			});
		}
		return actions;
	}, [permission]);
	return (
		<section className="w-full space-y-4 rounded-lg bg-white ">
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div className="relative w-full md:w-1/3">
					<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-500" />
					<Input
						placeholder="Search orders"
						className="pl-10"
						value={search}
						onChange={e => setSearch(e.target.value)}
					/>
				</div>
				{hasOrdersCreatePermission && <Button className="w-full md:w-auto">
					<PlusIcon className="mr-2 h-4 w-4" />
					Place Order
				</Button>}

			</div>
			<div className="grid grid-cols-1 md:grid-cols-4 gap-2">
				<MasterRecordDropdown
					masterName="businessType"
					value={selectedOutletType}
					onChange={setSelectedOutletType}
					placeholder="Business Type"
					className="w-full"
				/>
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
				<DatePicker
					value={selectedDate}
					onChange={setSelectedDate}
					placeholder="Select Date"
					className="w-full"
				/>
				<MasterRecordDropdown
					masterName="status"
					value={selectedStatus}
					onChange={setSelectedStatus}
					placeholder="Status"
					className="w-full"
				/>
			</div>
			<div>
				<DataTable columns={createColumns(getActionsForPermissions)} data={mockOrders}
            tableId="orders-component-table"
				 />
			</div>
		</section>
	);
}