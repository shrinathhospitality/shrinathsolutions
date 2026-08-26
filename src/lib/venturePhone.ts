/** Ventures store bare 10-digit Indian mobile numbers; this is the single place that turns
 *  them into dial/display strings so every page formats and links them identically. */
export function ventureTel(number: string): string {
  return `tel:+91${number}`;
}

export function ventureWa(number: string, text: string): string {
  return `https://wa.me/91${number}?text=${encodeURIComponent(text)}`;
}

export function formatIndianPhone(number: string): string {
  if (number.length !== 10) return number;
  return `${number.slice(0, 5)} ${number.slice(5)}`;
}
