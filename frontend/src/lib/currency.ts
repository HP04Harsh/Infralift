export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", INR: "₹", EUR: "€", GBP: "£", JPY: "¥", CAD: "C$",
  AUD: "A$", BRL: "R$", AED: "د.إ", SGD: "S$", HKD: "HK$",
  KRW: "₩", CHF: "Fr", MXN: "MX$", SEK: "kr", NOK: "kr",
  DKK: "kr", PLN: "zł", RUB: "₽", ZAR: "R", CNY: "¥",
};

export function formatCurrency(amount: number, currencyCode: string | null | undefined): string {
  if (!currencyCode) return "Currency unavailable";
  const symbol = CURRENCY_SYMBOLS[currencyCode] ?? `${currencyCode} `;
  return `${symbol}${Math.round(amount).toLocaleString()}`;
}

export function getCurrencySymbol(currencyCode: string | null | undefined): string {
  if (!currencyCode) return "";
  return CURRENCY_SYMBOLS[currencyCode] ?? currencyCode + " ";
}
