import { describe, it } from 'node:test';
import assert from 'node:assert';
import { COMPANY_DETAILS } from '../src/lib/constants/company.ts';

describe('Legal & Corporate Entity Standards', () => {
    it('defines full legal registration and corporate entity identification', () => {
        assert.ok(COMPANY_DETAILS.legalName.length > 0);
        assert.strictEqual(COMPANY_DETAILS.tradingName, 'Valleycentia');
        assert.strictEqual(COMPANY_DETAILS.registrationCountry, 'Bangladesh');
        assert.ok(COMPANY_DETAILS.taxJurisdiction.includes('National Board of Revenue'));
    });

    it('enforces consumer protection compliance standards', () => {
        assert.strictEqual(COMPANY_DETAILS.compliance.returnsWindowDays, 7);
        assert.strictEqual(COMPANY_DETAILS.compliance.vatInclusive, true);
        assert.ok(COMPANY_DETAILS.supportEmail.includes('@valleycentia.com'));
    });

    it('specifies complete physical address structure for statutory filings', () => {
        const address = COMPANY_DETAILS.corporateAddress;
        assert.ok(address.street);
        assert.ok(address.city);
        assert.ok(address.postalCode);
        assert.strictEqual(address.country, 'Bangladesh');
    });
});
