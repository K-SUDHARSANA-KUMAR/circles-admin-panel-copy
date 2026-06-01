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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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
    color: 'var(--color-primary)',
  },
} satisfies ChartConfig;

const dashboardMetrics = [
  {
    
    icon: IconUsers,
    title: 'Total Users',
    value: '2,455',
    description: 'Total number of users',
  },
  {
    icon: IconShoppingCart,
    title: 'Active Venues',
    value: '10,252',
    description: 'All spaces listed and active',
  },
  {
    icon: IconPackage,
    title: '$Revenue',
    value: '$3,210k',
    description: 'Earned from bookings and partnerships',
  },
];

const DashboardPage = () => {
  return (
    <section className="flex flex-col gap-5 w-full max-w-[1400px] mx-auto animate-in fade-in duration-700">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {dashboardMetrics.map((metric, index) => {
          const IconComponent = metric.icon;
          return (
            <Card key={index} className="border-[#333333] bg-[#222222] transition-colors duration-200 group">
              <CardHeader className="flex flex-row items-center gap-3.5 border-b border-[#333333] pb-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#333333] bg-[#171717] text-primary transition-colors">
                  <IconComponent size={20} />
                </div>
                <div className="flex flex-col">
                  <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{metric.title}</CardTitle>
                  <div className="text-2xl font-bold tracking-tight mt-0.5 text-white">{metric.value}</div>
                </div>
              </CardHeader>
              <CardContent className="pt-3">
                <p className="text-xs text-muted-foreground/80 font-normal">
                  {metric.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-[#333333] bg-[#222222] overflow-hidden">
        <CardHeader className="p-5 pb-0">
          <CardTitle className="text-base font-bold text-white">Users Overview</CardTitle>
          <CardDescription className="text-muted-foreground text-xs mt-1">
            Registered user signup velocity and monthly analytics.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-4">
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <AreaChart accessibilityLayer data={chartData} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 500 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', { month: 'short' });
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={12}
                tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 500 }}
                tickFormatter={(value: number) => `${value.toLocaleString()}`}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent className="bg-card border border-border p-3 rounded-lg text-xs" />} />
              <Area
                dataKey="sales"
                type="monotone"
                fill="url(#colorSales)"
                stroke="var(--color-primary)"
                strokeWidth={3}
                dot={{ fill: 'var(--color-primary)', strokeWidth: 1, r: 3, strokeOpacity: 0.8 }}
                activeDot={{ r: 5, strokeWidth: 0, fill: '#fff' }}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </section>
  );
};

export default DashboardPage;
