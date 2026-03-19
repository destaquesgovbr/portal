import { vi } from 'vitest'

export interface MockDocSnapshot {
  exists: boolean
  id: string
  data: () => Record<string, unknown> | undefined
}

export interface MockDocRef {
  get: ReturnType<typeof vi.fn>
  set: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

export interface MockCollectionRef {
  doc: ReturnType<typeof vi.fn>
  add: ReturnType<typeof vi.fn>
  where: ReturnType<typeof vi.fn>
  get: ReturnType<typeof vi.fn>
  orderBy: ReturnType<typeof vi.fn>
  limit: ReturnType<typeof vi.fn>
}

export interface MockFirestoreDb {
  collection: ReturnType<typeof vi.fn>
  batch: ReturnType<typeof vi.fn>
  runTransaction: ReturnType<typeof vi.fn>
}

export function createMockDocSnapshot(
  id: string,
  data?: Record<string, unknown>,
): MockDocSnapshot {
  return {
    exists: data !== undefined,
    id,
    data: () => data,
  }
}

export function createMockDocRef(snapshot?: MockDocSnapshot): MockDocRef {
  return {
    get: vi.fn().mockResolvedValue(snapshot ?? createMockDocSnapshot('doc-id')),
    set: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  }
}

export function createMockCollectionRef(
  docRefs: Record<string, MockDocRef> = {},
): MockCollectionRef {
  const ref: MockCollectionRef = {
    doc: vi.fn((id: string) => docRefs[id] ?? createMockDocRef()),
    add: vi.fn().mockResolvedValue({ id: 'new-doc-id' }),
    where: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ docs: [], empty: true }),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  }
  // Make chainable methods return the ref itself
  ref.where = vi.fn().mockReturnValue(ref)
  ref.orderBy = vi.fn().mockReturnValue(ref)
  ref.limit = vi.fn().mockReturnValue(ref)
  return ref
}

export function createMockBatch() {
  return {
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  }
}

export function createMockFirestoreDb(
  collections: Record<string, MockCollectionRef> = {},
): MockFirestoreDb {
  const batch = createMockBatch()
  return {
    collection: vi.fn(
      (name: string) => collections[name] ?? createMockCollectionRef(),
    ),
    batch: vi.fn().mockReturnValue(batch),
    runTransaction: vi.fn(async (fn) => {
      const transaction = {
        get: vi.fn(),
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      }
      return fn(transaction)
    }),
  }
}
