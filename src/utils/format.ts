/**
 * Utility per la formattazione dei valori
 */

/**
 * Formatta un numero come valuta EUR
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

/**
 * Formatta una data ISO in formato italiano
 */
export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("it-IT", {
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
