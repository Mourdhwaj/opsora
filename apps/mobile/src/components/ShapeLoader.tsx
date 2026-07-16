import { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Polygon, Rect, Circle } from 'react-native-svg';

const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ShapeLoaderProps {
  size?: number;
  color?: string;
  dotColor?: string;
  duration?: number;
  shape?: 'triangle' | 'square' | 'circle';
}

export function ShapeLoader({
  size = 44,
  color = '#2f3545',
  dotColor = '#5628ee',
  duration = 3000,
  shape = 'square',
}: ShapeLoaderProps) {
  const dashOffset = useRef(new Animated.Value(0)).current;
  const dotX = useRef(new Animated.Value(0)).current;
  const dotY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.timing(dashOffset, {
          toValue: 256,
          duration,
          easing: Easing.bezier(0.785, 0.135, 0.15, 0.86),
          useNativeDriver: false,
        }),
        Animated.timing(dotX, {
          toValue: 1,
          duration,
          easing: Easing.bezier(0.785, 0.135, 0.15, 0.86),
          useNativeDriver: false,
        }),
        Animated.timing(dotY, {
          toValue: 1,
          duration,
          easing: Easing.bezier(0.785, 0.135, 0.15, 0.86),
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [duration]);

  const svgSize = size;
  const strokeWidth = 10;
  const center = svgSize / 2;

  const getShape = () => {
    switch (shape) {
      case 'triangle':
        const triH = (svgSize * Math.sqrt(3)) / 2;
        const triPoints = `${center},${(svgSize - triH) / 2} ${center - svgSize / 2},${(svgSize + triH) / 2} ${center + svgSize / 2},${(svgSize + triH) / 2}`;
        return (
          <AnimatedPolygon
            points={triPoints}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray="145 76 145 76"
            strokeDashoffset={dashOffset}
          />
        );
      case 'circle':
        const radius = (svgSize - strokeWidth) / 2;
        return (
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray="150 50 150 50"
            strokeDashoffset={dashOffset}
          />
        );
      default:
        const rectSize = svgSize - strokeWidth * 2;
        return (
          <AnimatedRect
            x={strokeWidth}
            y={strokeWidth}
            width={rectSize}
            height={rectSize}
            rx={4}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray="192 64 192 64"
            strokeDashoffset={dashOffset}
          />
        );
    }
  };

  const dotTranslateX = dotX.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, 18, 0, -18, -18],
  });

  const dotTranslateY = dotY.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, -18, -36, -36, -18],
  });

  return (
    <View style={[styles.container, { width: svgSize, height: svgSize }]}>
      <Svg width={svgSize} height={svgSize}>
        {getShape()}
      </Svg>
      <Animated.View
        style={[
          styles.dot,
          {
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: dotColor,
            transform: [{ translateX: dotTranslateX }, { translateY: dotTranslateY }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    marginLeft: -3,
  },
});
