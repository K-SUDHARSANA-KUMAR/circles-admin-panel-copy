export interface CreateClaimPayload {
  claimTypeId: string;
  invoiceNumber: string;
  claimAmount: number;
  claimDate: string;
  description: string;
  legitimacyScore: number;
  handWritten: boolean;
  aiResponse: string[];
  attachments: {
    content: string;
    itemImageS3FileName: string;
  }[];
}