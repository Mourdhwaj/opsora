# Mobile App Agent Rules

## Stack

React Native 0.81 + Expo 54. TypeScript strict. Path aliases are NOT used — all imports are relative (`../lib/theme`).

## Commands

- `cd apps/mobile && npm run dev` — start Expo dev server
- `npx tsc --noEmit` — type check (no test runner configured)
- `npx expo export --platform web` — web export (useful for quick build verification)

## Animation Rules

All motion uses React Native's built-in `Animated` API from `react-native`. Never import from `react-native-reanimated` — the native TurboModule is not properly linked.

### Core patterns

- **Animated.Value** — `useRef(new Animated.Value(x))` for all animated state
- **Springs** — `Animated.spring(value, { toValue, damping, stiffness, useNativeDriver: true })`
  - Press feedback: `{ damping: 10, stiffness: 1000 }` (snappy)
  - Momentum/drag: `{ damping: 0.8 * 20, stiffness: 65 }` (looser)
  - Bounce/celebration: `{ damping: 6, stiffness: 400 }` (playful)
- **Timing** — `Animated.timing` for opacity/translate transitions (150-400ms)
- **Stagger** — `Animated.delay(index * 60)` or pass delay to `Animated.timing`
- **useNativeDriver: true** — always set for transforms and opacity (not for layout props like width/height/backgroundColor)
- **Interpolation** — `animatedValue.interpolate({ inputRange, outputRange })` for derived values

### Accessibility

- The `useReducedMotion` hook is defined at `src/hooks/useReducedMotion.ts` but is NOT used in components (RN Animated doesn't have easy reduced-motion support without Reanimated)
- For critical accessibility, check `AccessibilityInfo.isReduceMotionEnabled()` at mount time

### PanResponder (for drag gestures)

- Use `PanResponder.create()` from `react-native` for drag-based interactions
- Track start position in `onPanResponderGrant`, update `Animated.Value` in `onPanResponderMove`
- GestureHandler `Gesture.Pan()` requires Reanimated's `GestureDetector` — avoid it

### Imports

```typescript
import { Animated, PanResponder, StyleSheet } from 'react-native';
```

## Existing animated components

| Component | File | Animation |
|-----------|------|-----------|
| Button | `src/components/Button.tsx` | Press scale 0.97 spring |
| Input | `src/components/Input.tsx` | Focus/blur border + shadow via interpolation |
| BottomSheet | `src/components/BottomSheet.tsx` | PanResponder drag + spring dismiss |
| AnimatedCard | `src/components/AnimatedCard.tsx` | Stagger entrance + exit (translateY + fade) |
| Badge/StatusBadge | `src/components/Badge.tsx` | Success pulse (scale spring) |
| FilterChips | `src/components/FilterChips.tsx` | Press scale 0.95 |
| LoadMoreButton | `src/components/LoadMoreButton.tsx` | Press scale 0.97 |
| AnimatedListItem | `src/components/AnimatedListItem.tsx` | Stagger entrance (opacity + translateY) |
| CollapsibleSection | `src/components/checkin/CollapsibleSection.tsx` | Height expand/collapse + chevron rotate |
| BedSquare | `src/components/checkin/BedSquare.tsx` | Status transition + press + multiply scale |
| ResidentChipBar | `src/components/checkin/ResidentChipBar.tsx` | Press scale 0.93 |
| Check-in steps | `app/(details)/check-in.tsx` | Step indicator scale spring |

## Anti-patterns to avoid

- `import ... from 'react-native-reanimated'` — native module not linked, causes TurboModule crash
- `useSharedValue` / `useAnimatedStyle` — Reanimated hooks, not available
- `setTimeout` for animation sequencing (use `Animated.delay` or `.start()` callback)
- `LayoutAnimation` for list inserts (use `AnimatedListItem` or manual stagger)
- Linear easing anywhere
- `useNativeDriver: false` for transforms (causes jank on Android)
