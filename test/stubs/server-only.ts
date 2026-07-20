// No-op stand-in for the `server-only` package under Vitest. The real package
// exists only to throw at build time if a server module is imported into a
// client bundle; in Node unit tests that guard is irrelevant, so we alias it
// to this empty module (see vitest.config.ts).
export {};
