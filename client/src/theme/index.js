const createMotionProfile = (overrides = {}) => ({
    durations: {
        drag: overrides.durations?.drag ?? 0.28,
        hover: overrides.durations?.hover ?? 0.18,
        release: overrides.durations?.release ?? 0.32
    },
    easing: {
        drag: overrides.easing?.drag ?? [0.25, 0.1, 0.25, 1],
        hover: overrides.easing?.hover ?? [0.4, 0, 0.2, 1]
    },
    drag: {
        scale: overrides.drag?.scale ?? 1.02,
        shadow: overrides.drag?.shadow ?? '0 14px 24px rgba(57, 255, 20, 0.25)',
        glow: overrides.drag?.glow ?? '0 0 18px rgba(57, 255, 20, 0.45)'
    },
    idle: {
        shadow: overrides.idle?.shadow ?? '0 8px 14px rgba(0, 0, 0, 0.35)'
    }
});

export const DEFAULT_THEME_ID = 'neon_arcade';

export const THEME_PROFILES = Object.freeze({
    neon_arcade: {
        id: 'neon_arcade',
        label: 'Neon Arcade',
        appearance: 'dark',
        motion: createMotionProfile(),
        card: {
            depth: {
                resting: '0 18px 38px rgba(7, 8, 25, 0.85), 0 0 18px rgba(155,92,255,0.08) inset',
                active: '0 0 0 1px rgba(0,240,255,0.35), 0 24px 54px rgba(0,240,255,0.22)'
            },
            transition: '0.24s cubic-bezier(0.4, 0, 0.2, 1)',
            focusRing: 'rgba(0,240,255,0.4)'
        },
        cta: {
            transition: 'transform 0.18s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.18s ease',
            hoverShadow: '0 18px 36px rgba(148, 0, 211, 0.35)',
            hoverTranslate: '-2px',
            pressShadow: 'inset 0 3px 10px rgba(0,0,0,0.45)',
            pressTranslate: '1px',
            focusRing: 'rgba(0,240,255,0.4)'
        },
        glow: {
            intensity: 'neon',
            handle: '0 0 18px rgba(0,240,255,0.45)'
        },
        soundFx: {
            enabled: true,
            volume: 0.65
        }
    },
    classic: {
        id: 'classic',
        label: 'Classic',
        appearance: 'light',
        motion: createMotionProfile({
            durations: {
                drag: 0.24,
                hover: 0.16,
                release: 0.26
            },
            easing: {
                drag: [0.4, 0, 0.2, 1],
                hover: [0.25, 0.1, 0.25, 1]
            },
            drag: {
                scale: 1.015,
                shadow: '0 12px 22px rgba(111, 0, 255, 0.2)',
                glow: '0 0 14px rgba(111, 0, 255, 0.35)'
            },
            idle: {
                shadow: '0 6px 12px rgba(0, 0, 0, 0.15)'
            }
        }),
        card: {
            depth: {
                resting: '0 10px 26px rgba(15, 23, 42, 0.35), 0 0 14px rgba(148,0,211,0.08)',
                active: '0 0 0 1px rgba(15,23,42,0.15), 0 18px 40px rgba(15, 23, 42, 0.28)'
            },
            transition: '0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            focusRing: 'rgba(63, 63, 70, 0.45)'
        },
        cta: {
            transition: 'transform 0.16s ease, box-shadow 0.16s ease',
            hoverShadow: '0 12px 24px rgba(15, 23, 42, 0.25)',
            hoverTranslate: '-1px',
            pressShadow: 'inset 0 2px 6px rgba(15, 23, 42, 0.25)',
            pressTranslate: '1px',
            focusRing: 'rgba(63, 63, 70, 0.45)'
        },
        glow: {
            intensity: 'subtle',
            handle: '0 0 12px rgba(15, 23, 42, 0.25)'
        },
        soundFx: {
            enabled: false,
            volume: 0
        }
    }
});

export const LEGACY_THEME_MAP = Object.freeze({
    dark: 'neon_arcade',
    light: 'classic'
});

export const THEME_SEQUENCE = Object.freeze(Object.keys(THEME_PROFILES));

export const resolveThemeId = (candidate = DEFAULT_THEME_ID) => {
    if (!candidate) return DEFAULT_THEME_ID;
    const normalized = String(candidate).toLowerCase();
    if (THEME_PROFILES[normalized]) {
        return normalized;
    }
    return LEGACY_THEME_MAP[normalized] ?? DEFAULT_THEME_ID;
};

export const getThemeProfile = (candidate = DEFAULT_THEME_ID) => {
    const resolved = resolveThemeId(candidate);
    return THEME_PROFILES[resolved] ?? THEME_PROFILES[DEFAULT_THEME_ID];
};

export const getNextThemeId = (currentId = DEFAULT_THEME_ID) => {
    const resolved = resolveThemeId(currentId);
    const currentIndex = THEME_SEQUENCE.indexOf(resolved);
    if (currentIndex === -1) return DEFAULT_THEME_ID;
    const nextIndex = (currentIndex + 1) % THEME_SEQUENCE.length;
    return THEME_SEQUENCE[nextIndex];
};

export const getThemeCssVariables = (profile) => {
    if (!profile) return {};
    const vars = {};
    if (profile.card?.depth?.resting) {
        vars['--quest-card-shadow-resting'] = profile.card.depth.resting;
    }
    if (profile.card?.depth?.active) {
        vars['--quest-card-shadow-active'] = profile.card.depth.active;
    }
    if (profile.card?.transition) {
        vars['--quest-card-shadow-transition'] = profile.card.transition;
    }
    if (profile.card?.focusRing) {
        vars['--quest-card-focus-outline'] = profile.card.focusRing;
    }
    if (profile.cta?.transition) {
        vars['--cta-transition'] = profile.cta.transition;
    }
    if (profile.cta?.hoverShadow) {
        vars['--cta-hover-shadow'] = profile.cta.hoverShadow;
    }
    if (profile.cta?.hoverTranslate) {
        vars['--cta-hover-translate'] = profile.cta.hoverTranslate;
    }
    if (profile.cta?.pressShadow) {
        vars['--cta-press-shadow'] = profile.cta.pressShadow;
    }
    if (profile.cta?.pressTranslate) {
        vars['--cta-press-translate'] = profile.cta.pressTranslate;
    }
    if (profile.cta?.focusRing) {
        vars['--cta-focus-ring-color'] = profile.cta.focusRing;
    }
    return vars;
};
