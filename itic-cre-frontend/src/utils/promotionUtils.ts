/**
 * Formats a promotion's display label cleanly without duplicate year mentions.
 * E.g., if promotion name is "Bachelor RH 2024-2025" and year is "2024-2025",
 * it returns "Bachelor RH 2024-2025" instead of "Bachelor RH 2024-2025 (2024-2025)".
 */
export function formatPromotionLabel(promotion?: {
  name?: string;
  nom?: string;
  year?: string | null;
} | null): string {
  if (!promotion) return '';
  const name = (promotion.name ?? promotion.nom ?? '').trim();
  if (!name) return '';
  if (promotion.year && promotion.year.trim() && !name.includes(promotion.year.trim())) {
    return `${name} (${promotion.year.trim()})`;
  }
  return name;
}
