import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';

interface LogEntry {
  title: string;
  status: 'verified' | 'invalid' | 'unverified';
  updatedAt: string;
}

interface OutletLogDetailsModalProps {
  open: boolean;
  onClose: () => void;
  documentIndex: number;
  outletId: string | null;
}

const statusIconMap: Record<
  'verified' | 'invalid' | 'unverified',
  { icon: React.ReactNode; label: string; color: string }
> = {
  verified: {
    icon: <CheckCircle className="text-primary h-5 w-5" />,
    label: 'Verified',
    color: 'text-primary',
  },
  invalid: {
    icon: <XCircle className="text-red-500 h-5 w-5" />,
    label: 'Invalid',
    color: 'text-red-600',
  },
  unverified: {
    icon: <AlertCircle className="text-yellow-500 h-5 w-5" />,
    label: 'Unverified',
    color: 'text-yellow-600',
  },
};

export const OutletLogDetailsModal: React.FC<OutletLogDetailsModalProps> = ({
  open,
  onClose,
  documentIndex,
  outletId,
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Simulate fetching logs
  useEffect(() => {
    if (!open) return;

    // Replace this with your actual API call
    const fetchLogs = async () => {
      const fakeLogs: LogEntry[] = [
        {
          title: 'Address Proof',
          status: 'verified',
          updatedAt: '2025-07-05 10:34 AM',
        },
        {
          title: 'GST Document',
          status: 'invalid',
          updatedAt: '2025-07-06 11:15 AM',
        },
        {
          title: 'PAN Card',
          status: 'unverified',
          updatedAt: '2025-07-07 09:45 AM',
        },
      ];

      setLogs(fakeLogs);
    };

    fetchLogs();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Document Status Logs</DialogTitle>
        </DialogHeader>

        <div className="mt-2 text-sm text-gray-600">
          Showing logs for document #{documentIndex}, outlet ID: {outletId}
        </div>

        <div className="mt-4 border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-4 bg-gray-100 px-4 py-2 text-sm font-semibold text-muted-foreground border-b">
            <div>S.No</div>
            <div>Document Type</div>
            <div>Status</div>
            <div>Updated At</div>
          </div>

          {/* Rows */}
          {logs.map((log, idx) => (
            <div
              key={idx}
              className="grid grid-cols-4 px-4 py-2 text-sm border-b last:border-none"
            >
              <div>{idx + 1}</div>
              <div>{log.title}</div>
              <div className={clsx('flex items-center gap-1', statusIconMap[log.status].color)}>
                {statusIconMap[log.status].icon}
                <span>{statusIconMap[log.status].label}</span>
              </div>
              <div>{log.updatedAt}</div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
