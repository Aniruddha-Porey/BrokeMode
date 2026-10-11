// Intentional export sanitization: remove control characters before emitting user-authored CSV values.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
const FORMULA_PREFIX = /^[\s]*[=+\-@]/u;

export function csvCell(value) {
  const raw = String(value ?? '');
  const flattened = raw.replace(CONTROL_CHARACTERS, '').replace(/[\r\n\t]/g, ' ');
  const safe = typeof value === 'string' && FORMULA_PREFIX.test(flattened) ? `'${flattened}` : flattened;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function buildCsv(headings, rows, { bom = true } = {}) {
  const lines = [headings.map(csvCell).join(',')];
  for (const row of rows) lines.push(row.map(csvCell).join(','));
  return `${bom ? '\uFEFF' : ''}${lines.join('\r\n')}`;
}
