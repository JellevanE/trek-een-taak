// Resolve Express's "trust proxy" setting from the TRUST_PROXY env var.
//   unset / "false" / "0" -> false (default; safe when not behind a proxy)
//   "true"                -> true (trust the immediate proxy chain)
//   a number (e.g. "1")   -> trust that many proxy hops
//   anything else         -> passed through (e.g. a subnet/IP list)
export function resolveTrustProxy(): boolean | number | string {
    const raw = process.env.TRUST_PROXY?.trim();
    if (!raw || raw === 'false' || raw === '0') return false;
    if (raw === 'true') return true;
    const asNumber = Number(raw);
    if (Number.isInteger(asNumber) && asNumber >= 0) return asNumber;
    return raw;
}
