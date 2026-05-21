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
    color: 'var(--primary)',
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
    <section className="w-full space-y-10 p-2">
      <PageHeader title="Dashboard" />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {dashboardMetrics.map((metric, index) => {
          const IconComponent = metric.icon;
          return (
            <Card key={index} className="border-white/5 hover:border-primary/20 transition-all duration-500 group">
              <CardHeader className="flex flex-row items-center gap-5 border-b border-white/5 pb-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-primary glow-primary/10 group-hover:glow-primary/20 transition-all">
                  <IconComponent size={32} />
                </div>
                <div className="flex flex-col">
                  <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{metric.title}</CardTitle>
                  <div className="text-4xl font-bold tracking-tight mt-1 text-white">{metric.value}</div>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                <p className="text-sm text-muted-foreground font-medium">
                  {metric.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-white/5 overflow-hidden">
        <CardHeader className="p-8 pb-0">
          <CardTitle className="text-3xl font-bold">Users Overview</CardTitle>
          <CardDescription className="text-muted-foreground text-base mt-2">
            User Analytics
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-10">
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <AreaChart accessibilityLayer data={chartData} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={20}
                tick={{ fill: '#9CA3AF', fontSize: 13, fontWeight: 500 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', { month: 'short' });
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={30}
                tick={{ fill: '#9CA3AF', fontSize: 13, fontWeight: 500 }}
                tickFormatter={(value: number) => `${value.toLocaleString()}`}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent className="glass-morphism border-white/10 p-4 rounded-xl" />} />
              <Area
                dataKey="sales"
                type="monotone"
                fill="url(#colorSales)"
                stroke="var(--primary)"
                strokeWidth={4}
                dot={{ fill: 'var(--primary)', strokeWidth: 3, r: 5, strokeOpacity: 0.8 }}
                activeDot={{ r: 8, strokeWidth: 0, fill: '#fff', className: 'glow-primary' }}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </section>
  );
};

export default DashboardPage;
