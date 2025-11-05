export function sanitizeFileName(name: string): string {
  return name.trim().replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/_+/g, '_');
}