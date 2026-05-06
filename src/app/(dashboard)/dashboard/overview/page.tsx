'use client';

import React from 'react';
import { IconPackage, IconShoppingCart, IconUsers } from '@tabler/icons-react';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis } from 'recharts';
import PageHeader from '@/components/shared/page-header';

const chartData = [
  { date: '2024-01-01', sales: 8000 },
  { date: '2024-02-01', sales: 5000 },
  { date: '2024-03-01', sales: 2400 },
  { date: '2024-04-01', sales: 9000 },
  { date: '2024-05-01', sales: 6000 },
  { date: '2024-06-01', sales: 8100 },
];

const chartConfig = {
  sales: {
    label: 'Sales Amount',
    color: 'var(--color-freshleaf)',
  },
} satisfies ChartConfig;

const dashboardMetrics = [
  {
    icon: IconPackage,
    title: 'Total Products',
    value: '2,455',
    description: 'Active items currently in stock',
  },
  {
    icon: IconShoppingCart,
    title: 'Total Orders',
    value: '10,252',
    description: 'Placed in the last 30 days',
  },
  {
    icon: IconUsers,
    title: 'Total Customers',
    value: '3,210',
    description: 'Registered users to date',
  },
];

const DashboardPage = () => {
  return (
    <section className="w-full space-y-6">
      <PageHeader title="Dashboard" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {dashboardMetrics.map((metric, index) => {
          const IconComponent = metric.icon;
          return (
            <div
              key={index}
              className="flex flex-col gap-3 rounded-lg bg-white p-4"
            >
              <div className="flex items-start gap-2 border-b border-neutral-200 pb-3">
                <div className="flex w-fit shrink-0 items-center rounded-lg border-2 border-neutral-200 bg-neutral-100 p-1">
                  <IconComponent size={25} />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-base">{metric.title}</div>
                  <div className="text-xl font-semibold">{metric.value}</div>
                </div>
              </div>
              <div className="text-sm text-neutral-600">
                {metric.description}
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-10 rounded-lg bg-white p-6">
        <div>
          <h3 className="text-lg font-semibold">Sales Overview</h3>
          <p className="text-sm text-neutral-600">
            Overview of sales performance over time
          </p>
        </div>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <AreaChart accessibilityLayer data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', { month: 'short' });
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={20}
              tickFormatter={(value: number) => `${value.toLocaleString()}`}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Area
              dataKey="sales"
              type="monotone"
              fill="none"
              stroke="var(--color-sales)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </div>
    </section>
  );
};

export default DashboardPage;
