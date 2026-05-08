import { defineConfig } from 'tsup';

export default defineConfig({
  // formActions is a separate entry so its module-level `'use server'`
  // directive (which Next.js needs to see at the top of the published
  // chunk) doesn't get tangled up with the rest of the library.
  entry: {
    index: 'src/index.ts',
    'engine/formActions': 'src/engine/formActions.ts',
    // Standalone entry so its module-level `'use client'` directive sits
    // at the top of the published chunk for Next.js to recognise.
    'components/GovukInit': 'src/components/GovukInit/GovukInit.tsx',
  },
  format: ['esm', 'cjs'],
  dts: {
    resolve: true,
  },
  tsconfig: './tsconfig.build.json',
  clean: true,
  sourcemap: true,
  treeshake: true,
  target: 'es2022',
  // ESM splitting moves shared code (data.utils, validation.utils, etc.)
  // into shared chunks so the main bundle and the Server Action chunk
  // both resolve to the same compiled module rather than each inlining
  // their own copy. Critical for Next.js to recognise submitFormAction
  // (defined in the formActions chunk with `'use server'`) when called
  // from FormRenderer in the main bundle.
  splitting: true,
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    'next',
    /^next\//,
    // Azure SDKs are optional peer deps — keep them external so non-Azure
    // consumers don't pull in ~19MB of dependencies they won't use.
    /^@azure\//,
    // Keep govuk-frontend external — its JS is dynamically imported by
    // GovukInit at runtime, and its CSS lives entirely on the consumer side.
    'govuk-frontend',
  ],
  // esbuild strips module-level `'use client'` directives the same way
  // it strips `'use server'`. Re-prepend on the GovukInit chunk so
  // Next.js client-references the export when consumers import from
  // the `./components/GovukInit` subpath.
  onSuccess: async () => {
    const { readFile, writeFile } = await import('node:fs/promises');
    const files = [
      'dist/components/GovukInit.js',
      'dist/components/GovukInit.cjs',
    ];
    await Promise.all(
      files.map(async (path) => {
        const content = await readFile(path, 'utf8');
        if (!content.startsWith("'use client'")) {
          await writeFile(path, `'use client';\n${content}`);
        }
      }),
    );
  },
});
