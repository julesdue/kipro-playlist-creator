const VALID_CLIP_NAME = /^[A-Za-z0-9_.-]+$/;

export function isValidClipName(name: string): boolean {
  return VALID_CLIP_NAME.test(name);
}

export function sanitizeClipName(name: string): string {
  return name.replace(/[^A-Za-z0-9_.-]+/g, "_");
}
