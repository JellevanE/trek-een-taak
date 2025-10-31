// File locking was previously used to serialize JSON writes.
// The TypeScript migration intentionally omits this helper because
// the backend is transitioning to a real database (SQLite/Postgres).
// If flat-file storage ever returns, reintroduce a dedicated lock helper here.
