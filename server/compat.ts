import { fileURLToPath } from 'url';
import path from 'path';

// ES5-compatible dirname replacement for import.meta.dirname
export const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Helper to resolve paths relative to server directory
export function resolveServerPath(...paths: string[]) {
  return path.resolve(__dirname, ...paths);
}

// Helper to resolve paths relative to project root
export function resolveProjectPath(...paths: string[]) {
  return path.resolve(__dirname, '..', ...paths);
}