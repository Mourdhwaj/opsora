# Plan 001 — Button Press Feedback

## Finding

**Severity**: HIGH  
**Category**: Purpose & Frequency + Physicality & Origin  
**Location**: `apps/mobile/src/components/Button.tsx:15-26`  
**Current Code**:
```tsx
<TouchableOpacity
  style={[styles.base, styles[variant], (disabled || loading) && styles.disabled, style]}
  onPress={onPress}
  disabled={disabled || loading}
>
```
**Problem**: Buttons have zero press feedback. Only `disabled: opacity: 0.5` exists. No `activeOpacity`, no scale spring, no haptic. Every tap in the app (forms, nav, actions) feels dead.

**Frequency**: Tens of times per day — every form submit, navigation, modal action, check-in step.

**Purpose**: Feedback — confirm the interface heard the user.

---

## Target Spec

| Property | Value | Source |
|----------|-------|--------|
| Press-in scale | `0.97` | AUDIT.md §3: "Press feedback: transform: scale(0.97)" |
| Press-out scale | `1.0` (spring back) | AUDIT.md §3 |
| Duration | 150ms | AUDIT.md §2: "Button press feedback: 100–160ms" |
| Easing | `ease-out` / spring `damping: 1.0, response: 0.15` | AUDIT.md §2, §4: "critically damped default" |
| `activeOpacity` | `0.85` | Subtle, not flashy |
| Haptic | Light impact on press-in | Apple HIG / expo-haptics available |

**Reduced Motion**: Disable scale, keep `activeOpacity: 0.9` only.

---

## Implementation Steps

### 1. Add Reanimated 2+ worklet for spring scale
```tsx
// In Button.tsx, add imports
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import * as Haptics from 'expo-haptics';
```

### 2. Create press scale shared value
```tsx
const pressScale = useSharedValue(1);
const reducedMotion = useReducedMotion();

const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: pressScale.value }],
}));
```

### 3. Wrap TouchableOpacity with Animated.View
```tsx
<Animated.View style={animatedStyle}>
  <TouchableOpacity
    style={[styles.base, styles[variant], (disabled || loading) && styles.disabled, style]}
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={reducedMotion ? 0.9 : 0.85}
    onPressIn={() => {
      if (!reducedMotion) {
        pressScale.value = withSpring(0.97, { damping: 1, stiffness: 1000 });
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }}
    onPressOut={() => {
      if (!reducedMotion) {
        pressScale.value = withSpring(1, { damping: 1, stiffness: 1000 });
      }
    }}
  >
    {children}
  </TouchableOpacity>
</Animated.View>
```

### 4. Add `useReducedMotion` hook (new file: `apps/mobile/src/hooks/useReducedMotion.ts`)
```tsx
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => listener.remove();
  }, []);
  return reduce;
}
```

### 5. Update ButtonProps to forward press handlers
```tsx
interface ButtonProps extends TouchableOpacityProps {
  // ...existing
  onPressIn?: () => void;
  onPressOut?: () => void;
}
```

---

## Files to Modify

1. `apps/mobile/src/components/Button.tsx` — main implementation
2. `apps/mobile/src/hooks/useReducedMotion.ts` — new hook (create)

---

## Scope Boundaries

- **Do not** change Button variants, colors, or layout.
- **Do not** add animation to `loading` spinner (keep existing).
- **Only** press-in/out scale + haptic + activeOpacity.

---

## Verification

1. **Unit**: Button renders, pressScale shared value exists.
2. **Feel-check (device)**:
   - Tap button → immediate scale to 0.97, light haptic, spring back to 1.0 in ~150ms.
   - Enable "Reduce Motion" in Settings → scale disabled, opacity 0.9 only.
   - Rapid taps → no spring queue buildup (interruptible).
3. **Regression**: All existing Button usages still work (no prop breaking changes).

---

## Dependencies

- None. Standalone.

---

## Effort Estimate

- **Time**: ~30 min
- **Risk**: Low — isolated component, well-tested pattern
