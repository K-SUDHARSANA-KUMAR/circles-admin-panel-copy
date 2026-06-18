import React from 'react';
import { IconFileSpreadsheet } from '@tabler/icons-react';
import { Card } from '@/components/ui/card';

export default function ReportsPage() {
  return (
    <div className="max-w-[1535px] mx-auto animate-in fade-in duration-700">
      <Card className="border-[#333333] bg-[#222222] p-12 text-center flex flex-col items-center justify-center gap-4 min-h-[300px]">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
          <IconFileSpreadsheet size={24} />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-white">No Reports Selected</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Choose a dataset or run a query to generate spreadsheet exports, booking PDFs, and detailed CSV logs.
          </p>
        </div>
      </Card>
    </div>
  );
}
