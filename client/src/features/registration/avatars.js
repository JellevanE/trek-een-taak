/**
 * Avatar presets
 * --------------
 * The profile `avatar` field is a free-form string on the server (URL or
 * anything ≤ 2048 chars). Presets are stored as `preset:<id>` so the client
 * can render them from the pixel icon set while remaining forward-compatible
 * with uploaded image URLs later on.
 */

export const AVATAR_PREFIX = 'preset:';

export const AVATAR_PRESETS = [
    { id: 'wanderer', label: 'Wanderer', icon: 'user', hue: 'purple' },
    { id: 'starborn', label: 'Starborn', icon: 'star', hue: 'cyan' },
    { id: 'lorekeeper', label: 'Lorekeeper', icon: 'book-heart', hue: 'pink' },
    { id: 'tinker', label: 'Tinker', icon: 'cog', hue: 'amber' },
    { id: 'trickster', label: 'Trickster', icon: 'shuffle', hue: 'green' },
    { id: 'herald', label: 'Herald', icon: 'bell', hue: 'cyan' },
    { id: 'sentinel', label: 'Sentinel', icon: 'octagon-check', hue: 'purple' },
    { id: 'oracle', label: 'Oracle', icon: 'question-circle', hue: 'pink' },
];

export function avatarValueFor(preset) {
    return preset ? `${AVATAR_PREFIX}${preset.id}` : null;
}

/**
 * Resolves a stored avatar string to a preset, or null when it isn't one
 * (empty, an image URL, or an unknown preset id).
 */
export function avatarPresetFromValue(value) {
    if (typeof value !== 'string' || !value.startsWith(AVATAR_PREFIX)) return null;
    const id = value.slice(AVATAR_PREFIX.length);
    return AVATAR_PRESETS.find((preset) => preset.id === id) || null;
}

export function isAvatarImageUrl(value) {
    return typeof value === 'string' && /^(https?:\/\/|data:image\/|\/)/i.test(value);
}
