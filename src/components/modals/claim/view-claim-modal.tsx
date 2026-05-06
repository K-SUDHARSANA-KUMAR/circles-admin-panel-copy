"use client";


import{
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
}from '@/components/ui/dialog';
import { DialogDescription } from '@radix-ui/react-dialog';
import { ExternalLink } from "lucide-react";

export default function ViewClaimModal({
  open,
  onOpenChange,

}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return(
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[910px] max-h-[80vh] h-[400px] overflow-y-auto">
        <img
          src="/file.svg"
          alt="File Icon"
          className="absolute top-6 left-6 h-6 w-6 object-contain"
        />
        <DialogHeader className="pt-10 pb-0">
          <DialogTitle >Claim View</DialogTitle>
          <DialogDescription>Review the details of the submitted claim</DialogDescription>
        </DialogHeader>
      
        {/* Progress Bar */}
        <div className="flex items-center  rounded-md bg-gray-100 ">
          <div className="flex items-center text-sm font-medium">
            <div className="flex items-center gap-1 rounded-full px-2">
              <span className="bg-green-600 px-3.5 py-1.5 rounded text-white">1</span>
              <span>Status AI</span>
            </div>
          </div>
        
          <div className="w-14 h-0.5 bg-green-600 mx-auto my-4" />

          <div className="flex items-center gap-2 text-sm font-medium">
            <div className="flex items-center gap-1 rounded-full px-3 py-1">
              <span className="bg-green-600 px-3.5 py-1.5 rounded text-white">2</span>
              <span>Zone Head</span>
            </div>
          </div>

          <div className="w-14 h-0.5 bg-green-600 mx-auto my-4" />

          <div className="flex items-center gap-2 text-sm font-medium">
            <div className="flex items-center gap-1 rounded-full px-3 py-1">
              <span className="bg-white px-3.5 py-1.5 rounded text-green-600 border border-green-600">3</span>
              <span>Manager</span>
            </div>
          </div>

          <div className="w-14 h-0.5 border border-dashed bg-gray-600 mx-auto my-4" />

          <div className="flex items-center gap-2 text-sm font-medium">
            <div className="flex items-center gap-1 rounded-full px-3 py-1">
              <span className="px-3.5 py-1.5 rounded text-gray-400 border border-dashed border-gray-400">4</span>
              <span>HR</span>
            </div>
          </div>

          <div className="w-14 h-0.5 border border-dashed bg-gray-600 mx-auto my-4" />

          <div className="flex items-center gap-2 text-sm font-medium">
            <div className="flex items-center gap-1 rounded-full px-3 py-1">
              <span className="px-3.5 py-1.5 rounded text-gray-400 border border-dashed border-gray-400">5</span>
              <span>Accounts</span>
            </div>
          </div>


        </div>

        {/* Claim Info */}
        <div className="flex justify-between">
          <div>
            <p className="text-sm">Claim Type</p>
            <p className="text-base font-bold text-gray-900">Travel</p>
          </div>
          <div>
            <p className="text-sm ">Claim Amount</p>
            <p className="text-base font-bold text-gray-900">400</p>
          </div>
          <div>
            <p className="text-sm ">Claim Date</p>
            <p className=" font-bold text-gray-900">25 May, 2025</p>
          </div>
        </div>

        {/* Attachment & Description */}
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Attachment</p>
            <a
              href="/path/to/attachment.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-400 hover:underline"
            >
              View Attachment
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div>
            <p className="text-sm text-muted-foreground ">Description</p>
              <p>
                <strong>lorm is dummy text, lorem is text.</strong>
              </p>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}

      


