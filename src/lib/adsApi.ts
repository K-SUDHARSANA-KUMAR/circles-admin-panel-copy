import { Advertisement } from '@/types/advertisement';

const BASE = process.env.NEXT_PUBLIC_CONFIG_SERVICE_URL;

function requireBase() {
  if (!BASE) {
    throw new Error(
      'NEXT_PUBLIC_CONFIG_SERVICE_URL is not set. Configure it in your environment (hosting platform env vars or ensure your CI sources .env.prod before build)'
    );
  }
  // normalize (remove trailing slashes)
  return BASE.replace(/\/+$/, '');
}

function authHeaders() {
  if (typeof window === 'undefined') return {} as Record<string, string>;
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type ApiResponse<T> = {
  statusCode: number;
  timestamp: string;
  method: string;
  path: string;
  message: string;
  data: T;
};

export async function getAllAds(): Promise<Advertisement[]> {
  const base = requireBase();
  const res = await fetch(`${base}/advertisements`, {
    cache: 'no-store',
    headers: {
      ...authHeaders(),
    },
  });
  if (!res.ok) throw new Error('Failed to fetch advertisements');
  const json: ApiResponse<any> = await res.json();
  // Normalize list responses: allow either an array or a paginated object with items
  const list: any[] = Array.isArray(json.data)
    ? json.data
    : (json.data && Array.isArray(json.data.items) ? json.data.items : []);
  // Map backend fields to FE model with robust fallbacks
  return list.map((it: any) => ({
    _id: it._id,
    advertisementId: it.advertisementId ?? it.id ?? it._id,
    notes: it.notes ?? it.title,
    budget: it.budget,
    advertisementDate: it.advertisementDate ?? it.date ?? it.advDate,
    advertisementType: it.advertisementType ?? it.adType ?? it.typeName,
    advertisementTypeId: it.advertisementTypeId ?? it.advertisementtypeId ?? it.adTypeId ?? it.typeId ?? it.adTypeID,
    createdAt: it.createdAt,
    updatedAt: it.updatedAt,
  })) as Advertisement[];
}

export async function createAd(input: { notes: string; budget: number; advertisementDate: string; advertisementTypeId: string }) {
  const base = requireBase();
  const res = await fetch(`${base}/advertisements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    // Send new contract fields directly
    body: JSON.stringify({
      notes: input.notes,
      budget: input.budget,
      advertisementDate: input.advertisementDate,
      advertisementTypeId: input.advertisementTypeId,
    }),
  });
  if (!res.ok) throw new Error(`Create failed: ${await res.text()}`);
  const json: ApiResponse<any> = await res.json();
  const it = json.data;
  return {
    _id: it._id,
    advertisementId: it.advertisementId ?? it.id ?? it._id,
    notes: it.notes ?? it.title,
    budget: it.budget,
    advertisementDate: it.advertisementDate ?? it.date ?? it.advDate,
    advertisementType: it.advertisementType ?? it.adType ?? it.typeName,
    advertisementTypeId: it.advertisementTypeId ?? it.advertisementtypeId ?? it.adTypeId ?? it.typeId ?? it.adTypeID,
    createdAt: it.createdAt,
    updatedAt: it.updatedAt,
  } as Advertisement;
}

export async function updateAd(
  id: string,
  input: Partial<Pick<Advertisement, 'notes' | 'budget' | 'advertisementDate' | 'advertisementTypeId'>>,
) {
  const base = requireBase();
  const res = await fetch(`${base}/advertisements/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    // Send new contract fields directly
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Update failed: ${await res.text()}`);
  const json: ApiResponse<any> = await res.json();
  const it = json.data;
  return {
    _id: it._id,
    notes: it.notes ?? it.title,
    budget: it.budget,
    advertisementDate: it.advertisementDate ?? it.date ?? it.advDate,
    advertisementType: it.advertisementType ?? it.adType ?? it.typeName,
    advertisementTypeId: it.advertisementTypeId ?? it.advertisementtypeId ?? it.adTypeId ?? it.typeId ?? it.adTypeID,
    createdAt: it.createdAt,
    updatedAt: it.updatedAt,
  } as Advertisement;
}

export async function deleteAd(id: string) {
  const base = requireBase();
  const res = await fetch(`${base}/advertisements/${id}`, {
    method: 'DELETE',
    headers: {
      ...authHeaders(),
    },
  });
  if (!res.ok) throw new Error(`Delete failed: ${await res.text()}`);
  // Some delete endpoints may return body; handle both gracefully
  try {
    const json: ApiResponse<unknown> = await res.json();
    return json.data;
  } catch {
    return;
  }
}
