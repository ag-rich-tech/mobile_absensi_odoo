// Runner for test_adapters.js under bare Node (no Vite).
// Sets mock mode BEFORE the dynamic import so config.js picks it up.
process.env.VITE_USE_MOCK = 'true';
await import('./test_adapters.js');
