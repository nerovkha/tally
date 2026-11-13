export const CURRENCIES = [
  { code: "EUR", name: "Euro" },
  { code: "USD", name: "US dollar" },
  { code: "GBP", name: "British pound" },
  { code: "BDT", name: "Bangladeshi taka" },
  { code: "INR", name: "Indian rupee" },
  { code: "PKR", name: "Pakistani rupee" },
  { code: "AED", name: "UAE dirham" },
  { code: "AUD", name: "Australian dollar" },
  { code: "CAD", name: "Canadian dollar" },
  { code: "CHF", name: "Swiss franc" },
  { code: "CNY", name: "Chinese yuan" },
  { code: "DKK", name: "Danish krone" },
  { code: "NOK", name: "Norwegian krone" },
  { code: "SEK", name: "Swedish krona" },
  { code: "PLN", name: "Polish złoty" },
  { code: "CZK", name: "Czech koruna" },
  { code: "HUF", name: "Hungarian forint" },
  { code: "RON", name: "Romanian leu" },
  { code: "BGN", name: "Bulgarian lev" },
  { code: "TRY", name: "Turkish lira" },
  { code: "SGD", name: "Singapore dollar" },
  { code: "MYR", name: "Malaysian ringgit" },
  { code: "THB", name: "Thai baht" },
  { code: "BRL", name: "Brazilian real" },
  { code: "MXN", name: "Mexican peso" },
  { code: "ZAR", name: "South African rand" },
  { code: "NZD", name: "New Zealand dollar" },
  { code: "HKD", name: "Hong Kong dollar" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export const CURRENCY_CODES = CURRENCIES.map(
  (currency) => currency.code,
) as [CurrencyCode, ...CurrencyCode[]];

export function isSupportedCurrency(code: string): code is CurrencyCode {
  return (CURRENCY_CODES as readonly string[]).includes(code);
}
