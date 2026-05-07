'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import React from 'react';
import { Trash2, Plus } from 'lucide-react';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import BreadcrumbHeader from '@/components/breadcrumb/breadcrumb';
import { getBreadcrumbData } from '@/constants/breadcrumb-config';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import NavKeys from '@/constants/navkeys';

const ClaimCreatePage = () => {
  const [deductions, setDeductions] = React.useState([
    { claimDays: '', claimDeduction: '', isOriginal: true },
  ]);

  const form = useForm({
    defaultValues: {
      band: '',
      limitPer: '',
      claimType: '',
      subType: '',
      amountLimited: '',
      autoApprove: '',
      description: '',
    },
    mode: 'onChange',
  });

  const onSubmit = (data: any) => {
    // Handle claim creation logic here
    console.log('Claim data:', data);
  };

  // Use breadcrumb config utility for consistency
  const breadcrumbProps = getBreadcrumbData('claimsConfig', 'create');

  return (
    <section className="w-full space-y-6">
      <div className="flex flex-col gap-3 rounded-lg bg-card">
        <BreadcrumbHeader {...breadcrumbProps} />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="rounded-lg bg-card p-4 w-full">
            <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium w-full">
              Claim Information
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              {/* Band Select */}
              <FormField
                control={form.control}
                name="band"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Band</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange} defaultValue="">
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Band" />
                        </SelectTrigger>
                        <SelectContent className="w-full">
                          <SelectItem value="A">A</SelectItem>
                          <SelectItem value="B">B</SelectItem>
                          <SelectItem value="C">C</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Limit Per Select */}
              <FormField
                control={form.control}
                name="limitPer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Limit Per</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange} defaultValue="">
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Limit Per" />
                        </SelectTrigger>
                        <SelectContent className="w-full">
                          <SelectItem value="Day">Day</SelectItem>
                          <SelectItem value="Week">Week</SelectItem>
                          <SelectItem value="Month">Month</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Claim Type Select */}
              <FormField
                control={form.control}
                name="claimType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Claim Type</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange} defaultValue="">
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Claim Type" />
                        </SelectTrigger>
                        <SelectContent className="w-full">
                          <SelectItem value="Travel">Travel</SelectItem>
                          <SelectItem value="Food">Food</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Sub Type Select */}
              <FormField
                control={form.control}
                name="subType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sub Type</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange} defaultValue="">
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Sub Type" />
                        </SelectTrigger>
                        <SelectContent className="w-full">
                          <SelectItem value="Local">Local</SelectItem>
                          <SelectItem value="Outstation">Outstation</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Amount Limited Select */}
              <FormField
                control={form.control}
                name="amountLimited"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount Limited</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange} defaultValue="">
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Amount Limited" />
                        </SelectTrigger>
                        <SelectContent className="w-full">
                          <SelectItem value="100">100</SelectItem>
                          <SelectItem value="500">500</SelectItem>
                          <SelectItem value="1000">1000</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Auto Approve Input */}
              <FormField
                control={form.control}
                name="autoApprove"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Auto Approve</FormLabel>
                    <FormControl>
                      <Input placeholder="Select" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          {/* Deductions Section */}
          <div className="rounded-lg bg-card p-4 w-full">
            <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium w-full">
              Deductions
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              {deductions.map((ded, idx) => (
                <React.Fragment key={idx}>
                  <FormItem>
                    <FormLabel>Claim Days</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter"
                        className="w-full"
                        value={ded.claimDays}
                        onChange={e => {
                          const newArr = [...deductions];
                          newArr[idx].claimDays = e.target.value;
                          setDeductions(newArr);
                        }}
                      />
                    </FormControl>
                  </FormItem>
                  <FormItem>
                    <FormLabel>Claim Deduction</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter"
                        className="w-full"
                        value={ded.claimDeduction}
                        onChange={e => {
                          const newArr = [...deductions];
                          newArr[idx].claimDeduction = e.target.value;
                          setDeductions(newArr);
                        }}
                      />
                    </FormControl>
                  </FormItem>
                  {/* Trash icon for extra pairs only */}
                  <div className="flex items-end h-full pt-6">
                    {!ded.isOriginal && (
                      <button
                        type="button"
                        className="text-destructive hover:bg-destructive/10 rounded-md p-2"
                        onClick={() => setDeductions(deductions.filter((_, i) => i !== idx))}
                        aria-label="Delete deduction"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </React.Fragment>
              ))}
            </div>
            <div className="flex justify-start mt-4">
              <button
                type="button"
                onClick={() => setDeductions([...deductions, { claimDays: '', claimDeduction: '', isOriginal: false }])}
                className="flex flex-row items-center px-3 py-2 gap-2 w-[186px] h-[43px] bg-[#F4F4F4] rounded-[8px] text-[18px] font-normal text-[#333] hover:bg-[#eaeaea]"
                style={{ background: 'color(display-p3 0.957 0.957 0.957)' }}
              >
                <Plus className="w-[20px] h-[20px] text-[#333]" />
                <span style={{ fontFamily: 'var(--font-inter)', lineHeight: '27px' }}>Add Deduction</span>
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" asChild>
              <Link href={NavKeys.ClaimConfigLimit}>Cancel</Link>
            </Button>
            <Button type="submit">Add Claim</Button>
          </div>
        </form>
      </Form>
    </section>
  );
};

export default ClaimCreatePage;