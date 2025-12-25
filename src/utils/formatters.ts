/**
 * Formatta un numero come valuta in euro
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

/**
 * Formatta una data in formato italiano
 */
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Formatta una percentuale
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}
