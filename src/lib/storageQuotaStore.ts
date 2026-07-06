const STORAGE_QUOTA_KEY = 'hellome_storage_quota';

export const DEFAULT_STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024;
export const STORAGE_PACKAGE_BYTES = 1024 * 1024 * 1024;

export type StorageUsageSnapshot = {
  quotaBytes: number;
  usedBytes: number;
  purchasedBytes: number;
  updatedAt: string;
};

type Listener = () => void;

const listeners = new Set<Listener>();

const DEFAULT_STORAGE_USAGE: StorageUsageSnapshot = {
  quotaBytes: DEFAULT_STORAGE_QUOTA_BYTES,
  usedBytes: 0,
  purchasedBytes: 0,
  updatedAt: new Date().toISOString(),
};

let storageSnapshot = DEFAULT_STORAGE_USAGE;
let storageSnapshotRaw: string | null = '__init__';

function notifyStorageUsage(): void {
  storageSnapshotRaw = '__stale__';
  listeners.forEach((fn) => fn());
}

export function subscribeStorageUsage(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function normalizeStorageUsage(parsed: Partial<StorageUsageSnapshot>): StorageUsageSnapshot {
  const purchasedBytes = Math.max(0, Number(parsed.purchasedBytes ?? 0));
  const quotaBytes = Math.max(
    DEFAULT_STORAGE_QUOTA_BYTES,
    Number(parsed.quotaBytes ?? DEFAULT_STORAGE_QUOTA_BYTES + purchasedBytes),
  );
  const usedBytes = Math.max(0, Math.min(Number(parsed.usedBytes ?? 0), quotaBytes));

  return {
    quotaBytes,
    usedBytes,
    purchasedBytes,
    updatedAt: String(parsed.updatedAt ?? new Date().toISOString()),
  };
}

function readStorageUsageFromCache(): StorageUsageSnapshot {
  const raw = localStorage.getItem(STORAGE_QUOTA_KEY);
  if (raw === storageSnapshotRaw) return storageSnapshot;

  storageSnapshotRaw = raw;
  if (!raw) {
    storageSnapshot = DEFAULT_STORAGE_USAGE;
    return storageSnapshot;
  }

  try {
    storageSnapshot = normalizeStorageUsage(JSON.parse(raw) as Partial<StorageUsageSnapshot>);
  } catch {
    storageSnapshot = DEFAULT_STORAGE_USAGE;
  }

  return storageSnapshot;
}

function persistStorageUsage(snapshot: StorageUsageSnapshot): void {
  localStorage.setItem(STORAGE_QUOTA_KEY, JSON.stringify(snapshot));
  storageSnapshot = snapshot;
  storageSnapshotRaw = localStorage.getItem(STORAGE_QUOTA_KEY);
  notifyStorageUsage();
}

export function getStorageUsage(): StorageUsageSnapshot {
  return readStorageUsageFromCache();
}

export function getRemainingStorageBytes(snapshot = getStorageUsage()): number {
  return Math.max(0, snapshot.quotaBytes - snapshot.usedBytes);
}

export function canStoreBytes(bytes: number, snapshot = getStorageUsage()): boolean {
  return bytes <= getRemainingStorageBytes(snapshot);
}

export function reserveStorageBytes(bytes: number): { ok: true; snapshot: StorageUsageSnapshot } | { ok: false; remainingBytes: number } {
  const nextBytes = Math.max(0, Math.ceil(bytes));
  const current = getStorageUsage();
  const remainingBytes = getRemainingStorageBytes(current);

  if (nextBytes > remainingBytes) {
    return { ok: false, remainingBytes };
  }

  const next = {
    ...current,
    usedBytes: current.usedBytes + nextBytes,
    updatedAt: new Date().toISOString(),
  };
  persistStorageUsage(next);
  return { ok: true, snapshot: next };
}

export function purchaseStoragePackage(packages = 1): StorageUsageSnapshot {
  const count = Math.max(1, Math.floor(packages));
  const current = getStorageUsage();
  const extraBytes = STORAGE_PACKAGE_BYTES * count;
  const next = {
    ...current,
    quotaBytes: current.quotaBytes + extraBytes,
    purchasedBytes: current.purchasedBytes + extraBytes,
    updatedAt: new Date().toISOString(),
  };
  persistStorageUsage(next);
  return next;
}

export function formatBytes(bytes: number): string {
  const safeBytes = Math.max(0, bytes);
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = safeBytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const fractionDigits = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(fractionDigits)} ${units[unitIndex]}`;
}
