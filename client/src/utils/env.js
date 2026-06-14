// Debug tooling is for local development only. Create React App sets
// NODE_ENV to 'production' during `npm run build` and 'development' during
// `npm start`, so this is false in the published bundle — the debug UI is
// compiled out and never shipped to users.
export const isDebugEnabled = process.env.NODE_ENV !== "production";
