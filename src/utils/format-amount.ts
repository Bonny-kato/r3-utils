const QUADRILLION = 1_000_000_000_000_000;
const TRILLION = 1_000_000_000_000;
const BILLION = 1_000_000_000;
const MILLION = 1_000_000;

export enum CurrencyVisibility {
    HIDE,
    SHOW,
}

export enum AbbreviationVisibility {
    HIDE,
    SHOW,
}

interface FormatOptions {
    decimals: number;
    showAbbreviation: AbbreviationVisibility;
}

/**
 * Formats a given monetary amount into a human-readable string with currency
 * notation and appropriate abbreviations for large values (quadrillions, trillions,
 * billions, and millions), or as a regular number when abbreviation is hidden.
 *
 * @param {number} [amount] - The monetary amount to format. If undefined, the default
 * value of 0 is used.
 * @param {CurrencyVisibility} [showCurrency=CurrencyVisibility.SHOW] - Determines whether
 * to show the currency symbol in the formatted string.
 * @param {FormatOptions} [options] - An object containing options for formatting:
 * - decimals: The number of decimal places to show. Default is 0.
 * - showAbbreviation: Determines whether to use abbreviations for large numbers (M, B, T, Q) or not.
 *
 * @returns {string} The formatted monetary amount as a string, with currency notation and
 * appropriate abbreviations if the value is in the millions or higher.
 */
export const formatAmount = (
    amount?: number,
    showCurrency: CurrencyVisibility = CurrencyVisibility.SHOW,
    options: FormatOptions = {
        decimals: 0,
        showAbbreviation: AbbreviationVisibility.SHOW,
    }
): string => {
    if (amount === undefined) {
        amount = 0;
    }

    const { decimals, showAbbreviation } = options;

    let formattedPrice: string;
    const formatter = new Intl.NumberFormat("en-us", {
        ...(showCurrency === CurrencyVisibility.SHOW && {
            style: "currency",
            currency: "TZS",
        }),
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });

    if (showAbbreviation === AbbreviationVisibility.SHOW) {
        if (amount >= QUADRILLION) {
            // Format as quadrillions
            formattedPrice = formatter.format(amount / QUADRILLION) + " Q";
        } else if (amount >= TRILLION) {
            // Format as trillions
            formattedPrice = formatter.format(amount / TRILLION) + " T";
        } else if (amount >= BILLION) {
            // Format as billions
            formattedPrice = formatter.format(amount / BILLION) + " B";
        } else if (amount >= MILLION) {
            // Format as millions
            formattedPrice = formatter.format(amount / MILLION) + " M";
        } else {
            // Format normally
            formattedPrice = formatter.format(amount);
        }
    } else {
        // If the abbreviation is hidden, format the number normally (without abbreviation)
        formattedPrice = formatter.format(amount);
    }

    return formattedPrice;
};
