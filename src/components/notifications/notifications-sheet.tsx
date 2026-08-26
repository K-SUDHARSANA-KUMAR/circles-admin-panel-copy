"use client";

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs as TabsStyled } from '@/components/ui/tabs-styled';
import EmptyState from '@/components/ui/empty-state';

type NotificationsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const NotificationsSheet: React.FC<NotificationsSheetProps> = ({ open, onOpenChange }) => {
  const [activeTab, setActiveTab] = React.useState('unread');

  const tabs = [
    {
      title: 'Unread',
      value: 'unread',
    },
    {
      title: 'Read',
      value: 'read',
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="min-w-[30%]">
        <SheetHeader className="border-b p-4">
          <SheetTitle className='text-lg font-medium'>Notifications</SheetTitle>
          <SheetDescription>Latest updates and alerts</SheetDescription>
          <div className="mt-4">
            <TabsStyled
              tabs={tabs}
              currentTab={activeTab}
              onTabChange={setActiveTab}
              containerClassName="w-full max-w-xs"
            />
          </div>
        </SheetHeader>
        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-y-auto p-4 max-h-[calc(100vh-12rem)] scroll-smooth">
            <div className="py-8">
              <EmptyState 
                text="No notifications yet"
                description="You'll see new notifications here"
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationsSheet;
