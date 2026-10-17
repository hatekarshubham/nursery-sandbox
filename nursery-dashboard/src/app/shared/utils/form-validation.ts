const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GSTIN_PATTERN =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const MOBILE_PATTERN =
  /^[6-9][0-9]{9}$/;


export function upperInput(
  value: string
): string {

  return (value ?? '').toUpperCase();

}


export function requiredText(
  value: string,
  label: string,
  maxLength = 80
): string {

  const text =
    value.trim();

  if (!text) {

    return `Please enter a ${label}.`;

  }

  if (text.length > maxLength) {

    return `${label} must be ${maxLength} characters or fewer.`;

  }

  return '';

}


export function optionalText(
  value: string,
  label: string,
  maxLength: number
): string {

  if (value.trim().length > maxLength) {

    return `${label} must be ${maxLength} characters or fewer.`;

  }

  return '';

}


export function shortCode(
  value: string,
  label: string,
  maxLength = 10
): string {

  const code =
    value.trim().toUpperCase();

  if (!code) {

    return `Please enter a ${label}.`;

  }

  if (
    code.length < 2 ||
    code.length > maxLength ||
    !/^[A-Z0-9]+$/.test(code)
  ) {

    return `${label} must be 2 to ${maxLength} letters or numbers.`;

  }

  return '';

}


export function duplicateValue(
  value: string,
  existing: string[],
  label: string
): string {

  const normalized =
    value.trim().toUpperCase();

  const taken =
    existing.some(
      entry =>
        entry.trim().toUpperCase() ===
        normalized
    );

  if (taken) {

    return `Another record already uses this ${label}.`;

  }

  return '';

}


export function normalizeIndianMobile(
  value: string
): string {

  let digits =
    value.replace(/\D/g, '');

  if (
    digits.length === 12 &&
    digits.startsWith('91')
  ) {

    digits = digits.slice(2);

  }

  if (
    digits.length === 11 &&
    digits.startsWith('0')
  ) {

    digits = digits.slice(1);

  }

  return digits;

}


export function indianMobile(
  value: string,
  required: boolean
): string {

  const digits =
    normalizeIndianMobile(value);

  if (!digits) {

    return required
      ? 'Please enter a mobile number.'
      : '';

  }

  if (!MOBILE_PATTERN.test(digits)) {

    return 'Enter a 10-digit mobile number.';

  }

  return '';

}


export function emailAddress(
  value: string,
  required: boolean
): string {

  const email =
    value.trim();

  if (!email) {

    return required
      ? 'Please enter an email address.'
      : '';

  }

  if (!EMAIL_PATTERN.test(email)) {

    return 'Please enter a valid email address.';

  }

  return '';

}


export function gstNumber(
  value: string
): string {

  const gst =
    value.trim().toUpperCase();

  if (!gst) {

    return '';

  }

  if (!GSTIN_PATTERN.test(gst)) {

    return 'Enter a valid 15-character GST number.';

  }

  return '';

}


export function moneyAmount(
  value: number | null | undefined,
  label: string,
  options: {
    required?: boolean;
    allowZero?: boolean;
  } = {}
): string {

  const required =
    options.required !== false;

  const allowZero =
    options.allowZero === true;

  if (
    value === null ||
    value === undefined ||
    (typeof value === 'number' &&
      Number.isNaN(value))
  ) {

    return required
      ? `Please enter a ${label}.`
      : '';

  }

  const amount =
    Number(value);

  if (!Number.isFinite(amount)) {

    return `Please enter a valid ${label}.`;

  }

  if (allowZero ? amount < 0 : amount <= 0) {

    return allowZero
      ? `${label} cannot be negative.`
      : `${label} must be greater than 0.`;

  }

  const text =
    String(value);

  if (/\.\d{3,}/.test(text)) {

    return `${label} can have at most two decimal places.`;

  }

  return '';

}


export function percentAmount(
  value: number | null | undefined
): string {

  if (
    value === null ||
    value === undefined ||
    (typeof value === 'number' &&
      Number.isNaN(value))
  ) {

    return '';

  }

  const percent =
    Number(value);

  if (
    !Number.isFinite(percent) ||
    percent < 0 ||
    percent > 100
  ) {

    return 'GST must be between 0 and 100.';

  }

  if (/\.\d{3,}/.test(String(value))) {

    return 'GST can have at most two decimal places.';

  }

  return '';

}


export function wholeQuantity(
  value: number | null | undefined,
  label: string
): string {

  const quantity =
    Number(value);

  if (
    !Number.isInteger(quantity) ||
    quantity < 1
  ) {

    return `${label} must be a whole number of at least 1.`;

  }

  return '';

}


export function customColorName(
  colorName: string,
  hasCustomColor: boolean
): string {

  if (!hasCustomColor) {

    return '';

  }

  const name =
    colorName.trim();

  if (!name || name.toLowerCase() === 'custom') {

    return 'Please type a name for the custom color.';

  }

  if (name.length > 40) {

    return 'Color name must be 40 characters or fewer.';

  }

  return '';

}
