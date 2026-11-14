/** "all_levels" -> "All levels", "beginner" -> "Beginner". */
export function formatLevel(level: string | null | undefined): string {
  if (!level) return '';
  const words = level.replace(/[_-]+/g, ' ').trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
