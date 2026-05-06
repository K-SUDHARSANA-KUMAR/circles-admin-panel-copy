export const InvoiceStatusEnum = {
  DRAFT: 'draft',
  SENT: 'sent',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  CREATED: 'created',
} as const;

export type InvoiceStatus = typeof InvoiceStatusEnum[keyof typeof InvoiceStatusEnum];
