# How to View the Showcase

The showcase components are **completely isolated** from your main app. Here are your options to view them:

## Option 1: Temporary Route (Recommended)

Add a temporary showcase route to your `App.js`:

```javascript
// At the top of App.js, add:
import ShowcasePage from './showcase/ShowcasePage';

// Inside your component (before the return statement), add:
const [showShowcase, setShowShowcase] = React.useState(false);

// Add this somewhere in your JSX (maybe near the theme toggle):
{showShowcase && <ShowcasePage />}
{!showShowcase && (
  <button 
    onClick={() => setShowShowcase(true)}
    style={{ 
      position: 'fixed', 
      bottom: '20px', 
      right: '20px',
      padding: '10px 20px',
      background: 'var(--neon-purple)',
      color: 'white',
      border: '2px solid var(--neon-purple)',
      cursor: 'pointer',
      fontFamily: "'Press Start 2P', cursive",
      fontSize: '10px',
      zIndex: 1000
    }}
  >
    VIEW SHOWCASE
  </button>
)}
```

## Option 2: Direct Import in Development

Create a temporary file `client/src/ShowcaseTest.js`:

```javascript
import React from 'react';
import { ShowcasePage } from './showcase';

function ShowcaseTest() {
  return <ShowcasePage />;
}

export default ShowcaseTest;
```

Then in `index.js`, temporarily replace:
```javascript
// import App from './App';
import App from './ShowcaseTest';
```

**Remember to revert this before committing!**

## Option 3: Individual Component Testing

Test individual components in your existing UI:

```javascript
import { PixelButton, GlitchText, PowerUpEffect } from './showcase';

// In your component:
<GlitchText continuous>MY QUEST BOARD</GlitchText>

<PixelButton 
  variant="primary" 
  onClick={() => console.log('clicked')}
>
  START QUEST
</PixelButton>

<PowerUpEffect 
  active={questCompleted} 
  position={{ x: 100, y: 100 }}
/>
```

## Available Components

### 🎮 Interactive Elements
- **PixelButton** - Retro button with press effects
- **ArcadeModal** - Modal with arcade cabinet styling

### ✨ Visual Effects
- **PowerUpEffect** - Particle burst animation
- **LevelUpAnimation** - Full-screen celebration
- **CRTOverlay** - Scanline/CRT screen effect
- **GlitchText** - Glitching text effect

### 📊 UI Components
- **HealthBar** - Multiple progress bar styles
- **RetroLoadingSpinner** - 8-bit loading animations

## Cleanup

When you're done exploring:
1. Remove any showcase imports from App.js or index.js
2. Delete test files you created
3. The showcase folder stays for future reference

## Integration Tips

- All components use your existing CSS variables (--neon-cyan, --accent-pink, etc.)
- They respect `prefers-reduced-motion` for accessibility
- Copy component code and modify to fit your needs
- Use animations in your quest board for completion celebrations
- Add arcade modals for confirmations/notifications

## Sound Effects Note

Components have sound effect hooks but don't implement audio. When ready:
1. Use Web Audio API
2. Preload short sound files (<50kb each)
3. Play on button clicks, quest completions, etc.

Reference: `inspiration.html` has a complete sound system example!
