import { apiEndPoint } from '@/features/apiEndPoint';
import axios from 'axios';
import { UploadUrlRequest, UploadUrlResponse } from '../types/common.types';
import customAxios from '@/lib/axios';

const { FILE_SERVICE_URL } = apiEndPoint;

export const fileUploadApi = {
  getUploadUrl: async (data: UploadUrlRequest): Promise<UploadUrlResponse> => {
    const response = await customAxios.post(
      `${FILE_SERVICE_URL}/aws-store/upload-url`,
      data
    );
    return response.data;
  },

  uploadToS3: async (signedUrl: string, file: File): Promise<void> => {
    await axios.put(signedUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
    });
  },
};
