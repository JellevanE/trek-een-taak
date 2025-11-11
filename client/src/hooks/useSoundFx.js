import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const clampVolume = (value) => {
    if (Number.isNaN(value)) return 0;
    return Math.min(100, Math.max(0, value));
};

const getAudioContext = (ref) => {
    if (typeof window === 'undefined') return null;
    if (ref.current) return ref.current;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ref.current = new Ctor();
    return ref.current;
};

const createTonePlayer = (audioCtxRef, tone, gain) => {
    const toneConfig = tone || {};
    const duration = typeof toneConfig.duration === 'number' ? toneConfig.duration : 0.3;
    const frequency = typeof toneConfig.frequency === 'number' ? toneConfig.frequency : 440;
    const waveform = toneConfig.type || 'sine';
    const perEventVolume = clampVolume(toneConfig.volumePercent ?? 100) / 100;

    return () => {
        const ctx = getAudioContext(audioCtxRef);
        if (!ctx) return;
        const oscillator = ctx.createOscillator();
        oscillator.type = waveform;
        oscillator.frequency.value = frequency;
        const gainNode = ctx.createGain();
        gainNode.gain.value = Math.max(0, Math.min(1, gain * perEventVolume));
        oscillator.connect(gainNode).connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + duration);
        if (typeof ctx.resume === 'function') {
            ctx.resume().catch(() => {});
        }
    };
};

const createSamplePlayer = (sources = [], gain) => {
    if (!Array.isArray(sources) || sources.length === 0 || typeof document === 'undefined') {
        return null;
    }
    const base = document.createElement('audio');
    base.preload = 'auto';
    base.volume = Math.max(0, Math.min(1, gain));
    sources.forEach((source) => {
        if (!source?.src) return;
        const sourceNode = document.createElement('source');
        sourceNode.src = source.src;
        if (source.type) {
            sourceNode.type = source.type;
        }
        base.appendChild(sourceNode);
    });
    try {
        base.load();
    } catch {
        // ignore load errors
    }
    return () => {
        const node = base.cloneNode(true);
        node.volume = Math.max(0, Math.min(1, gain));
        const playPromise = node.play();
        if (playPromise?.catch) {
            playPromise.catch(() => {});
        }
    };
};

export const useSoundFx = ({
    soundFxProfile,
    volumePercent = 100,
    prefersReducedMotion = false
} = {}) => {
    const audioCtxRef = useRef(null);
    const [players, setPlayers] = useState({});
    const clampedVolume = useMemo(() => clampVolume(volumePercent), [volumePercent]);
    const muted = prefersReducedMotion || !soundFxProfile?.enabled || clampedVolume <= 0;

    useEffect(() => () => {
        if (audioCtxRef.current && typeof audioCtxRef.current.close === 'function') {
            audioCtxRef.current.close().catch(() => {});
            audioCtxRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (muted) {
            setPlayers({});
            return undefined;
        }
        const normalizedGain = clampedVolume / 100;
        const nextPlayers = {};
        const events = soundFxProfile?.events || {};
        Object.entries(events).forEach(([key, config]) => {
            if (!config) return;
            const perEventGain = normalizedGain * (clampVolume(config.volumePercent ?? 100) / 100);
            let player = null;
            if (Array.isArray(config.sources) && config.sources.length > 0) {
                player = createSamplePlayer(config.sources, perEventGain);
            }
            if (!player && config.tone) {
                player = createTonePlayer(audioCtxRef, config.tone, perEventGain);
            }
            if (player) {
                nextPlayers[key] = player;
            }
        });
        setPlayers(nextPlayers);
        return undefined;
    }, [clampedVolume, muted, soundFxProfile]);

    const play = useCallback((eventKey) => {
        if (muted || !eventKey) return;
        const player = players[eventKey];
        if (typeof player === 'function') {
            player();
        }
    }, [muted, players]);

    return {
        enabled: !muted && Object.keys(players).length > 0,
        play,
        volumePercent: clampedVolume,
        requirements: soundFxProfile?.requirements ?? null
    };
};

export default useSoundFx;
