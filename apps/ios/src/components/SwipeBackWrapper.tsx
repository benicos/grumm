import { type ReactNode, useMemo } from "react";
import {
  PanResponder,
  type StyleProp,
  View,
  type ViewStyle,
} from "react-native";

const MIN_HORIZONTAL_DISTANCE = 84;
const MIN_HORIZONTAL_VELOCITY = 0.55;
const MIN_CAPTURE_DISTANCE = 22;
const MAX_VERTICAL_DRIFT = 72;
const HORIZONTAL_PRIORITY_RATIO = 1.45;

type SwipeBackWrapperProps = {
  children: ReactNode;
  enabled: boolean;
  onSwipeBack: () => void;
  style?: StyleProp<ViewStyle>;
};

export function SwipeBackWrapper({
  children,
  enabled,
  onSwipeBack,
  style,
}: SwipeBackWrapperProps) {
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) => {
          if (!enabled || gesture.dx <= MIN_CAPTURE_DISTANCE) {
            return false;
          }

          const absDx = Math.abs(gesture.dx);
          const absDy = Math.abs(gesture.dy);

          return (
            absDy <= MAX_VERTICAL_DRIFT &&
            absDx > absDy * HORIZONTAL_PRIORITY_RATIO
          );
        },
        onPanResponderRelease: (_event, gesture) => {
          if (!enabled || gesture.dx <= 0) {
            return;
          }

          const absDy = Math.abs(gesture.dy);
          const hasEnoughDistance = gesture.dx >= MIN_HORIZONTAL_DISTANCE;
          const hasEnoughVelocity =
            gesture.dx >= MIN_CAPTURE_DISTANCE * 2 &&
            gesture.vx >= MIN_HORIZONTAL_VELOCITY;

          if (
            absDy <= MAX_VERTICAL_DRIFT &&
            gesture.dx > absDy * HORIZONTAL_PRIORITY_RATIO &&
            (hasEnoughDistance || hasEnoughVelocity)
          ) {
            onSwipeBack();
          }
        },
        onPanResponderTerminationRequest: () => true,
        onStartShouldSetPanResponder: () => false,
      }),
    [enabled, onSwipeBack],
  );

  return (
    <View {...panResponder.panHandlers} style={style}>
      {children}
    </View>
  );
}
