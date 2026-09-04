/**
 * Étiquette imprimable pour un dossier Trace validé — un SVG généré à la
 * volée (pas de dépendance image lourde type `canvas`, choix le plus simple
 * pour ce MVP). Ne contient que le code de suivi, déjà connu de l'appelant
 * qui vient de valider le dossier — aucune donnée supplémentaire exposée.
 */
function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c] as string)
}

export function renderTrackingLabelSvg(trackingCode: string): string {
  const safeCode = escapeXml(trackingCode)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
  <rect width="240" height="240" fill="#ffffff" stroke="#1f2937" stroke-width="2" rx="8"/>
  <text x="120" y="100" text-anchor="middle" font-family="monospace" font-size="14" fill="#374151">SignSecure TrustFlow</text>
  <text x="120" y="130" text-anchor="middle" font-family="monospace" font-size="20" font-weight="bold" fill="#111827">${safeCode}</text>
  <text x="120" y="155" text-anchor="middle" font-family="monospace" font-size="11" fill="#6b7280">Dossier Trace</text>
</svg>`
}
