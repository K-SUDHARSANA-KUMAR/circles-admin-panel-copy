"use client";
import {FormField, FormItem, FormLabel, FormControl, FormMessage} from "@/components/ui/form";
import {Input} from "@/components/ui/input";

type Props = {
    form: any;
    disabled?: boolean;
};

export const BankDetailsSection = ({form, disabled = false}: Props) => {
    return (
        <div className="rounded-lg bg-card p-4">
            <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">Bank Details</div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                control={form.control}
                name="bankDetails.bankName"
                render={({field}) => (
                    <FormItem>
                        <FormLabel>Bank Name</FormLabel>
                        <FormControl>
                            <Input type="text" placeholder="Enter bank name" {...field} value={field.value || ''} disabled={disabled}/>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="bankDetails.branchName"
                render={({field}) => (
                    <FormItem>
                        <FormLabel>Branch Name</FormLabel>
                        <FormControl>
                            <Input type="text" placeholder="Enter branch name" {...field} value={field.value || ''} disabled={disabled}/>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
                />

                <FormField
                control={form.control}
                name="bankDetails.accountNumber"
                render={({field}) => (
                    <FormItem>
                        <FormLabel>Account Number</FormLabel>
                        <FormControl>
                            <Input type="text" placeholder="Enter account number" {...field} 
                            value={field.value || ''} disabled={disabled}/>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
                />

                <FormField
                control={form.control}
                name="bankDetails.ifscCode"
                render={({field}) => (
                    <FormItem>
                        <FormLabel>IFSC Code</FormLabel>
                        <FormControl>
                            <Input type="text" placeholder="Enter IFSC code" {...field} value={field.value || ''} disabled={disabled}/>
                        </FormControl>
                <FormMessage />
                </FormItem>
                )}
                />
            </div>
        </div>
    );
};
export default BankDetailsSection;