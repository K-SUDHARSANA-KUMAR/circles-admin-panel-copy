import { StatusConfig } from '@/constants/status-config';


export enum PaymentStatusEnum {
  PAYMENT_CREATED = 'created',
  PAYMENT_INITIATED = 'initiated',
  PAYMENT_PROCESSING = 'processing',
  PAYMENT_CAPTURED = 'captured',
  REFUND_INITIATED = 'refundInitiated',
  REFUND_FAILED = 'refundFailed',
  REFUND_PROCESSED = 'refundProcessed',
  PARTIALLY_REFUNDED = 'partiallyRefunded',
  PAYMENT_FAILED = 'failed',
  PAYMENT_COMPLETED = 'completed',
  PAYMENT_PENDING = 'pending',
  PAYMENT_AUTHORIZED = 'authorized',
}


export const PAYMENT_STATUS_CONFIG: Record<string, StatusConfig> = {
  [PaymentStatusEnum.PAYMENT_CREATED]: {
    variant: 'warning',
    label: 'Created',
  },
  [PaymentStatusEnum.PAYMENT_INITIATED]: {
    variant: 'blue',
    label: 'Initiated',
  },
  [PaymentStatusEnum.PAYMENT_PROCESSING]: {
    variant: 'warning',
    label: 'Processing',
  },
  [PaymentStatusEnum.PAYMENT_CAPTURED]: {
    variant: 'emerald',
    label: 'Captured',
  },
  [PaymentStatusEnum.REFUND_INITIATED]: {
    variant: 'warning',
    label: 'Refund Initiated',
  },
  [PaymentStatusEnum.REFUND_FAILED]: {
    variant: 'destructive',
    label: 'Refund Failed',
  },
  [PaymentStatusEnum.REFUND_PROCESSED]: {
    variant: 'success',
    label: 'Refund Processed',
  },
  [PaymentStatusEnum.PARTIALLY_REFUNDED]: {
    variant: 'warning',
    label: 'Partially Refunded',
  },
  [PaymentStatusEnum.PAYMENT_FAILED]: {
    variant: 'destructive',
    label: 'Failed',
  },
  [PaymentStatusEnum.PAYMENT_COMPLETED]: {
    variant: 'success',
    label: 'Completed',
  },
  [PaymentStatusEnum.PAYMENT_PENDING]: {
    variant: 'warning',
    label: 'Pending',
  },
  [PaymentStatusEnum.PAYMENT_AUTHORIZED]: {
    variant: 'violet',
    label: 'Authorized',
  },
};


export enum PaymentTypeEnum {
  PAY_NOW = 'payNow',
  PAY_LATER = 'payLater',
}

export enum PaymentModeEnum {
  ONLINE = 'online',
  CASH = 'cash'
}
