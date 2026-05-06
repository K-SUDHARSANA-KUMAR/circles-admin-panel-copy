import axios from 'axios';
import { CreateTargetPayload } from '../types/target.types';
import customAxios from '@/lib/axios';

const API = process.env.NEXT_PUBLIC_REPORT_SERVICE_URL;

export const getTargets = (token: string, skip: number = 0, limit: number = 10) => {
  return customAxios.get(`${API}/target`, {
    params: {
      skip,
      limit,
    },
  });
};

export const getTargetById = (id: string) => {
  return customAxios.get(`${API}/target/${id}`);
};

export const createTarget = (data: CreateTargetPayload) => {
  return customAxios.post(`${API}/target`, data);
};

export const updateTarget = (id: string, data: any) => {
  return customAxios.put(`${API}/target/${id}`, data);
};

export const updateTargetStatus = (id: string, status: string) => {
  return customAxios.patch(`${API}/target/${id}/status`, { status });
};

export const deleteTarget = (id: string) => {
  return customAxios.delete(`${API}/target/${id}`);
};