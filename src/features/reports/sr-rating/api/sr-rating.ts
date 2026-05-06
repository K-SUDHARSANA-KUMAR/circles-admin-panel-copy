import { apiEndPoint } from '@/features/apiEndPoint';

const { REPORT_SERVICE_URL } = apiEndPoint;

export interface SrRatingReportParams {
  warehouseIds?: string[];
  userIds?: string[];
  startDate?: string;
  endDate?: string;
}

export const srRatingApi = {
  downloadReport: async (params: SrRatingReportParams): Promise<Blob> => {
    const queryParams = new URLSearchParams();
    
    if (params.warehouseIds && params.warehouseIds.length > 0) {
      queryParams.append('warehouseIds', JSON.stringify(params.warehouseIds));
    }
    
    if (params.userIds && params.userIds.length > 0) {
      queryParams.append('userIds', JSON.stringify(params.userIds));
    }
    
    if (params.startDate) {
      queryParams.append('startDate', params.startDate);
    }
    
    if (params.endDate) {
      queryParams.append('endDate', params.endDate);
    }

    const url = `${REPORT_SERVICE_URL}/sr-rating/consolidated-performance/excel?${queryParams.toString()}`;
    
    console.log('SR Rating Report API URL:', url);
    console.log('SR Rating Report params:', params);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    console.log('SR Rating Report blob size:', blob.size);
    console.log('SR Rating Report blob type:', blob.type);
    
    return blob;
  },
};
