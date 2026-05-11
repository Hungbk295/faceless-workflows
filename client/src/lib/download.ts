// Tiny helper for triggering a browser download of in-memory text.
export function downloadFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function safeFilename(s: string, max = 60): string {
  return s.replace(/[^a-z0-9\u00C0-\u1EF9]+/gi, '_').substring(0, max) || 'untitled';
}
