import { createHash } from 'node:crypto';
import { posix, resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';

function cspHash(source: string): string {
  return `'sha256-${createHash('sha256').update(source).digest('base64')}'`;
}

function referenceToBundleName(htmlFileName: string, reference: string): string {
  const withoutQuery = reference.split(/[?#]/, 1)[0] ?? reference;
  return posix.normalize(posix.join(posix.dirname(htmlFileName), withoutQuery));
}

/** Emit a self-contained classic document that IINA can load from a file URL. */
function iinaWebviewBundle(): Plugin {
  return {
    name: 'iina-webview-bundle',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const htmlAssets = Object.values(bundle).filter(
        (item) => item.type === 'asset' && item.fileName.endsWith('.html'),
      );
      if (htmlAssets.length !== 1) {
        this.error(`Expected one IINA webview HTML entry, received ${htmlAssets.length}.`);
      }

      const htmlAsset = htmlAssets[0];
      if (!htmlAsset || htmlAsset.type !== 'asset') return;

      let html = String(htmlAsset.source);
      const scriptSources: string[] = [];
      const styleSources: string[] = [];
      const inlinedFiles = new Set<string>();

      html = html.replace(
        /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi,
        (_tag, reference: string) => {
          const fileName = referenceToBundleName(htmlAsset.fileName, reference);
          const output = bundle[fileName];
          if (!output || output.type !== 'chunk') {
            this.error(`Unable to inline webview script ${reference}.`);
          }
          const source = output.code.replace(/<\/script/gi, '<\\/script');
          scriptSources.push(source);
          inlinedFiles.add(fileName);
          return '';
        },
      );

      html = html.replace(
        /<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi,
        (_tag, reference: string) => {
          const fileName = referenceToBundleName(htmlAsset.fileName, reference);
          const output = bundle[fileName];
          if (!output || output.type !== 'asset') {
            this.error(`Unable to inline webview stylesheet ${reference}.`);
          }
          const source = String(output.source).replace(/<\/style/gi, '<\\/style');
          styleSources.push(source);
          inlinedFiles.add(fileName);
          return `<style>${source}</style>`;
        },
      );

      html = html
        .replace(/<link\b[^>]*\brel=["']modulepreload["'][^>]*>/gi, '')
        .replace(/\s+crossorigin(?:=["'][^"']*["'])?/gi, '')
        .replace(/^[\t ]+$/gm, '');

      if (scriptSources.length !== 1 || styleSources.length !== 1) {
        this.error(
          `Expected one script and one stylesheet; received ${scriptSources.length} and ${styleSources.length}.`,
        );
      }

      html = html
        .replace("script-src 'self'", `script-src ${scriptSources.map(cspHash).join(' ')}`)
        .replace("style-src 'self'", `style-src ${styleSources.map(cspHash).join(' ')}`);

      const scripts = scriptSources.map((source) => `<script>${source}</script>`).join('');
      html = html.replace(/<\/body>/i, () => `${scripts}</body>`);
      htmlAsset.source = html;

      for (const fileName of inlinedFiles) delete bundle[fileName];
    },
  };
}

function browserDevelopment(): Plugin {
  return {
    name: 'browser-development',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const requestPath = request.url?.split(/[?#]/, 1)[0];
        if (requestPath !== '/') {
          next();
          return;
        }
        response.statusCode = 302;
        response.setHeader('Location', '/ui/window/');
        response.end();
      });
    },
    transformIndexHtml(html) {
      return html
        .replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
        .replace("style-src 'self'", "style-src 'self' 'unsafe-inline'")
        .replace("connect-src 'none'", "connect-src 'self' ws: wss:");
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), browserDevelopment(), iinaWebviewBundle()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['terminal.local'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'safari14.1',
    modulePreload: false,
    rollupOptions: {
      input: resolve(__dirname, 'ui/window/index.html'),
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
