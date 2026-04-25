import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://chat.neoflowoff.agency',
  output: 'server',
  adapter: node({
    mode: 'standalone'
  })
});
