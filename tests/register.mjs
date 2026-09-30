import { registerHooks } from 'node:module';
const localTests = new URL('./', import.meta.url).href;
const localLib = new URL('../lib/', import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/headers") return nextResolve("next/headers.js", context);
    if (context.parentURL?.startsWith(localTests) && specifier.startsWith('../lib/') && !specifier.endsWith('.ts')) {
      return nextResolve(`${specifier}.ts`, context);
    }
    if (context.parentURL?.startsWith(localLib) && /^\.\/[^./]+$/.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});
