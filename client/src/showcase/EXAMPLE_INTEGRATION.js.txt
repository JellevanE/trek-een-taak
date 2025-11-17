/**
 * EXAMPLE: How to temporarily add the showcase to your App.js
 * 
 * This is just an example - copy the relevant parts you need!
 */

// 1. Add this import at the top of App.js:
import QuickDemo from './showcase/QuickDemo';

// 2. Add this state hook inside your App component:
const [showShowcase, setShowShowcase] = React.useState(false);

// 3. Add this button somewhere in your JSX (maybe near the theme toggle):
<motion.button
    onClick={() => setShowShowcase(true)}
    style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '12px 20px',
        background: 'var(--neon-purple)',
        color: 'white',
        border: '2px solid var(--neon-purple)',
        cursor: 'pointer',
        fontFamily: "'Press Start 2P', cursive",
        fontSize: '10px',
        zIndex: 1000,
        boxShadow: '0 0 20px rgba(148, 0, 211, 0.5)'
    }}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
>
    🎮 SHOWCASE
</motion.button>

// 4. Add this at the end of your JSX (before closing </div>):
{showShowcase && <QuickDemo onClose={() => setShowShowcase(false)} />}

// That's it! Click the button to see the demo.
// Remove these 4 changes when you're done exploring.

/*
 * ALTERNATIVE: View full showcase page instead
 * 
 * If you want to see ALL components at once:
 */

// Import the full showcase:
import ShowcasePage from './showcase/ShowcasePage';

// Replace the QuickDemo render with:
{showShowcase && (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000 }}>
        <ShowcasePage />
        <button
            onClick={() => setShowShowcase(false)}
            style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                padding: '12px 20px',
                background: 'var(--neon-red)',
                color: 'white',
                border: '2px solid var(--neon-red)',
                cursor: 'pointer',
                fontFamily: "'Press Start 2P', cursive",
                fontSize: '10px',
                zIndex: 10001
            }}
        >
            ✕ CLOSE
        </button>
    </div>
)}

/*
 * INTEGRATION EXAMPLES:
 * 
 * Once you've explored and want to use specific components:
 */

// Import only what you need:
import { PixelButton, GlitchText, PowerUpEffect, HealthBar } from './showcase';

// Use in your quest board:

// 1. Glitching title:
<h1>
    <GlitchText continuous color="var(--neon-cyan)">
        [ QUEST BOARD ]
    </GlitchText>
</h1>

// 2. Retro buttons:
<PixelButton 
    variant="primary" 
    onClick={addTask}
>
    START QUEST
</PixelButton>

// 3. Quest completion effect:
const [showEffect, setShowEffect] = useState(false);
const [effectPos, setEffectPos] = useState({ x: 0, y: 0 });

const handleComplete = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setEffectPos({ x: rect.left + rect.width/2, y: rect.top + rect.height/2 });
    setShowEffect(true);
    setTimeout(() => setShowEffect(false), 1500);
};

<PowerUpEffect active={showEffect} position={effectPos} />

// 4. Progress bars:
<HealthBar 
    current={completedCount} 
    max={totalCount}
    label="Quest Progress"
    style="neon"
    color="cyan"
/>

/*
 * Remember to remove showcase imports from production builds!
 * Keep the showcase folder for future reference.
 */
