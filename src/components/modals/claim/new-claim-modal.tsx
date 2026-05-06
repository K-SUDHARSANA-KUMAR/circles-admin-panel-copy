'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { DialogDescription } from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormField,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  claimFormSchema,
  type ClaimFormData,
} from '@/lib/schemas/claim-schema';
import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, CalendarIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { IconCoinRupee, IconLoader3 } from '@tabler/icons-react';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { MasterRecordDropdown } from '@/components/shared/master-record-dropdown-filter';
import { useClaims } from '@/features/dashboard/claims/hooks/useClaims';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setSelectedValue } from '@/store/slices/masterRecordsSlice';
import NavKeys from '@/constants/navkeys';

interface BillProcessResponse {
  'Bill No': string;
  Date: string;
  IsHandwritten: boolean;
  'Total Amount': string;
  legitimacy_reasons: string[];
  legitimacy_score: number;
  s3_filename?: string;
}

export default function NewClaimModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [isProcessing, setIsProcessing] = useState(false);
  const [billData, setBillData] = useState<BillProcessResponse | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { createClaim } = useClaims();
  const userId = useAppSelector((state) => state.auth.user?.userId);

  
  const form = useForm<ClaimFormData>({
    resolver: zodResolver(claimFormSchema),
    mode: 'onChange',
    defaultValues: {
      claimType: undefined,
      attachment: undefined,
      claimAmount: 0,
      claimDate: new Date(),
      invoiceNumber: '',
      description: '',
      legitimacyScore: 0,
      legitimacyReasons: [],
    },
  });

  // Function to reset everything
  const resetModal = useCallback(() => {
    form.reset({
      claimType: undefined,
      attachment: undefined,
      claimAmount: 0,
      claimDate: new Date(),
      invoiceNumber: '',
      description: '',
      legitimacyScore: 0,
      legitimacyReasons: [],
    });

    // Clear Redux state for MasterRecordDropdown
    dispatch(setSelectedValue({ masterName: 'claimType', value: '' }));

    setBillData(null);
    setIsProcessing(false);
    setUploadedFileName('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [form, dispatch]);

  useEffect(() => {
    if (!open) {
      resetModal();
    }
  }, [open, resetModal]);

  const processBill = async (file: File) => {
    const PROCESS_BILL_ENDPOINT = process.env.NEXT_PUBLIC_AI_SERVICE_URL as string;
    try {
      setIsProcessing(true);
      console.log('Processing bill with endpoint:', PROCESS_BILL_ENDPOINT);
      console.log('File being processed:', file.name, file.size, file.type);
      
      const formData = new FormData();
      formData.append('file', file);
      console.log('FormData created, making API call...');

      const response = await fetch(PROCESS_BILL_ENDPOINT, {
        method: 'POST',
        body: formData,
      });
      

      if (!response.ok) {
        throw new Error('Failed to process bill');
      }

      const data: BillProcessResponse = await response.json();
      setBillData(data);

      // Store the S3 filename from AI service response, or fallback to original filename
      setUploadedFileName(data.s3_filename || file.name);

      // Update form with bill data
      form.setValue('invoiceNumber', data['Bill No'] || '');
      // Handle null total amount
      const totalAmount = data['Total Amount']
        ? parseFloat(data['Total Amount'])
        : 0;
      form.setValue('claimAmount', isNaN(totalAmount) ? 0 : totalAmount);

      // Parse and set date
      try {
        if (data['Date'] && data['Date'].trim() !== '') {
          const dateParts = data['Date'].split('.');
          if (dateParts.length === 3) {
            const [day, month, year] = dateParts;
            const dayNum = parseInt(day);
            const monthNum = parseInt(month);
            const yearNum = parseInt(year);

            // Validate date parts
            if (!isNaN(dayNum) && !isNaN(monthNum) && !isNaN(yearNum)) {
              // Handle 2-digit years (assuming 20XX for years 00-99)
              const fullYear = yearNum < 100 ? 2000 + yearNum : yearNum;

              // Create date and validate it
              const date = new Date(fullYear, monthNum - 1, dayNum);

              // Check if the date is valid by comparing the components
              if (
                date.getFullYear() === fullYear &&
                date.getMonth() === monthNum - 1 &&
                date.getDate() === dayNum
              ) {
                form.setValue('claimDate', date);
              } else {
                console.warn('Invalid date components:', {
                  day: dayNum,
                  month: monthNum,
                  year: fullYear,
                });
              }
            } else {
              console.warn(
                'Invalid date format - non-numeric components:',
                data['Date']
              );
            }
          } else {
            console.warn(
              'Invalid date format - expected DD.MM.YY:',
              data['Date']
            );
          }
        } else {
          console.warn('Empty or invalid date string');
        }
      } catch (dateError) {
        console.error('Error parsing date:', dateError);
        // Don't set the date if parsing fails
      }

      // Set legitimacy data
      form.setValue('legitimacyScore', data.legitimacy_score || 0);
      form.setValue('legitimacyReasons', data.legitimacy_reasons || []);

      toast.success('Bill processed successfully');
      console.log('Bill processed successfully, data:', data);
    } catch (error) {
      toast.error('Failed to process bill');
      console.error('Error processing bill:', error);
    } finally {
      setIsProcessing(false);
      console.log('Processing completed');
    }
  };

  const onSubmit = async (data: ClaimFormData) => {
    try {
      // Validate required fields
      if (!data.claimType) {
        toast.error('Please select a claim type');
        return;
      }

      if (!userId) {
        toast.error('User ID is required');
        return;
      }

      const payload = {
        userId: userId,
        claimStatus: "pending",
        claimTypeId: data.claimType,
        invoiceNumber: data.invoiceNumber,
        claimAmount: data.claimAmount,
        claimDate: data.claimDate.toISOString(),
        description: data.description || '',
        legitimacyScore:
          billData?.legitimacy_score || data.legitimacyScore || 0,
        handWritten: billData?.IsHandwritten || false,
        aiResponse:
          billData?.legitimacy_reasons || data.legitimacyReasons || [],
        attachments: [
          {
            content: 'Invoice',
            itemImageS3FileName: 'testfile.png',
          },
        ],
      };

      await createClaim.mutateAsync(payload);

      toast.success('Claim created successfully');

      // Close and reset modal after successful submission
      onOpenChange(false);

      // Navigate to my claims page
      router.push(NavKeys.MyClaims);
    } catch (error) {
      console.error('Failed to create claim:', error);
      toast.error('Failed to create claim');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] w-full max-w-[910px] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle>
            <div className="flex flex-col">
              <div className="bg-freshleaf/10 w-fit rounded-full p-2">
                <IconCoinRupee className="text-freshleaf h-5 w-5" />
              </div>
              <div className="text-xl font-medium">New Claim</div>
              <div className="text-sm font-normal text-zinc-500">
                Provide information to create claim
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="rounded-lg bg-white">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="col-span-2">
                  <FormLabel>Upload Bill</FormLabel>
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        console.log('Opening file picker');
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*,.jpg,.jpeg,.png,.gif,.bmp,.webp';
                        input.onchange = (e) => {
                          const target = e.target as HTMLInputElement;
                          const file = target.files?.[0];
                          if (file) {
                            console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type);
                            // Process the bill immediately
                            processBill(file);
                          } else {
                            console.log('No file selected');
                          }
                        };
                        input.click();
                      }}
                      disabled={isProcessing}
                    >
                      Choose Image File
                    </Button>
                    {isProcessing && (
                      <div className="text-muted-foreground flex items-center gap-2 text-sm">
                        <IconLoader3 className="h-4 w-4 animate-spin text-freshleaf" />
                        Processing...
                      </div>
                    )}
                  </div>
                </div>

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
                            {billData.legitimacy_reasons.map(
                              (reason, index) => (
                                <li key={index}>{reason}</li>
                              )
                            )}
                          </ul>
                        </AlertDescription>
                      )}
                    </Alert>

                    <Alert variant="default">
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
                      <FormControl>
                        <MasterRecordDropdown
                          masterName="claimType"
                          value={field.value || undefined}
                          onChange={field.onChange}
                          placeholder="Claim Type"
                        />
                      </FormControl>
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
                          value={field.value || 0}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            field.onChange(isNaN(value) ? 0 : value);
                          }}
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
                    <FormItem className="flex flex-col">
                      <FormLabel>Claim Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="white"
                              className={cn(
                                'w-full bg-white pl-3 text-left font-normal',
                                !field.value && 'bg-white'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP')
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date('1900-01-01')
                            }
                          />
                        </PopoverContent>
                      </Popover>
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
                        <Input
                          placeholder="Enter invoice number"
                          {...field}
                          value={field.value || ''}
                        />
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
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetModal();
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createClaim.isPending}>
                {createClaim.isPending ? 'Creating...' : 'Create Claim'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
