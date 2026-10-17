// =========================================================
// INVOICE NUMBERS
// =========================================================
//
// GST invoice numbers must be consecutive, unique within a
// financial year and at most 16 characters (letters, digits,
// "-" and "/" only).
//
// Format:   <prefix>/<financial year>/<serial>
// Example:  WH3/26-27/000123      (16 characters)
//
// - prefix   up to 3 letters or digits, one per warehouse
// - year     Indian financial year, April to March
// - serial   running number, 6 digits, never repeats
//
// Each warehouse has its own series. A counter document at
// invoiceCounters/<prefix>_<year> holds the last number used.
// It is read and updated inside the same transaction as the
// sale, so a failed sale never uses up a number and two sales
// can never get the same one.
//
// =========================================================

export const INVOICE_PREFIX_MAX_LENGTH = 3;

export const INVOICE_COUNTERS_COLLECTION = 'invoiceCounters';


// Keeps letters and digits only, upper case, at most 3.
export function sanitizeInvoicePrefix(value: unknown): string {

  return String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, INVOICE_PREFIX_MAX_LENGTH);

}


// Warehouse prefix: the one set on the warehouse, otherwise
// the first letters/digits of its code, otherwise "W".
export function invoicePrefixFor(
  warehouse: { invoicePrefix?: string; code?: string } | undefined
): string {

  return (
    sanitizeInvoicePrefix(warehouse?.invoicePrefix) ||
    sanitizeInvoicePrefix(warehouse?.code) ||
    'W'
  );

}


// "26-27" for any date from 1 Apr 2026 to 31 Mar 2027.
export function financialYearLabel(date: Date): string {

  const startYear =
    date.getMonth() >= 3
      ? date.getFullYear()
      : date.getFullYear() - 1;

  const two = (year: number) =>
    String(year % 100).padStart(2, '0');

  return `${two(startYear)}-${two(startYear + 1)}`;

}


export function invoiceSeriesId(
  prefix: string,
  financialYear: string
): string {

  return `${prefix}_${financialYear}`;

}


export function formatInvoiceNumber(
  prefix: string,
  financialYear: string,
  serial: number
): string {

  return `${prefix}/${financialYear}/${String(serial).padStart(6, '0')}`;

}
