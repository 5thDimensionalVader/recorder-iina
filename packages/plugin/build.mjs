import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const outputDirectory = path.join(root, 'dist');
const uiDirectory = path.join(root, 'packages/ui/dist');

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await cp(uiDirectory, outputDirectory, { recursive: true, force: true });

await build({
  absWorkingDir: root,
  entryPoints: {
    index: 'packages/plugin/src/index.ts',
  },
  outdir: 'dist',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['safari14.1'],
  sourcemap: false,
  minify: false,
  legalComments: 'none',
  charset: 'utf8',
});
