import { useEffect, useRef, useState, useCallback } from 'react';

// Hues pulled from the app's accent palette
const COLORS = ['#00f0ff', '#9b5cff', '#ff2ec4', '#c8b4ff', '#ffffff'];

const DEFAULTS = {
    count: 800,
    speed: 0.8,
    fieldScale: 0.003,
    fieldStrength: 1.0,
    pixelSize: 2,
    opacity: 0.55,
    trailFade: 0.12,
};

function makeParticles(count, width, height) {
    return Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        colorIndex: Math.floor(Math.random() * COLORS.length),
    }));
}

export default function PixelBackground() {
    const canvasRef = useRef(null);
    const paramsRef = useRef({ ...DEFAULTS });
    const particlesRef = useRef([]);
    const animRef = useRef(null);
    const [params, setParams] = useState({ ...DEFAULTS });

    // Keep paramsRef in sync so the animation loop always reads latest values
    // without needing to restart the loop on every slider change
    useEffect(() => {
        paramsRef.current = params;
    }, [params]);

    const set = (key) => (e) =>
        setParams((p) => ({ ...p, [key]: parseFloat(e.target.value) }));

    const reseed = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        particlesRef.current = makeParticles(
            paramsRef.current.count,
            canvas.width,
            canvas.height,
        );
    }, []);

    // Main animation loop — runs once, reads params via ref
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            particlesRef.current = makeParticles(
                paramsRef.current.count,
                canvas.width,
                canvas.height,
            );
        };
        resize();
        window.addEventListener('resize', resize);

        let time = 0;

        const tick = () => {
            const { speed, fieldScale, fieldStrength, pixelSize, opacity, trailFade } =
                paramsRef.current;
            const { width, height } = canvas;

            // Paint a semi-transparent overlay instead of clearing — this creates trails
            ctx.fillStyle = `rgba(8, 6, 18, ${trailFade})`;
            ctx.fillRect(0, 0, width, height);

            time += 0.005 * speed;

            ctx.globalAlpha = opacity;
            for (const p of particlesRef.current) {
                // Flow field: combine two sine waves at different frequencies
                // to produce an organic, non-repeating swirl direction
                const angle =
                    (Math.sin(p.x * fieldScale + time) +
                        Math.cos(p.y * fieldScale + time * 0.71)) *
                    Math.PI;

                p.x += Math.cos(angle) * speed * fieldStrength;
                p.y += Math.sin(angle) * speed * fieldStrength;

                // Wrap around edges so particles never disappear
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
            window.removeEventListener('resize', resize);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, []);

    // Re-seed when count changes (other params update live via ref)
    const prevCount = useRef(params.count);
    useEffect(() => {
        if (params.count === prevCount.current) return;
        prevCount.current = params.count;
        const canvas = canvasRef.current;
        if (!canvas) return;
        particlesRef.current = makeParticles(params.count, canvas.width, canvas.height);
    }, [params.count]);

    const controls = [
        {
            key: 'count',
            label: 'Particle count',
            desc: 'Number of pixels in the field. More = denser, heavier on CPU.',
            min: 100,
            max: 3000,
            step: 100,
        },
        {
            key: 'speed',
            label: 'Speed',
            desc: 'Overall drift velocity. Low = lazy float, high = restless swarm.',
            min: 0.1,
            max: 3,
            step: 0.1,
        },
        {
            key: 'fieldScale',
            label: 'Field scale',
            desc: 'Zoom of the swirl pattern. Low = wide lazy curves, high = tight chaotic turbulence.',
            min: 0.0005,
            max: 0.01,
            step: 0.0005,
        },
        {
            key: 'fieldStrength',
            label: 'Field strength',
            desc: 'How hard the swirl pushes each pixel per frame.',
            min: 0.2,
            max: 3,
            step: 0.1,
        },
        {
            key: 'pixelSize',
            label: 'Pixel size',
            desc: 'Width and height of each square pixel in screen pixels.',
            min: 1,
            max: 8,
            step: 1,
        },
        {
            key: 'opacity',
            label: 'Opacity',
            desc: 'Alpha of each pixel as drawn. Low = ghostly, high = vivid.',
            min: 0.05,
            max: 1,
            step: 0.05,
        },
        {
            key: 'trailFade',
            label: 'Trail fade',
            desc: 'How fast old positions vanish. Low = long smoky trails, high = clean crisp motion.',
            min: 0.01,
            max: 0.6,
            step: 0.01,
        },
    ];

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
            <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />

            {/* Debug panel — remove when integrating for real */}
            <div
                style={{
                    position: 'fixed',
                    top: 16,
                    right: 16,
                    background: 'rgba(0, 0, 0, 0.88)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderLeft: '3px solid #00f0ff',
                    borderRadius: 8,
                    padding: '14px 18px',
                    color: 'white',
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: 9,
                    width: 300,
                    zIndex: 10000,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                    maxHeight: 'calc(100vh - 32px)',
                    overflowY: 'auto',
                }}
            >
                <div style={{ color: '#00f0ff', letterSpacing: 1 }}>PIXEL BG DEBUG</div>

                {controls.map(({ key, label, desc, min, max, step }) => (
                    <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
                                color: 'rgba(255,255,255,0.38)',
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

                <button
                    onClick={reseed}
                    style={{
                        marginTop: 4,
                        padding: '8px 0',
                        background: 'rgba(155, 92, 255, 0.15)',
                        border: '1px solid rgba(155, 92, 255, 0.4)',
                        borderRadius: 4,
                        color: '#9b5cff',
                        cursor: 'pointer',
                        fontFamily: "'Press Start 2P', monospace",
                        fontSize: 9,
                        letterSpacing: 0.5,
                    }}
                >
                    RESEED
                </button>
            </div>
        </div>
    );
}
