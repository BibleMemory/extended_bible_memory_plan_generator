#!/usr/bin/env node

import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read package.json for version and metadata
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

// Read both stylesheets
const screenCss = fs.readFileSync(path.join(__dirname, 'src/styles/screen.css'), 'utf8');
const printCss = fs.readFileSync(path.join(__dirname, 'src/styles/print.css'), 'utf8');
const combinedCss = screenCss + '\n' + printCss;

// CSS injection snippet: injects styles once on first load
const cssInjectionCode = `
(function() {
  if (typeof document !== 'undefined' && !document.getElementById('bmp-styles')) {
    const style = document.createElement('style');
    style.id = 'bmp-styles';
    style.textContent = ${JSON.stringify(combinedCss)};
    document.head.appendChild(style);
  }
})();
`;

// Banner with version and repo info
const banner = `/*!
 * ${pkg.name} v${pkg.version}
 * https://github.com/BibleMemory/extended_bible_memory_plan_generator
 */
`;

async function build() {
  try {
    // Ensure dist directory exists
    if (!fs.existsSync(path.join(__dirname, 'dist'))) {
      fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
    }

    // Build the main minified bundle with injected CSS
    console.log('Building dist/bible-memory-plan.min.js...');
    const result = await esbuild.build({
      entryPoints: [path.join(__dirname, 'src/index.js')],
      bundle: true,
      format: 'iife',
      minify: true,
      outfile: path.join(__dirname, 'dist/bible-memory-plan.min.js'),
      banner: {
        js: banner + '\n' + cssInjectionCode,
      },
      external: [],
      logLevel: 'info',
      target: 'es2020',
    });

    console.log('✓ Bundle created');

    // Write combined CSS file for reference / alternative use
    console.log('Writing dist/bible-memory-plan.css...');
    fs.writeFileSync(
      path.join(__dirname, 'dist/bible-memory-plan.css'),
      combinedCss,
      'utf8'
    );
    console.log('✓ CSS file created');

    // Print file sizes
    const minifiedPath = path.join(__dirname, 'dist/bible-memory-plan.min.js');
    const cssPath = path.join(__dirname, 'dist/bible-memory-plan.css');
    const minifiedSize = fs.statSync(minifiedPath).size;
    const cssSize = fs.statSync(cssPath).size;

    console.log('\n📦 Build complete!');
    console.log(`   dist/bible-memory-plan.min.js: ${(minifiedSize / 1024).toFixed(2)} KB`);
    console.log(`   dist/bible-memory-plan.css: ${(cssSize / 1024).toFixed(2)} KB`);
  } catch (err) {
    console.error('❌ Build failed:', err);
    process.exit(1);
  }
}

build();
