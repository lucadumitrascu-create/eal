import LZString from 'lz-string';
import type { DesignSpec } from '../../data/templates';
import { validateSpec } from './spec';

/** Compress a spec into a URL-safe string for the shareable preview link. */
export function encodeSpec(spec: DesignSpec): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(spec));
}

/** Decode + sanitize an untrusted ?d= param. Returns null on any failure. */
export function decodeSpec(s: string): DesignSpec | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(s);
    if (!json) return null;
    return validateSpec(JSON.parse(json));
  } catch {
    return null;
  }
}
