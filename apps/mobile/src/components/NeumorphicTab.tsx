import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { useRef, useEffect } from 'react';
import { theme } from '../lib/theme';

interface TabOption {
  label: string;
  value: string;
}

interface NeumorphicTabProps {
  options: TabOption[];
  selected: string;
  onSelect: (value: string) => void;
}

export function NeumorphicTab({ options, selected, onSelect }: NeumorphicTabProps) {
  const animations = useRef(options.map(() => new Animated.Value(0))).current;
  const particleAnims = useRef(options.map(() => ({
    scale: new Animated.Value(0),
    opacity: new Animated.Value(0),
  }))).current;

  useEffect(() => {
    options.forEach((opt, index) => {
      const isSelected = opt.value === selected;
      Animated.parallel([
        Animated.timing(animations[index], {
          toValue: isSelected ? 1 : 0,
          duration: 200,
          useNativeDriver: false,
        }),
        isSelected ? Animated.sequence([
          Animated.delay(50),
          Animated.parallel([
            Animated.spring(particleAnims[index].scale, {
              toValue: 1,
              friction: 4,
              useNativeDriver: true,
            }),
            Animated.timing(particleAnims[index].opacity, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(particleAnims[index].scale, {
              toValue: 0,
              duration: 400,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(particleAnims[index].opacity, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        ]) : null,
      ].filter(Boolean) as Animated.CompositeAnimation[]).start();
    });
  }, [selected]);

  return (
    <View style={styles.container}>
      {options.map((option, index) => {
        const isSelected = option.value === selected;
        const bg = animations[index].interpolate({
          inputRange: [0, 1],
          outputRange: [theme.colors.surface, theme.colors.primary],
        });
        const textColor = animations[index].interpolate({
          inputRange: [0, 1],
          outputRange: [theme.colors.text, '#FFFFFF'],
        });
        const shadowIntensity = animations[index].interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0],
        });

        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => onSelect(option.value)}
            activeOpacity={0.8}
          >
            <Animated.View
              style={[
                styles.tab,
                {
                  backgroundColor: bg,
                  shadowOpacity: shadowIntensity,
                },
                isSelected && styles.tabSelected,
              ]}
            >
              <Animated.Text
                style={[
                  styles.tabText,
                  { color: textColor },
                  isSelected && styles.tabTextSelected,
                ]}
              >
                {option.label}
              </Animated.Text>

              {/* Particle effect */}
              <Animated.View
                style={[
                  styles.particle,
                  styles.particleTop,
                  {
                    transform: [{ scale: particleAnims[index].scale }],
                    opacity: particleAnims[index].opacity,
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.particle,
                  styles.particleBottom,
                  {
                    transform: [{ scale: particleAnims[index].scale }],
                    opacity: particleAnims[index].opacity,
                  },
                ]}
              />
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowRadius: 6,
    position: 'relative',
    overflow: 'visible',
  },
  tabSelected: {
    shadowColor: theme.colors.primary,
    shadowOffset: { width: -2, height: -2 },
    shadowRadius: 4,
  },
  tabText: {
    fontSize: 13,
    fontFamily: theme.font.semiBold,
    color: theme.colors.text,
  },
  tabTextSelected: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  particleTop: {
    top: -8,
    left: '50%',
    marginLeft: -3,
  },
  particleBottom: {
    bottom: -8,
    left: '50%',
    marginLeft: -3,
  },
});
