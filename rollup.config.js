import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import css from 'rollup-plugin-css-only';

const production = !process.env.ROLLUP_WATCH;

export default {
  input: 'desktop/main.js',
  output: {
    file: 'desktop/bundle.js',
    //dir: 'dist',
    format: 'iife',
    sourcemap: !production,
    //format: 'cjs',
    name: 'Desktop',
  },
  plugins: [
    svelte({
      compilerOptions: {
        // Enable run-time checks when not in production
        dev: !production
      }
    }),
    // Extract component CSS into separate files
    css({ output: 'bundle.css' }),

    // Resolve node_modules
    resolve({
      browser: true,
      dedupe: ['svelte']
    }),
    commonjs(),

    // Minify in production
    production && terser()
  ],
  watch: {
    clearScreen: false
  }
};