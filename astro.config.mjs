import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const astroPackagePath = require.resolve('astro/package.json');
const astroRequire = createRequire(astroPackagePath);
const viteClientPath = astroRequire.resolve('vite/dist/client/client.mjs');

function viteClientFallback() {
  return {
    name: 'neo-vite-client-fallback',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.middlewares.use(async (req, res, next) => {
          if (req.url !== '/@vite/client' || !['GET', 'HEAD'].includes(req.method ?? '')) {
            return next();
          }

          try {
            const source = await readFile(viteClientPath, 'utf8');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/javascript');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Vary', 'Origin');

            if (req.method === 'HEAD') {
              res.end();
              return;
            }

            res.end(source);
          } catch (error) {
            next(error);
          }
        });
      }
    }
  };
}

export default defineConfig({
  site: 'https://chat.neoflowoff.agency',
  output: 'server',
  integrations: [viteClientFallback(), sitemap()],
  adapter: node({
    mode: 'standalone'
  })
});
