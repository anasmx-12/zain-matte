import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// One self-contained dist/index.html: can be opened by double-click or hosted anywhere.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
});
