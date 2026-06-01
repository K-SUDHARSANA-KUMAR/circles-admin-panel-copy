import { useMutation } from '@tanstack/react-query';
import { fileUploadApi } from '../api/file-upload';
import { generateUUID } from '@/utils/common-utils';

export const useFileUpload = () => {
  const uploadFile = useMutation({
    mutationFn: async (variables: File | { file: File; folder?: string }) => {
      try {
        const file = variables instanceof File ? variables : variables.file;
        const folder = variables instanceof File ? 'outletimages' : (variables.folder || 'outletimages');
        // Validate file
        if (!file) {
          throw new Error('No file provided');
        }

        // Check file size (limit to 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
          throw new Error('File size must be less than 5MB');
        }

        // Check file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          throw new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)');
        }

        // Generate UUID for unique filename
        const uuid = generateUUID();
        const fileExtension = file.name.split('.').pop() || 'jpg';
        const fileName = `${folder}/${uuid}.${fileExtension}`;
        
        // Get pre-signed URL
        const uploadUrlResponse = await fileUploadApi.getUploadUrl({
          fileName,
          contentType: file.type,
        });
        
        // Upload file to S3 using pre-signed URL
        await fileUploadApi.uploadToS3(uploadUrlResponse.data.signedUrl, file);
        
        // Return the S3 filename for use in product creation/update
        return uploadUrlResponse.data.s3FileName;
      } catch (error) {
        console.error('File upload error:', error);
        throw error;
      }
    },
  });

  const uploadMultipleFiles = useMutation({
    mutationFn: async ({ files, folder = 'outletimages' }: { files: File[]; folder?: string }) => {
      try {
        // Validate files
        if (!files || files.length === 0) {
          throw new Error('No files provided');
        }

        // Validate each file
        for (const file of files) {
          // Check file size (limit to 5MB)
          const maxSize = 5 * 1024 * 1024; // 5MB
          if (file.size > maxSize) {
            throw new Error(`File ${file.name} size must be less than 5MB`);
          }

          // Check file type
          const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
          if (!allowedTypes.includes(file.type)) {
            throw new Error(`File ${file.name} is not a valid image type`);
          }
        }

        // Upload all files
        const uploadPromises = files.map(async (file) => {
          const uuid = generateUUID();
          const fileExtension = file.name.split('.').pop() || 'jpg';
          const fileName = `${folder}/${uuid}.${fileExtension}`;
          
          const uploadUrlResponse = await fileUploadApi.getUploadUrl({
            fileName,
            contentType: file.type,
          });
          
          await fileUploadApi.uploadToS3(uploadUrlResponse.data.signedUrl, file);
          
          return uploadUrlResponse.data.s3FileName;
        });

        const s3FileNames = await Promise.all(uploadPromises);
        return s3FileNames;
      } catch (error) {
        console.error('Multiple file upload error:', error);
        throw error;
      }
    },
  });

  return {
    uploadFile,
    uploadMultipleFiles,
  };
}; 