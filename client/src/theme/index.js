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

const createColorTokens = (overrides = {}) => ({
    background: overrides.background ?? '#081020',
    backgroundGradient: overrides.backgroundGradient ?? 'radial-gradient(ellipse at center, rgba(20,24,35,1) 0%, rgba(8,16,32,1) 60%)',
    surface: overrides.surface ?? '#0f1724',
    accentCyan: overrides.accentCyan ?? '#00f0ff',
    accentPink: overrides.accentPink ?? '#ff2ec4',
    accentPurple: overrides.accentPurple ?? '#9b5cff',
    muted: overrides.muted ?? '#9aa3b2',
    progressTrack: overrides.progressTrack ?? 'rgba(255,255,255,0.03)',
    progressFill: overrides.progressFill ?? 'linear-gradient(90deg, #9b5cff, #ff2ec4)'
});

const createAnimationTokens = (overrides = {}) => ({
    pulse: {
        scale: overrides.pulse?.scale ?? 1.02,
        shadowStrong: overrides.pulse?.shadowStrong ?? 'rgba(0,0,0,0.18)',
        shadowRest: overrides.pulse?.shadowRest ?? 'rgba(0,0,0,0.08)'
    },
    spawn: {
        startShadow: overrides.spawn?.startShadow ?? 'rgba(0,0,0,0)',
        midShadow: overrides.spawn?.midShadow ?? 'rgba(0,0,0,0.45)',
        endShadow: overrides.spawn?.endShadow ?? 'rgba(0,0,0,0.6)'
    },
    glow: {
        phaseOne: overrides.glow?.phaseOne ?? 'rgba(99,102,241,0.30)',
        phaseTwo: overrides.glow?.phaseTwo ?? 'rgba(155,92,255,0.28)',
        phaseThree: overrides.glow?.phaseThree ?? 'rgba(99,102,241,0.18)'
    },
    burst: {
        ringStart: overrides.burst?.ringStart ?? 'rgba(0,240,255,0.12)',
        ringMid: overrides.burst?.ringMid ?? 'rgba(255,255,255,0.22)',
        ringEnd: overrides.burst?.ringEnd ?? 'rgba(255,255,255,0)',
        haloBorder: overrides.burst?.haloBorder ?? 'rgba(255,255,255,0.14)',
        haloBackground: overrides.burst?.haloBackground ?? 'rgba(0,0,0,0.68)'
    }
});

export const SOUND_EVENT_KEYS = Object.freeze({
    QUEST_ADD: 'quest_add',
    QUEST_COMPLETE: 'quest_complete',
    QUEST_DELETE: 'quest_delete',
    SIDE_QUEST_ADD: 'side_quest_add',
    SIDE_QUEST_COMPLETE: 'side_quest_complete',
    PRIORITY_CYCLE: 'priority_cycle',
    LEVEL_UP: 'level_up',
    NOTIFICATION: 'notification',
    INTERFACE_CLICK: 'interface_click'
});

export const DEFAULT_THEME_ID = 'neon_arcade';

export const THEME_PROFILES = Object.freeze({
    neon_arcade: {
        id: 'neon_arcade',
        label: 'Neon Arcade',
        appearance: 'dark',
        colors: createColorTokens(),
        animations: createAnimationTokens(),
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
            volumePercent: 65,
            requirements: {
                formats: ['audio/webm', 'audio/mpeg'],
                maxFileSizeKb: 50,
                notes: 'Provide both .webm and .mp3 variants for each clip; keep files under 50kb.'
            },
            events: {
                [SOUND_EVENT_KEYS.QUEST_ADD]: {
                    label: 'Quest added',
                    sources: [
                        { src: '/sounds/463202_kenneth_cooney_one_beep.webm', type: 'audio/webm' },
                        { src: '/sounds/463202_kenneth_cooney_one_beep.mp3', type: 'audio/mpeg' }
                    ]
                },
                [SOUND_EVENT_KEYS.QUEST_COMPLETE]: {
                    label: 'Quest completed',
                    sources: [
                        { src: '/sounds/609336_kenneth_cooney_completed.webm', type: 'audio/webm' },
                        { src: '/sounds/609336_kenneth_cooney_completed.mp3', type: 'audio/mpeg' }
                    ]
                },
                [SOUND_EVENT_KEYS.QUEST_DELETE]: {
                    label: 'Quest deleted',
                    sources: [
                        { src: '/sounds/580307_colorscrimsontears_slash-rpg.webm', type: 'audio/webm' },
                        { src: '/sounds/580307_colorscrimsontears_slash-rpg.mp3', type: 'audio/mpeg' }
                    ]
                },
                [SOUND_EVENT_KEYS.SIDE_QUEST_ADD]: {
                    label: 'Side quest added',
                    sources: [
                        { src: '/sounds/692109_samuel54tw_pop-videogame-sound.webm', type: 'audio/webm' },
                        { src: '/sounds/692109_samuel54tw_pop-videogame-sound.mp3', type: 'audio/mpeg' }
                    ]
                },
                [SOUND_EVENT_KEYS.SIDE_QUEST_COMPLETE]: {
                    label: 'Side quest completed',
                    sources: [
                        { src: '/sounds/758956_ksaplay_8-bit-rebound-2.webm', type: 'audio/webm' },
                        { src: '/sounds/758956_ksaplay_8-bit-rebound-2.mp3', type: 'audio/mpeg' }
                    ]
                },
                [SOUND_EVENT_KEYS.PRIORITY_CYCLE]: {
                    label: 'Priority cycled',
                    sources: [
                        { src: '/sounds/735804_biornade_clicking-for-multiple-purposes.webm', type: 'audio/webm' },
                        { src: '/sounds/735804_biornade_clicking-for-multiple-purposes.mp3', type: 'audio/mpeg' }
                    ]
                },
                [SOUND_EVENT_KEYS.LEVEL_UP]: {
                    label: 'Level up',
                    sources: [
                        { src: '/sounds/609335_kenneth_cooney_levelup.webm', type: 'audio/webm' },
                        { src: '/sounds/609335_kenneth_cooney_levelup.mp3', type: 'audio/mpeg' }
                    ]
                },
                [SOUND_EVENT_KEYS.NOTIFICATION]: {
                    label: 'Notification',
                    sources: [
                        { src: '/sounds/750608_deadrobotmusic_notification-sound-2.webm', type: 'audio/webm' },
                        { src: '/sounds/750608_deadrobotmusic_notification-sound-2.mp3', type: 'audio/mpeg' }
                    ]
                },
                [SOUND_EVENT_KEYS.INTERFACE_CLICK]: {
                    label: 'Interface click',
                    sources: [
                        { src: '/sounds/827638_elliottliu_interface8.webm', type: 'audio/webm' },
                        { src: '/sounds/827638_elliottliu_interface8.mp3', type: 'audio/mpeg' }
                    ]
                }
            }
        }
    },
    classic: {
        id: 'classic',
        label: 'Classic',
        appearance: 'light',
        colors: createColorTokens({
            background: '#f6fafc',
            backgroundGradient: 'radial-gradient(circle at top, rgba(246,250,252,1) 0%, rgba(226,230,238,1) 65%)',
            surface: '#ffffff',
            accentCyan: '#0ea5e9',
            accentPink: '#e879f9',
            accentPurple: '#7c3aed',
            muted: '#415161',
            progressTrack: 'rgba(15,23,42,0.08)',
            progressFill: 'linear-gradient(90deg, #7c3aed, #f472b6)'
        }),
        animations: createAnimationTokens({
            pulse: {
                scale: 1.015,
                shadowStrong: 'rgba(15, 23, 42, 0.22)',
                shadowRest: 'rgba(15, 23, 42, 0.12)'
            },
            spawn: {
                startShadow: 'rgba(15,23,42,0.12)',
                midShadow: 'rgba(15,23,42,0.3)',
                endShadow: 'rgba(15,23,42,0.24)'
            },
            glow: {
                phaseOne: 'rgba(63,81,181,0.35)',
                phaseTwo: 'rgba(124,58,237,0.28)',
                phaseThree: 'rgba(63,81,181,0.15)'
            },
            burst: {
                ringStart: 'rgba(14,165,233,0.25)',
                ringMid: 'rgba(15,23,42,0.45)',
                ringEnd: 'rgba(15,23,42,0)',
                haloBorder: 'rgba(15,23,42,0.2)',
                haloBackground: 'rgba(246,250,252,0.92)'
            }
        }),
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
            volumePercent: 0,
            requirements: {
                formats: ['audio/webm', 'audio/mpeg'],
                maxFileSizeKb: 50,
                notes: 'Classic keeps sound design disabled by default; enable per user preference.'
            },
            events: {}
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
    if (profile.colors?.background) {
        vars['--bg-dark'] = profile.colors.background;
        vars['--body-background'] = profile.colors.backgroundGradient || profile.colors.background;
    }
    if (profile.colors?.surface) {
        vars['--panel-dark'] = profile.colors.surface;
    }
    if (profile.colors?.accentCyan) {
        vars['--accent-cyan'] = profile.colors.accentCyan;
    }
    if (profile.colors?.accentPink) {
        vars['--accent-pink'] = profile.colors.accentPink;
    }
    if (profile.colors?.accentPurple) {
        vars['--accent-purple'] = profile.colors.accentPurple;
    }
    if (profile.colors?.muted) {
        vars['--muted'] = profile.colors.muted;
    }
    if (profile.colors?.progressTrack) {
        vars['--progress-track'] = profile.colors.progressTrack;
    }
    if (profile.colors?.progressFill) {
        vars['--quest-progress-gradient'] = profile.colors.progressFill;
    }
    if (profile.animations?.pulse) {
        vars['--anim-pulse-scale-up'] = profile.animations.pulse.scale;
        vars['--anim-pulse-shadow-strong'] = profile.animations.pulse.shadowStrong;
        vars['--anim-pulse-shadow-rest'] = profile.animations.pulse.shadowRest;
    }
    if (profile.animations?.spawn) {
        vars['--anim-spawn-shadow-start'] = profile.animations.spawn.startShadow;
        vars['--anim-spawn-shadow-mid'] = profile.animations.spawn.midShadow;
        vars['--anim-spawn-shadow-end'] = profile.animations.spawn.endShadow;
    }
    if (profile.animations?.glow) {
        vars['--anim-glow-phase-1'] = profile.animations.glow.phaseOne;
        vars['--anim-glow-phase-2'] = profile.animations.glow.phaseTwo;
        vars['--anim-glow-phase-3'] = profile.animations.glow.phaseThree;
    }
    if (profile.animations?.burst) {
        vars['--anim-burst-ring-start'] = profile.animations.burst.ringStart;
        vars['--anim-burst-ring-mid'] = profile.animations.burst.ringMid;
        vars['--anim-burst-ring-end'] = profile.animations.burst.ringEnd;
        vars['--anim-burst-halo-border'] = profile.animations.burst.haloBorder;
        vars['--anim-burst-halo-bg'] = profile.animations.burst.haloBackground;
    }
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
