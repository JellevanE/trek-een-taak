# 🎮 Showcase Component Reference Card

Quick reference for all available components and their props.

## Components

### PixelButton
Retro arcade button with press animation.

```jsx
<PixelButton
  variant="primary"     // 'primary' | 'danger' | 'success'
  size="medium"         // 'small' | 'medium' | 'large'
  onClick={handleClick}
  disabled={false}
  soundEnabled={false}
>
  CLICK ME
</PixelButton>
```

### GlitchText
Text with arcade-style glitch effect.

```jsx
<GlitchText
  continuous={false}           // Auto-glitch every 3 seconds
  glitchOnHover={true}         // Glitch on mouse hover
  color="var(--neon-cyan)"     // Any CSS color
>
  QUEST BOARD
</GlitchText>
```

### PowerUpEffect
Particle burst animation for celebrations.

```jsx
<PowerUpEffect
  active={showEffect}          // Trigger the effect
  position={{ x: 100, y: 100 }} // Screen coordinates
  particleCount={12}           // Number of particles
  particleSymbol="✨"          // Emoji or character
  duration={1.5}               // Animation duration (seconds)
/>
```

### LevelUpAnimation
Full-screen level-up celebration.

```jsx
<LevelUpAnimation
  active={showLevelUp}
  level={5}                    // Display level number
  onComplete={() => {}}        // Callback when animation finishes
/>
```

### CRTOverlay
Scanline/CRT screen effect overlay.

```jsx
<CRTOverlay
  enabled={true}
  intensity="medium"           // 'low' | 'medium' | 'high'
/>
```

### HealthBar
Retro-style progress/health bar.

```jsx
<HealthBar
  current={50}
  max={100}
  label="Quest Progress"
  showPercentage={true}
  style="neon"                 // 'neon' | 'pixel' | 'gradient' | 'classic'
  height={32}                  // Height in pixels
  animated={true}
  emoji={null}                 // Auto-selects based on progress
  color="green"                // 'green' | 'red' | 'cyan' | 'yellow' | 'purple'
/>
```

### RetroLoadingSpinner
8-bit style loading animation.

```jsx
<RetroLoadingSpinner
  type="squares"               // 'squares' | 'dots' | 'bars' | 'spinner'
  color="var(--neon-cyan)"
  size="medium"                // 'small' | 'medium' | 'large'
/>
```

### ArcadeModal
Modal dialog with arcade styling.

```jsx
<ArcadeModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="NOTIFICATION"
  showCorners={true}
  borderColor="var(--neon-cyan)"
>
  <p>Your modal content here</p>
</ArcadeModal>
```

### RetroInput
Retro-styled text input with glow effects.

```jsx
<RetroInput
  value={inputValue}
  onChange={(e) => setInputValue(e.target.value)}
  placeholder="Enter quest name..."
  type="text"                  // 'text' | 'password'
  glowColor="var(--neon-cyan)"
  maxLength={100}
  onEnter={() => handleSubmit()}
  autoFocus={false}
/>
```

### RetroTextArea
Multi-line text input variant.

```jsx
<RetroTextArea
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  placeholder="Enter description..."
  glowColor="var(--neon-green)"
  rows={4}
  maxLength={500}
/>
```

### RetroSelect
Arcade-style dropdown select.

```jsx
<RetroSelect
  value={priority}
  onChange={(e) => setPriority(e.target.value)}
  options={[
    { value: 'low', label: '⬇️ LOW' },
    { value: 'high', label: '⬆️ HIGH' }
  ]}
  placeholder="Select priority..."
  glowColor="var(--neon-cyan)"
  size="medium"                // 'small' | 'medium' | 'large'
/>
```

### CounterBadge
Animated counter badge.

```jsx
<CounterBadge
  count={12}
  color="var(--neon-cyan)"
  size="medium"                // 'small' | 'medium' | 'large'
  animated={true}
  maxDisplay={99}              // Shows "99+" for higher values
  pulseOnChange={true}
/>
```

### StatCounter
Full stat display with label.

```jsx
<StatCounter
  label="COMPLETED"
  count={42}
  icon="✅"
  color="var(--neon-green)"
  layout="horizontal"          // 'horizontal' | 'vertical'
/>
```

### EmptyState
Retro empty state component.

```jsx
<EmptyState
  message="NO QUESTS AVAILABLE"
  icon="📭"
  subMessage="Complete current quests to unlock new ones!"
  glitchEffect={true}
  pulseEffect={false}
  color="var(--muted)"
/>
```

### LoadingState
Animated loading state.

```jsx
<LoadingState
  message="LOADING..."
  color="var(--neon-cyan)"
/>
```

### ErrorState
Error state with retry button.

```jsx
<ErrorState
  message="ERROR OCCURRED"
  errorCode="500"
  subMessage="Something went wrong. Please try again."
  onRetry={() => handleRetry()}
/>
```

### ToastContainer & useToast
Toast notification system.

```jsx
// In your component:
const toast = useToast();

// Trigger toasts:
toast.success('Quest completed!');
toast.error('Failed to save');
toast.warning('Quest expires soon');
toast.info('New quest available');

// Custom duration:
toast.success('Quick message', 1500);

// Render container:
<ToastContainer 
  toasts={toast.toasts} 
  onClose={toast.removeToast}
  position="top-right"         // 'top-right' | 'top-left' | 'bottom-right' | etc.
/>
```

## Color Variables

All components use your existing CSS variables:

- `--neon-cyan` → #00ffff (Primary accent)
- `--neon-pink` → #ff00ff (Secondary accent)
- `--neon-green` → #00ff00 (Success states)
- `--neon-red` → #ff0040 (Danger/alerts)
- `--neon-yellow` → #ffff00 (Warnings/highlights)
- `--neon-purple` → #9400d3 (Alternative accent)
- `--bg-dark` → #0a0a0f (Dark background)
- `--bg-secondary` → #1a1a2e (Card background)
- `--muted` → #888888 (Secondary text)
- `--dark-gray` → #444444 (Borders)

## Font Families

Components use these font families (already in your project):

- `'Press Start 2P', cursive` → Titles, buttons
- `'VT323', monospace` → Body text, descriptions

## Accessibility

All components:
- ✅ Respect `prefers-reduced-motion`
- ✅ Support keyboard navigation
- ✅ Include proper focus states
- ✅ Work with screen readers (when properly labeled)

## Performance Tips

- Use `React.memo()` on parent components to prevent unnecessary re-renders
- Keep `position` prop stable in PowerUpEffect (use state, not inline objects)
- Debounce state updates that trigger animations
- Limit particle counts in PowerUpEffect for slower devices

## Common Patterns

### Quest Completion
```jsx
const [celebrationActive, setCelebrationActive] = useState(false);
const [celebrationPos, setCelebrationPos] = useState({ x: 0, y: 0 });

const handleQuestComplete = (event) => {
  const rect = event.currentTarget.getBoundingClientRect();
  setCelebrationPos({
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  });
  setCelebrationActive(true);
  setTimeout(() => setCelebrationActive(false), 1500);
};

<PowerUpEffect active={celebrationActive} position={celebrationPos} />
```

### Confirmation Dialog
```jsx
const [showDeleteModal, setShowDeleteModal] = useState(false);

<ArcadeModal
  isOpen={showDeleteModal}
  onClose={() => setShowDeleteModal(false)}
  title="CONFIRM DELETE"
  borderColor="var(--neon-red)"
>
  <p>Are you sure?</p>
  <PixelButton variant="danger" onClick={handleDelete}>
    DELETE
  </PixelButton>
</ArcadeModal>
```

### Dynamic Progress
```jsx
const progress = Math.round((completed / total) * 100);

<HealthBar
  current={completed}
  max={total}
  label={`${completed} / ${total} Quests`}
  style="neon"
  color={progress < 30 ? 'red' : progress < 70 ? 'yellow' : 'green'}
/>
```

---

For more examples, see:
- **USAGE.md** - How to view the showcase
- **INTEGRATION_GUIDE.md** - Detailed integration patterns
- **EXAMPLE_INTEGRATION.js** - Code snippets
