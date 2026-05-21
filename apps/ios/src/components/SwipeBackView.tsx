import { type ReactNode, useMemo } from "react";
import { PanResponder, View, type ViewStyle } from "react-native";

type SwipeBackViewProps = {
  children: ReactNode;
  onBack: () => void;
  style?: ViewStyle;
};

export function SwipeBackView({ children, onBack, style }: SwipeBackViewProps) {
  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dx > 18 && Math.abs(gesture.dy) < 18,
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > 74 && Math.abs(gesture.dy) < 52) {
            onBack();
          }
        },
      }),
    [onBack],
  );

  return (
    <View style={style} {...responder.panHandlers}>
      {children}
    </View>
  );
}
