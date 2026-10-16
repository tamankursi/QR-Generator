export type QRCodeStatus = 'kosong' | 'aktif';

export interface QRCodeItem {
  id: string;
  status: QRCodeStatus;
  business_name: string | null;
  target_url: string | null;
  created_at: string;
  activated_at: string | null;
  updated_at: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export interface GenerateRequestBody {
  count: number;
  pin: string;
}

export interface ActivateRequestBody {
  id: string;
  business_name?: string | null;
  target_url: string;
  pin: string;
}

export interface EditRequestBody {
  id: string;
  target_url: string;
  pin: string;
}

export interface DeleteRequestBody {
  id: string;
  pin: string;
}

