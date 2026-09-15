/**
 * Lets plain Node run the site's TypeScript modules.
 *
 * Vite resolves `./collections` and `~/i18n` for the site; Node does not. The
 * scripts here (the catalogue, the seed) import those same files so there is
 * one source of truth rather than a second copy of the data, and this hook is
 * what makes that possible: it adds the extension Node wants, and maps the `~`
 * alias to src/.
 */
import { statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const isFile = (p) => { try { return statSync(p).isFile(); } catch { return false; } };
const pick = (base) => [base, `${base}.ts`, `${base}/index.ts`].find(isFile);

export async function resolve(specifier, context, next) {
  let base = null;
  if (specifier.startsWith('~/')) base = SRC + specifier.slice(2);
  else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
    base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
  }
  const hit = base && pick(base);
  return hit ? { url: pathToFileURL(hit).href, shortCircuit: true } : next(specifier, context);
}
