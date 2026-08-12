import { PersistedAnalysis } from '../core/types';
import { computeMetricsFromHistogram } from '../core/imageProcessor';

const DB_NAME = 'SprayAnalysisDB';
const DB_VERSION = 1;
const STORE_NAME = 'analyses';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB não está disponível neste ambiente.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function savePersistedAnalysis(analysis: PersistedAnalysis): Promise<void> {
  // Strip out any image data, blob URLs, base64 strings or pixel masks
  const sanitized: PersistedAnalysis = {
    id: analysis.id || `ana-${Date.now()}`,
    timestamp: analysis.timestamp || Date.now(),
    title: analysis.title || 'Amostra de Pulverização',
    fieldId: analysis.fieldId,
    fieldName: analysis.fieldName,
    date: analysis.date || new Date().toLocaleDateString('pt-BR'),
    cardSizeMm: {
      width: analysis.cardSizeMm.width,
      height: analysis.cardSizeMm.height,
    },
    mmPerPixel: analysis.mmPerPixel,
    params: {
      method: analysis.params.method,
      thresholdAdjustment: analysis.params.thresholdAdjustment,
      minAreaPx: analysis.params.minAreaPx,
      minDropletUm: analysis.params.minDropletUm,
      discardBorder: analysis.params.discardBorder,
      roundnessMin: analysis.params.roundnessMin,
    },
    histogram: analysis.histogram.map((bin) => ({
      pixelCount: bin.pixelCount,
      quantity: bin.quantity,
    })),
    metrics: { ...analysis.metrics },
  };

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(sanitized);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB write error, falling back to in-memory store:', err);
    inMemoryStore.set(sanitized.id, sanitized);
  }
}

export async function getAllPersistedAnalyses(): Promise<PersistedAnalysis[]> {
  try {
    const db = await openDB();
    return new Promise<PersistedAnalysis[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as PersistedAnalysis[]);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB read error, using fallback memory store:', err);
    return Array.from(inMemoryStore.values());
  }
}

export async function getPersistedAnalysisById(id: string): Promise<PersistedAnalysis | null> {
  try {
    const db = await openDB();
    return new Promise<PersistedAnalysis | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve((req.result as PersistedAnalysis) || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    return inMemoryStore.get(id) || null;
  }
}

export async function deletePersistedAnalysis(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    inMemoryStore.delete(id);
  }
}

export async function recalculateAnalysisQualityScore(id: string): Promise<PersistedAnalysis | null> {
  const analysis = await getPersistedAnalysisById(id);
  if (!analysis) return null;

  const recalculatedMetrics = computeMetricsFromHistogram(
    analysis.histogram,
    analysis.cardSizeMm.width,
    analysis.cardSizeMm.height,
    analysis.mmPerPixel
  );

  const updated: PersistedAnalysis = {
    ...analysis,
    metrics: recalculatedMetrics,
  };

  await savePersistedAnalysis(updated);
  return updated;
}

const inMemoryStore = new Map<string, PersistedAnalysis>();
