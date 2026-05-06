import { apiEndPoint } from '@/features/apiEndPoint';

const { REPORT_SERVICE_URL } = apiEndPoint;

export interface FlexiPayReportParams {
  warehouseIds?: string[];
  userIds?: string[];
  startDate?: string;
  endDate?: string;
}

export const flexiPayApi = {
  downloadReport: async (params: FlexiPayReportParams): Promise<Blob> => {
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

    const url = `${REPORT_SERVICE_URL}/flexipay?${queryParams.toString()}`;
    
    console.log('Flexi Pay Report API URL:', url);
    console.log('Flexi Pay Report params:', params);
    
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
    console.log('Flexi Pay Report blob size:', blob.size);
    console.log('Flexi Pay Report blob type:', blob.type);
    
    return blob;
  },
};
