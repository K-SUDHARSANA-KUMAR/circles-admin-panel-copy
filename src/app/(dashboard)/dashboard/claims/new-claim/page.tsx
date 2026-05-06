'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  claimFormSchema,
  type ClaimFormData,
} from '@/lib/schemas/claim-schema';
import {
  Form,
  FormField,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, Home } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import NavKeys from '@/constants/navkeys';

const claimTypeOptions = [
  { label: 'Food', value: 'food' },
  { label: 'Lodging', value: 'lodging' },
  { label: 'Travel', value: 'travel' },
  { label: 'Others', value: 'others' },
];

interface BillProcessResponse {
  'Bill No': string;
  Date: string;
  IsHandwritten: boolean;
  'Total Amount': string;
  legitimacy_reasons: string[];
  legitimacy_score: number;
}

export default function NewClaimPage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [billData, setBillData] = useState<BillProcessResponse | null>(null);

  const [userId, setUserId] = useState(null);

  useEffect(() => {
    try {
      const userRaw = localStorage.getItem('user');
      console.log(userRaw, 'userRaw from localStorage');
      if (userRaw) {
        const parsedUser = JSON.parse(userRaw);
        console.log(parsedUser, 'parsed user');
        setUserId(parsedUser);
      } else {
        console.log('No user data found in localStorage');
      }
    } catch (err) {
      console.error('Error reading localStorage:', err);
    }
  }, []);

  const form = useForm<ClaimFormData>({
    resolver: zodResolver(claimFormSchema),
    defaultValues: {
      claimType: undefined,
      attachment: '',
      claimAmount: 0,
      claimDate: undefined,
      invoiceNumber: '',
      description: '',
      legitimacyScore: undefined,
      legitimacyReasons: undefined,
    },
  });

  const processBill = async (file: File) => {
    const PROCESS_BILL_ENDPOINT = process.env
      .NEXT_PUBLIC_AI_SERVICE_URL as string;
    try {
      setIsProcessing(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(PROCESS_BILL_ENDPOINT, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process bill');
      }

      const data: BillProcessResponse = await response.json();
      setBillData(data);

      // Update form with bill data
      form.setValue('invoiceNumber', data['Bill No']);
      // Handle null total amount
      const totalAmount = data['Total Amount']
        ? parseFloat(data['Total Amount'])
        : 0;
      form.setValue('claimAmount', totalAmount);

      // Parse and set date
      const [day, month, year] = data['Date'].split('.');
      const date = new Date(
        2000 + parseInt(year),
        parseInt(month) - 1,
        parseInt(day)
      );
      form.setValue('claimDate', date);

      // Set legitimacy data
      form.setValue('legitimacyScore', data.legitimacy_score);
      form.setValue('legitimacyReasons', data.legitimacy_reasons);

      toast.success('Bill processed successfully');
    } catch (error) {
      toast.error('Failed to process bill');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const onSubmit = async (data: ClaimFormData) => {
    try {
      // TODO: Implement API call to create claim
      console.log(data);
      toast.success('Claim created successfully');
      router.push(NavKeys.MyClaims);
    } catch (error) {
      toast.error('Failed to create claim');
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">
                <Home className="h-4 w-4" />
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={NavKeys.Claims}>Claims</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>New Claim</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href={NavKeys.MyClaims}>
            <Button variant="ghost" size="icon">
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">New Claim</h1>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="rounded-lg bg-white p-4">
            <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
              Claim Information
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="attachment"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Upload Bill</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-4">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              processBill(file);
                            }
                          }}
                          disabled={isProcessing}
                        />
                        {isProcessing && (
                          <div className="text-muted-foreground flex items-center gap-2 text-sm">
                            <div className="border-primary h-4 w-4 animate-spin rounded-full border-b-2"></div>
                            Processing...
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {billData && (
                <div className="col-span-2 space-y-4">
                  <Alert
                    variant={
                      billData.legitimacy_score >= 80
                        ? 'default'
                        : 'destructive'
                    }
                  >
                    {billData.legitimacy_score >= 80 ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertTitle>
                      Legitimacy Score: {billData.legitimacy_score}%
                    </AlertTitle>
                    {billData.legitimacy_reasons.length > 0 && (
                      <AlertDescription>
                        <ul className="list-inside list-disc">
                          {billData.legitimacy_reasons.map((reason, index) => (
                            <li key={index}>{reason}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    )}
                  </Alert>

                  <Alert variant="outline">
                    <AlertTitle>Bill Details</AlertTitle>
                    <AlertDescription>
                      <div className="mt-2 space-y-1">
                        <p className="flex items-center gap-2">
                          <span className="font-medium">Handwritten:</span>
                          <span
                            className={
                              billData.IsHandwritten
                                ? 'text-yellow-600'
                                : 'text-green-600'
                            }
                          >
                            {billData.IsHandwritten ? 'Yes' : 'No'}
                          </span>
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="font-medium">Bill Date:</span>
                          <span>{billData['Date']}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="font-medium">Bill Number:</span>
                          <span>{billData['Bill No']}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="font-medium">Total Amount:</span>
                          <span>
                            {billData['Total Amount']
                              ? `₹${billData['Total Amount']}`
                              : 'Not available'}
                          </span>
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>

                  {billData.legitimacy_score < 80 && (
                    <Alert variant="destructive" className="border-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Warning: Low Legitimacy Score</AlertTitle>
                      <AlertDescription>
                        <p className="mt-2">
                          This bill has a low legitimacy score. Please verify
                          the following:
                        </p>
                        <ul className="mt-2 list-inside list-disc">
                          <li>Ensure the bill is clear and readable</li>
                          <li>Verify the bill date and amount</li>
                          <li>Check if the bill is properly signed</li>
                          <li>Confirm the bill number matches the receipt</li>
                        </ul>
                        <p className="mt-2 font-medium">
                          You may proceed, but please be aware that this claim
                          might require additional verification.
                        </p>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              <FormField
                control={form.control}
                name="claimType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Claim Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select claim type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {claimTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="claimAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Claim Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="claimDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Claim Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        date={field.value}
                        onSelect={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter invoice number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter description"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(NavKeys.MyClaims)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Claim</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
