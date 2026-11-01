/**
 * Phone Normalization, Validation, and Masking Utilities
 * Primary domain focus: Bangladesh (+880) mobile numbers with global E.164 compatibility.
 */

// Valid Bangladeshi mobile operator prefixes (11 digits: 013, 014, 015, 016, 017, 018, 019)
const BD_MOBILE_PREFIX_REGEX = /^01[3-9]\d{8}$/;
const BD_E164_REGEX = /^\+8801[3-9]\d{8}$/;
const GLOBAL_E164_REGEX = /^\+[1-9]\d{6,14}$/;

/**
 * Normalizes phone numbers from arbitrary input formats into standard E.164 format.
 * Examples:
 *   "01712-345678" -> "+8801712345678"
 *   "01712 345678" -> "+8801712345678"
 *   "8801712345678" -> "+8801712345678"
 *   "+880 1712-345678" -> "+8801712345678"
 *   "008801712345678" -> "+8801712345678"
 *   "+1 (415) 555-2671" -> "+14155552671"
 * Returns null if the number is invalid or cannot be normalized.
 */
export function normalizePhoneNumber(raw: string | null | undefined): string | null {
    if (!raw || typeof raw !== 'string') return null;

    // 1. Strip all whitespace, dashes, parentheses, dots, slashes
    let cleaned = raw.trim().replace(/[\s\-\(\)\.\/]/g, '');
    if (!cleaned) return null;

    // 2. Handle international prefix "00" (e.g. 00880... -> +880...)
    if (cleaned.startsWith('00')) {
        cleaned = '+' + cleaned.slice(2);
    }

    // 3. Bangladesh local format: "01XXXXXXXXX" (11 digits starting with 01)
    if (cleaned.startsWith('01') && cleaned.length === 11) {
        if (BD_MOBILE_PREFIX_REGEX.test(cleaned)) {
            return `+88${cleaned}`;
        }
        return null; // Invalid BD operator prefix
    }

    // 4. Bangladesh format without plus: "8801XXXXXXXXX" (13 digits)
    if (cleaned.startsWith('8801') && cleaned.length === 13) {
        const localPart = cleaned.slice(2);
        if (BD_MOBILE_PREFIX_REGEX.test(localPart)) {
            return `+${cleaned}`;
        }
        return null;
    }

    // 5. Bangladesh with plus: "+8801XXXXXXXXX" (14 chars)
    if (cleaned.startsWith('+8801') && cleaned.length === 14) {
        if (BD_E164_REGEX.test(cleaned)) {
            return cleaned;
        }
        return null;
    }

    // 6. Generic international format (starts with +)
    if (cleaned.startsWith('+')) {
        if (GLOBAL_E164_REGEX.test(cleaned)) {
            return cleaned;
        }
        return null;
    }

    return null;
}

/**
 * Validates whether a given phone number string is valid (either directly or after normalization).
 */
export function isValidPhoneNumber(raw: string | null | undefined): boolean {
    return normalizePhoneNumber(raw) !== null;
}

/**
 * Masks a phone number for privacy in listings.
 * Shows the country code and operator prefix, masks the middle digits, and shows the last 3 digits.
 * Example:
 *   "+8801712345678" -> "+880 17•• •••678"
 *   "+14155552671"   -> "+1 415 ••• •671"
 * If input is invalid or shorter, returns masked placeholder.
 */
export function maskPhoneNumber(phone: string | null | undefined): string {
    if (!phone) return '—';
    const normalized = normalizePhoneNumber(phone) || phone;

    // Bangladesh standard masking: +8801712345678 (14 chars)
    if (normalized.startsWith('+8801') && normalized.length === 14) {
        const operator = normalized.slice(4, 6); // e.g. "17"
        const last3 = normalized.slice(-3); // e.g. "678"
        return `+880 ${operator}•• •••${last3}`;
    }

    // General international masking: keep first 5 and last 2, mask the rest
    if (normalized.length >= 8) {
        const start = normalized.slice(0, 4);
        const end = normalized.slice(-3);
        const maskedLength = normalized.length - 7;
        const dots = '•'.repeat(Math.max(maskedLength, 3));
        return `${start} ${dots} ${end}`;
    }

    return '••••••••';
}

