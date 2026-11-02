import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import remarkCjkEmphasis from './src/remark/cjk-emphasis.mjs';
import remarkDayOnePhotoLayout from './src/remark/day-one-photo-layout.mjs';

export default defineConfig({
  site: 'https://ifn-vh.github.io',
  markdown: {
    processor: unified({
      remarkPlugins: [remarkCjkEmphasis, remarkDayOnePhotoLayout],
    }),
  },
});
