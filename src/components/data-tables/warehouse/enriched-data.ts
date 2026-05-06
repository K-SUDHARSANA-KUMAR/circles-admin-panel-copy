import { dummyWarehouses } from './dummy-data';
import { Warehouse } from './columns';

const handleEdit = (warehouse: Warehouse) => {
  console.log('Editing warehouse:', warehouse);
};

const handleViewLogs = (warehouse: Warehouse) => {
  console.log('Viewing logs for warehouse:', warehouse);
};

const handleDelete = (warehouse: Warehouse) => {
  console.log('Deleting warehouse:', warehouse);
};

export const enrichedWarehouses = dummyWarehouses.map((warehouse) => ({
  ...warehouse,
  onEdit: () => handleEdit(warehouse),
  onViewLogs: () => handleViewLogs(warehouse),
  onDelete: () => handleDelete(warehouse),
})); 