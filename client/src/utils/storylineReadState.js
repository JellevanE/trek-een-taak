const STORAGE_KEY = 'storyline:lastSeenUpdates';

function readMap() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
        return {};
    }
}

export function getLastSeenUpdateId(campaignId) {
    return readMap()[String(campaignId)] ?? null;
}

export function setLastSeenUpdateId(campaignId, updateId) {
    const map = readMap();
    map[String(campaignId)] = updateId;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {
        // localStorage unavailable (private mode) — read-state is best-effort UX
    }
}

export function computeHasNewUpdate(storyline) {
    if (!storyline || !Array.isArray(storyline.updates) || storyline.updates.length === 0) {
        return false;
    }
    const latest = storyline.updates[storyline.updates.length - 1];
    return latest.id !== getLastSeenUpdateId(storyline.campaignId);
}
