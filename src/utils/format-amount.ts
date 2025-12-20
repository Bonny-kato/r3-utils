const QUADRILLION = 1_000_000_000_000_000;
const TRILLION = 1_000_000_000_000;
const BILLION = 1_000_000_000;
const MILLION = 1_000_000;

interface FormatOptions {
    /** Currency code (e.g. "TZS", "USD") */
    currency?: string;
    /** Locale string (e.g. "en-US") */
    locale?: string;
    /** Maximum number of decimal places to display */
    maximumFractionDigits?: number;
    /** Minimum number of decimal places to display */
    minimumFractionDigits?: number;
    /** Whether to abbreviate large numbers (e.g. 1M, 1B) */
    showAbbreviation?: boolean;
    /** Whether to show currency symbol/code */
    showCurrency?: boolean;
}

/**
 * Formats a number as a currency amount with optional abbreviation
 *
 * @param amount - The number to format
 * @param options - Formatting options
 * @returns Formatted string with currency and/or abbreviation
 *
 * @example
 * // Basic usage
 * formatAmount(1234.56) // Returns "TZS 1,235"
 *
 * // With abbreviation
 * formatAmount(1234567) // Returns "TZS 1 M"
 *
 * // Custom currency and locale
 * formatAmount(1234.56, {
 *   currency: "USD",
 *   locale: "en-GB",
 *   showAbbreviation: false
 * }) // Returns "US$ 1,235"
 *
 * // With decimal places
 * formatAmount(1234.56, {
 *   minimumFractionDigits: 2,
 *   maximumFractionDigits: 2
 * }) // Returns "TZS 1,234.56"
 */
export const formatAmount = (
    amount?: number,
    options: FormatOptions = {}
): string => {
    const {
        currency = "TZS",
        locale = "en-US",
        maximumFractionDigits = 0,
        minimumFractionDigits = 0,
        showAbbreviation = true,
        showCurrency = true,
    } = options;

    const value = amount ?? 0;

    const formatter = new Intl.NumberFormat(locale, {
        ...(showCurrency && {
            style: "currency",
            currency,
        }),
        minimumFractionDigits,
        maximumFractionDigits,
    });

    if (showAbbreviation) {
        if (value >= QUADRILLION) {
            return formatter.format(value / QUADRILLION) + " Q";
        }
        if (value >= TRILLION) {
            return formatter.format(value / TRILLION) + " T";
        }
        if (value >= BILLION) {
            return formatter.format(value / BILLION) + " B";
        }
        if (value >= MILLION) {
            return formatter.format(value / MILLION) + " M";
        }
    }

    return formatter.format(value);
};
