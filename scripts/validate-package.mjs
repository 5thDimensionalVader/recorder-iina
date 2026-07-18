import { createHash } from 'node:crypto';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await readFile(path.join(root, 'Info.json'), 'utf8'));
const requiredFiles = [manifest.entry, manifest.preferencesPage, 'dist/ui/window/index.html'];
const errors = [];

function cspHash(source) {
  return `'sha256-${createHash('sha256').update(source).digest('base64')}'`;
}

for (const relativePath of requiredFiles) {
  if (typeof relativePath !== 'string' || relativePath.length === 0) {
    errors.push(`Manifest contains an invalid package path: ${String(relativePath)}`);
    continue;
  }

  try {
    await access(path.join(root, relativePath));
  } catch {
    errors.push(`Missing package file: ${relativePath}`);
  }
}

async function listFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path.join(directory, entry.name), relativePath)));
    } else {
      files.push(relativePath);
    }
  }
  return files;
}

const distDirectory = path.join(root, 'dist');
try {
  const distFiles = (await listFiles(distDirectory)).sort();
  const expectedDistFiles = ['index.js', 'ui/window/index.html'];
  if (JSON.stringify(distFiles) !== JSON.stringify(expectedDistFiles)) {
    errors.push(
      `Unexpected dist contents. Expected ${expectedDistFiles.join(', ')}, received ${distFiles.join(', ')}.`,
    );
  }
} catch {
  errors.push('The dist directory does not exist.');
}

try {
  const webview = await readFile(path.join(root, 'dist/ui/window/index.html'), 'utf8');
  if (/<script\b[^>]*\bsrc=/i.test(webview)) errors.push('Webview contains an external script.');
  if (/<link\b[^>]*\brel=["']stylesheet["']/i.test(webview)) {
    errors.push('Webview contains an external stylesheet.');
  }
  if (/<script\b[^>]*\btype=["']module["']/i.test(webview)) {
    errors.push('Webview contains an ES module script.');
  }
  const inlineScripts = [...webview.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map(
    (match) => match[1] ?? '',
  );
  const inlineStyles = [...webview.matchAll(/<style>([\s\S]*?)<\/style>/gi)].map(
    (match) => match[1] ?? '',
  );
  if (inlineScripts.length !== 1 || inlineStyles.length !== 1) {
    errors.push(
      `Webview must contain one inline script and style; received ${inlineScripts.length} and ${inlineStyles.length}.`,
    );
  } else {
    const scriptHash = cspHash(inlineScripts[0]);
    const styleHash = cspHash(inlineStyles[0]);
    if (!webview.includes(`script-src ${scriptHash}`)) {
      errors.push('Webview script CSP hash does not match its inline script.');
    }
    if (!webview.includes(`style-src ${styleHash}`)) {
      errors.push('Webview style CSP hash does not match its inline stylesheet.');
    }
  }
} catch {
  // Missing webview is already reported above.
}

try {
  const pluginBundle = await readFile(path.join(root, manifest.entry), 'utf8');
  if (/sourceMappingURL=/.test(pluginBundle)) {
    errors.push('Plugin bundle references a source map that is not part of the package.');
  }
} catch {
  // Missing entry is already reported above.
}

if (errors.length > 0) {
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  process.stdout.write('Recorder package validation passed.\n');
}
