/**
 * Phone Normalization, Validation, and Masking Utilities
 * Primary domain focus: Bangladesh (+880) mobile numbers with global E.164 compatibility.
 */

const BD_MOBILE_PREFIX_REGEX = /^01[3-9]\d{8}$/;
const BD_E164_REGEX = /^\+8801[3-9]\d{8}$/;
const GLOBAL_E164_REGEX = /^\+[1-9]\d{6,14}$/;

export function normalizePhoneNumber(raw: string | null | undefined): string | null {
    if (!raw || typeof raw !== 'string') return null;

    let cleaned = raw.trim().replace(/[\s\-\(\)\.\/]/g, '');
    if (!cleaned) return null;

    if (cleaned.startsWith('00')) {
        cleaned = '+' + cleaned.slice(2);
    }

    if (cleaned.startsWith('01') && cleaned.length === 11) {
        if (BD_MOBILE_PREFIX_REGEX.test(cleaned)) {
            return `+88${cleaned}`;
        }
        return null;
    }

    if (cleaned.startsWith('8801') && cleaned.length === 13) {
        const localPart = cleaned.slice(2);
        if (BD_MOBILE_PREFIX_REGEX.test(localPart)) {
            return `+${cleaned}`;
        }
        return null;
    }

    if (cleaned.startsWith('+8801') && cleaned.length === 14) {
        if (BD_E164_REGEX.test(cleaned)) {
            return cleaned;
        }
        return null;
    }

    if (cleaned.startsWith('+')) {
        if (GLOBAL_E164_REGEX.test(cleaned)) {
            return cleaned;
        }
        return null;
    }

    return null;
}

export function isValidPhoneNumber(raw: string | null | undefined): boolean {
    return normalizePhoneNumber(raw) !== null;
}

export function maskPhoneNumber(phone: string | null | undefined): string {
    if (!phone) return '—';
    const normalized = normalizePhoneNumber(phone) || phone;

    if (normalized.startsWith('+8801') && normalized.length === 14) {
        const operator = normalized.slice(4, 6);
        const last3 = normalized.slice(-3);
        return `+880 ${operator}•• •••${last3}`;
    }

    if (normalized.length >= 8) {
        const start = normalized.slice(0, 4);
        const end = normalized.slice(-3);
        const maskedLength = normalized.length - 7;
        const dots = '•'.repeat(Math.max(maskedLength, 3));
        return `${start} ${dots} ${end}`;
    }

    return '••••••••';
}

