// Platzhalter in eckigen Klammern vor dem Druck ersetzen.
export const postcardConfig = {
  siteUrl: "https://lisa-und-roman-heiraten.online",
  date: "[Datum]",
  location: "[Ort]",
  responseDeadline: "[Frist]",
  email: "[E-Mail-Adresse]",
  whatsapp: "[WhatsApp-Nummer]",
} as const;

export function getPostcardPlaceholders(): string[] {
  return Object.entries(postcardConfig)
    .filter(([key, value]) => key !== "siteUrl" && /\[.*\]/.test(value))
    .map(([, value]) => value);
}
