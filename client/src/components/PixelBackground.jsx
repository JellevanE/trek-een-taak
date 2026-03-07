import { useEffect, useRef, useState, useCallback } from 'react';

// Hues pulled from the app's accent palette
const COLORS = ['#30087a', '#3b3b3b', '#e8e4e7', '#ededed', '#979498'];

// Canvas extends this many pixels beyond the viewport on every side.
// Particles wrap at the canvas edges, which are off-screen, so the seam
// clustering is never visible.
const OVERSCAN = 200;

// TODO: migrate settings to server-side user preferences
// Replace loadSettings()/localStorage.setItem with GET /api/me/preferences
// and PATCH /api/me/preferences when the personal settings page is built.
// Suggested shape: user.preferences.pixelBg = { enabled, count, speed, ... }
const STORAGE_KEY = 'pixelBgSettings';

// Defaults tuned to the sweet spot found during the demo phase
const DEFAULTS = {
    enabled: true,
    count: 2900,
    speed: 0.5,
    fieldScale: 0.002,
    fieldStrength: 1.5,
    pixelSize: 9,
    opacity: 0.2,
    trailFade: 0.5,
};

// Ranges kept tight around what looks good — wide enough for variety,
// narrow enough that you can't accidentally make it unreadable
const CONTROLS = [
    {
        key: 'count',
        label: 'Density',
        desc: 'Number of pixels in the field',
        min: 500,
        max: 4000,
        step: 100,
    },
    {
        key: 'speed',
        label: 'Speed',
        desc: 'Overall drift velocity',
        min: 0.1,
        max: 2,
        step: 0.1,
    },
    {
        key: 'fieldScale',
        label: 'Field scale',
        desc: 'Low = wide lazy curves, high = tight turbulence',
        min: 0.001,
        max: 0.005,
        step: 0.0005,
    },
    {
        key: 'fieldStrength',
        label: 'Field strength',
        desc: 'How hard the swirl pushes each pixel',
        min: 0.5,
        max: 3,
        step: 0.1,
    },
    {
        key: 'pixelSize',
        label: 'Pixel size',
        desc: 'Size of each square pixel',
        min: 3,
        max: 12,
        step: 1,
    },
    {
        key: 'opacity',
        label: 'Opacity',
        desc: 'Pixel brightness when drawn',
        min: 0.1,
        max: 0.8,
        step: 0.05,
    },
    {
        key: 'trailFade',
        label: 'Trail fade',
        desc: 'Low = long smoky trails, high = clean crisp motion',
        min: 0.1,
        max: 0.8,
        step: 0.05,
    },
];

function loadSettings() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : { ...DEFAULTS };
    } catch {
        return { ...DEFAULTS };
    }
}

function makeParticles(count, width, height) {
    return Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        colorIndex: Math.floor(Math.random() * COLORS.length),
        // Per-particle phase offset prevents all particles from converging
        // to the same attractors in the sine/cosine flow field
        phase: Math.random() * Math.PI * 2,
    }));
}

export default function PixelBackground({ showControls = false }) {
    const canvasRef = useRef(null);
    const paramsRef = useRef(loadSettings());
    const particlesRef = useRef([]);
    const animRef = useRef(null);
    const [params, setParams] = useState(() => loadSettings());

    // Keep paramsRef in sync and persist to localStorage on every change
    useEffect(() => {
        paramsRef.current = params;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
        } catch {
            // localStorage unavailable, silently ignore
        }
    }, [params]);

    const set = (key) => (e) =>
        setParams((p) => ({ ...p, [key]: parseFloat(e.target.value) }));

    const reseed = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        particlesRef.current = makeParticles(paramsRef.current.count, canvas.width, canvas.height);
    }, []);

    const reset = useCallback(() => {
        setParams({ ...DEFAULTS });
    }, []);

    // Main animation loop — runs once, reads all params via ref so sliders
    // update in real time without restarting the loop
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const resize = () => {
            canvas.width = globalThis.innerWidth + OVERSCAN * 2;
            canvas.height = globalThis.innerHeight + OVERSCAN * 2;
            particlesRef.current = makeParticles(
                paramsRef.current.count,
                canvas.width,
                canvas.height,
            );
        };
        resize();
        addEventListener('resize', resize);

        let time = 0;

        const tick = () => {
            const { enabled, speed, fieldScale, fieldStrength, pixelSize, opacity, trailFade } =
                paramsRef.current;
            const { width, height } = canvas;

            if (!enabled) {
                ctx.clearRect(0, 0, width, height);
                animRef.current = requestAnimationFrame(tick);
                return;
            }

            // Semi-transparent overlay instead of clearing — creates trails
            ctx.fillStyle = `rgba(8, 6, 18, ${trailFade})`;
            ctx.fillRect(0, 0, width, height);

            time += 0.005 * speed;

            ctx.globalAlpha = opacity;
            for (const p of particlesRef.current) {
                // Flow field: per-particle phase offset prevents convergence to same attractors
                const angle =
                    (Math.sin(p.x * fieldScale + time + p.phase) +
                        Math.cos(p.y * fieldScale + time * 0.71 + p.phase * 0.5)) *
                    Math.PI;

                // Small random jitter breaks particles out of local convergence zones
                p.x += Math.cos(angle) * speed * fieldStrength + (Math.random() - 0.5) * 0.4;
                p.y += Math.sin(angle) * speed * fieldStrength + (Math.random() - 0.5) * 0.4;

                // Wrap at canvas boundary (OVERSCAN beyond viewport — never visible)
                if (p.x < 0) p.x += width;
                else if (p.x > width) p.x -= width;
                if (p.y < 0) p.y += height;
                else if (p.y > height) p.y -= height;

                ctx.fillStyle = COLORS[p.colorIndex];
                ctx.fillRect(Math.round(p.x), Math.round(p.y), pixelSize, pixelSize);
            }
            ctx.globalAlpha = 1;

            animRef.current = requestAnimationFrame(tick);
        };

        tick();

        const onVisibility = () => {
            if (document.hidden) {
                cancelAnimationFrame(animRef.current);
            } else {
                tick();
            }
        };
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            cancelAnimationFrame(animRef.current);
            removeEventListener('resize', resize);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, []);

    // Re-seed when count changes (all other params update live via ref)
    const prevCount = useRef(params.count);
    useEffect(() => {
        if (params.count === prevCount.current) return;
        prevCount.current = params.count;
        const canvas = canvasRef.current;
        if (!canvas) return;
        particlesRef.current = makeParticles(params.count, canvas.width, canvas.height);
    }, [params.count]);

    return (
        // pointerEvents none so the canvas never blocks clicks on app content
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            <canvas
                ref={canvasRef}
                style={{
                    display: 'block',
                    position: 'absolute',
                    top: -OVERSCAN,
                    left: -OVERSCAN,
                    width: `calc(100% + ${OVERSCAN * 2}px)`,
                    height: `calc(100% + ${OVERSCAN * 2}px)`,
                }}
            />

            {showControls && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: 16,
                        right: 16,
                        background: 'rgba(0, 0, 0, 0.92)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderLeft: '3px solid #00f0ff',
                        borderRadius: 8,
                        padding: '14px 18px',
                        color: 'white',
                        fontFamily: "'Press Start 2P', monospace",
                        fontSize: 9,
                        width: 280,
                        zIndex: 2000,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        maxHeight: 'calc(100vh - 32px)',
                        overflowY: 'auto',
                        pointerEvents: 'auto',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <span style={{ color: '#00f0ff', letterSpacing: 1 }}>PIXEL BG</span>
                        <button
                            type='button'
                            onClick={() => setParams((p) => ({ ...p, enabled: !p.enabled }))}
                            style={{
                                padding: '4px 10px',
                                background: params.enabled
                                    ? 'rgba(0, 240, 255, 0.15)'
                                    : 'rgba(255,255,255,0.06)',
                                border: `1px solid ${params.enabled ? '#00f0ff' : 'rgba(255,255,255,0.2)'}`,
                                borderRadius: 4,
                                color: params.enabled ? '#00f0ff' : 'rgba(255,255,255,0.4)',
                                cursor: 'pointer',
                                fontFamily: "'Press Start 2P', monospace",
                                fontSize: 9,
                            }}
                        >
                            {params.enabled ? 'ON' : 'OFF'}
                        </button>
                    </div>

                    {CONTROLS.map(({ key, label, desc, min, max, step }) => (
                        <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'baseline',
                                }}
                            >
                                <span style={{ color: '#9b5cff' }}>{label}</span>
                                <span style={{ color: '#00f0ff', minWidth: 44, textAlign: 'right' }}>
                                    {params[key]}
                                </span>
                            </div>
                            <div
                                style={{
                                    color: 'rgba(255,255,255,0.35)',
                                    fontSize: 8,
                                    lineHeight: 1.6,
                                    marginBottom: 2,
                                }}
                            >
                                {desc}
                            </div>
                            <input
                                type='range'
                                min={min}
                                max={max}
                                step={step}
                                value={params[key]}
                                onChange={set(key)}
                                style={{ width: '100%', accentColor: '#00f0ff', cursor: 'pointer' }}
                            />
                        </div>
                    ))}

                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <button
                            type='button'
                            onClick={reseed}
                            style={{
                                flex: 1,
                                padding: '7px 0',
                                background: 'rgba(155, 92, 255, 0.15)',
                                border: '1px solid rgba(155, 92, 255, 0.4)',
                                borderRadius: 4,
                                color: '#9b5cff',
                                cursor: 'pointer',
                                fontFamily: "'Press Start 2P', monospace",
                                fontSize: 8,
                            }}
                        >
                            RESEED
                        </button>
                        <button
                            type='button'
                            onClick={reset}
                            style={{
                                flex: 1,
                                padding: '7px 0',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: 4,
                                color: 'rgba(255,255,255,0.45)',
                                cursor: 'pointer',
                                fontFamily: "'Press Start 2P', monospace",
                                fontSize: 8,
                            }}
                        >
                            RESET
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
