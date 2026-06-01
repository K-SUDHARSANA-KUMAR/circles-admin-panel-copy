import { apiEndPoint } from '@/features/apiEndPoint';
import axios from 'axios';
import { UploadUrlRequest, UploadUrlResponse } from '../types/common.types';
import customAxios from '@/lib/axios';

const getFileServiceUrl = (): string => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (baseUrl) {
    return `${baseUrl}/user-service`;
  }
  if (apiEndPoint.CITIES_ENDPOINT) {
    return (apiEndPoint.CITIES_ENDPOINT as string).replace('/cities', '');
  }
  return '/user-service';
};

const FILE_SERVICE_URL = getFileServiceUrl();

export const fileUploadApi = {
  getUploadUrl: async (data: UploadUrlRequest): Promise<UploadUrlResponse> => {
    const response = await customAxios.post(
      `${FILE_SERVICE_URL}/aws-store/upload-url`,
      data
    );
    return response.data;
  },

  uploadToS3: async (signedUrl: string, file: File): Promise<void> => {
    const arrayBuffer = await file.arrayBuffer();
    const response = await fetch(signedUrl, {
      method: 'PUT',
      body: arrayBuffer,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Failed to upload to S3: ${response.status} ${response.statusText}. ${errorText}`);
    }
  },
};
