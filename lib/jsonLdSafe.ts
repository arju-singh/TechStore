/**
 * Serialize a structured-data object to a string safe to embed inside a
 * `<script type="application/ld+json">` element.
 *
 * `JSON.stringify` alone does NOT escape `<`, `>` or `/`, so a value containing
 * `</script>` would close the tag and let following markup execute (stored XSS)
 * — and product fields (name, description, brand) are vendor-controlled. The
 * `\uXXXX` forms below are still valid JSON and parse back to the original
 * characters, so crawlers receive identical structured data. U+2028/U+2029 are
 * escaped too: valid in JSON, but illegal unescaped in a JS string context.
 */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
