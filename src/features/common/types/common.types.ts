export interface UploadUrlRequest {
  fileName: string;
  contentType: string;
}

export interface UploadUrlResponse {
  statusCode: number;
  timestamp: string;
  method: string;
  path: string;
  message: string;
  data: {
    signedUrl: string;
    s3FileName: string;
  };
}