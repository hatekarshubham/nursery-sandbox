import {
  Firestore,
  Transaction,
  DocumentReference,
  doc
} from '@angular/fire/firestore';


// =========================================================
// UNIQUE KEYS
// =========================================================
//
// Firestore has no "unique" constraint, so uniqueness is
// enforced in two layers:
//
// 1. A query before saving (catches records that already
//    exist, including old ones saved before this rule).
//
// 2. A small "lock" document in the `uniqueKeys` collection,
//    written in the SAME transaction as the record itself.
//    Two saves of the same key at the same moment cannot
//    both succeed, because both would try to create it.
//
// A lock is only treated as taken while the record it points
// to still exists and still uses that key. Deleting,
// cancelling or renaming a record therefore frees its key
// without any extra clean-up code.
//
// =========================================================

export const UNIQUE_KEYS_COLLECTION = 'uniqueKeys';


export class DuplicateError extends Error {

  constructor(message: string) {

    super(message);

    this.name = 'DuplicateError';

  }

}


// Trim, collapse inner spaces, upper-case.
export function normalizeKeyPart(
  value: unknown
): string {

  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();

}


// Builds a Firestore-safe document ID such as
// "purchase__SUPPLIER123__INV_01".
export function buildUniqueKey(
  type: string,
  ...parts: unknown[]
): string {

  const safe =
    parts.map(
      part =>
        encodeURIComponent(
          normalizeKeyPart(part)
        )
    );

  return [type, ...safe].join('__');

}


// Call INSIDE a transaction, before any writes.
//
// `isStillTaken` receives the data of the record the existing
// lock points to and decides whether that record still owns
// the key (for example: a purchase that is not CANCELLED).
export async function reserveUniqueKey(
  firestore: Firestore,
  transaction: Transaction,
  key: string,
  owner: DocumentReference,
  isStillTaken: (data: any) => boolean,
  message: string
): Promise<() => void> {

  const lockRef =
    doc(
      firestore,
      UNIQUE_KEYS_COLLECTION,
      key
    );

  const lockSnapshot =
    await transaction.get(lockRef);

  if (lockSnapshot.exists()) {

    const ownerPath =
      lockSnapshot.data()['ownerPath'] as
        string | undefined;

    if (
      ownerPath &&
      ownerPath !== owner.path
    ) {

      const ownerSnapshot =
        await transaction.get(
          doc(firestore, ownerPath)
        );

      if (
        ownerSnapshot.exists() &&
        isStillTaken(ownerSnapshot.data())
      ) {

        throw new DuplicateError(message);

      }

    }

  }

  // Returned so the caller can queue the write after its
  // own reads are finished.
  return () =>
    transaction.set(
      lockRef,
      {
        ownerPath: owner.path,
        createdAt: new Date()
      }
    );

}


// =========================================================
// UNIQUE FIELDS IN A SMALL LIST
// =========================================================
//
// Used for suppliers, categories and warehouses. Their full
// list is already loaded and cached by the service, so the
// check costs no extra reads.
//
// Throws DuplicateError when another record (not `excludeId`)
// already uses the same value, ignoring case and extra spaces.
// Empty values are skipped.
//
// =========================================================

export interface UniqueFieldRule {

  field: string;

  label: string;

}


export function assertFieldsUnique(
  existing: any[],
  candidate: Record<string, unknown>,
  rules: UniqueFieldRule[],
  excludeId?: string
): void {

  for (const rule of rules) {

    const value =
      normalizeKeyPart(candidate[rule.field]);

    if (!value) {

      continue;

    }

    const clash =
      existing.some(
        entry =>
          entry.id !== excludeId &&
          normalizeKeyPart(entry[rule.field]) ===
            value
      );

    if (clash) {

      throw new DuplicateError(
        `${rule.label} "${String(candidate[rule.field]).trim()}" already exists.`
      );

    }

  }

}
