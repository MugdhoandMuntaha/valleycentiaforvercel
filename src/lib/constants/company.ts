/**
 * Canonical Corporate & Legal Entity Constants
 * Used across legal disclosures, structured data, invoice receipts, and compliance policies.
 */

export const COMPANY_DETAILS = {
    legalName: 'Valleycentia Commerce Limited',
    tradingName: 'Valleycentia',
    registrationCountry: 'Bangladesh',
    taxJurisdiction: 'National Board of Revenue (NBR), Bangladesh',
    currency: 'BDT',
    currencySymbol: '৳',
    supportEmail: 'support@valleycentia.com',
    supportPhone: '+8801700000000',
    corporateAddress: {
        street: 'Valleycentia Tower, Road 11, Banani',
        city: 'Dhaka',
        postalCode: '1213',
        country: 'Bangladesh',
    },
    compliance: {
        returnsWindowDays: 7,
        standardDeliveryDays: '2-4 business days',
        vatInclusive: true,
    },
} as const;
