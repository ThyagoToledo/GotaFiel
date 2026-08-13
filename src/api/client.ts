import type { AnalysisData } from '../types';

export interface AuthUser {
  id: string;
  name: string;
}

export interface ApiAnalysis extends AnalysisData {
  remoteOnly?: boolean;
  fieldName?: string | null;
  crop?: string | null;
}

type ApiError = { error?: string };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    credentials: 'include',
  });
  const body = (await response.json().catch(() => ({}))) as T & ApiError;
  if (!response.ok) throw new Error(body.error ?? `HTTP_${response.status}`);
  return body;
}

export const api = {
  getMe: () => request<{ user: AuthUser | null }>('/api/auth/me'),
  login: (name: string, password: string) => request<{ user: AuthUser }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ name, password }) }),
  register: (name: string, password: string) => request<{ user: AuthUser }>('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, password }) }),
  logout: () => request<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
  listAnalyses: () => request<{ analyses: ApiAnalysis[] }>('/api/analyses'),
  createAnalysis: (analysis: AnalysisData) => request<{ analysis: ApiAnalysis }>('/api/analyses', { method: 'POST', body: JSON.stringify(toPersistedAnalysis(analysis)) }),
  deleteAnalysis: (id: string) => request<{ ok: true }>(`/api/analyses?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
  uploadImage: (dataUrl: string, analysisId: string, kind: 'original' | 'rectified') => request<{ url: string }>('/api/images', { method: 'POST', body: JSON.stringify({ dataUrl, analysisId, kind }) }),
};

/** Nunca inclui foto, recorte, máscara, histograma ou a lista de gotas. */
function toPersistedAnalysis(analysis: AnalysisData) {
  return {
    id: analysis.id,
    title: analysis.title,
    fieldId: analysis.fieldId,
    fieldName: analysis.fieldName,
    crop: analysis.crop,
    imageUrl: analysis.imageUrl.startsWith('https://') ? analysis.imageUrl : undefined,
    rectifiedImageUrl: analysis.rectifiedImageUrl?.startsWith('https://') ? analysis.rectifiedImageUrl : undefined,
    cardSizeMm: analysis.cardSizeMm,
    sensitivity: analysis.sensitivity,
    method: 'chromatic',
    totalDroplets: analysis.totalDroplets,
    density: analysis.density,
    coveragePercent: analysis.coveragePercent,
    span: analysis.span,
    vmdUm: analysis.vmdUm,
    dv01Um: analysis.dv01Um,
    dv09Um: analysis.dv09Um,
    estimatedVolumeLha: analysis.estimatedVolumeLha,
    verdict: analysis.verdict,
    verdictScore: analysis.verdictScore,
    verdictMessage: analysis.verdictMessage,
    asabeCategory: analysis.asabeCategory,
  };
}
