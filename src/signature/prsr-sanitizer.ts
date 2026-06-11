const ALLOWED = /[a-zA-Z0-9/+.\-]/;

/**
 * Sanitizes a parser name for use in the prsr field.
 * Per spec: characters outside [a-zA-Z0-9/+.-] are replaced with '-'.
 * Example: '@babel/parser' → '-babel/parser'
 */
export function sanitizePrsr(name: string): string {
  return name
    .split('')
    .map((ch) => (ALLOWED.test(ch) ? ch : '-'))
    .join('');
}
