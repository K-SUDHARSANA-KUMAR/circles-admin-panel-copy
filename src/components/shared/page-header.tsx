'use client';

import React from 'react';
import SpringBoard from '@/components/shared/spring-board';
import { SidebarTrigger } from '../ui/sidebar';

type PageHeaderProps = {
  title: string;
};

const PageHeader = ({ title }: PageHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="md:hidden">
          <SidebarTrigger />
        </div>
        <h1 className="text-3xl font-bold">{title}</h1>
      </div>

      <SpringBoard />
    </div>
  );
};

export default PageHeader;
