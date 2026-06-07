import { LinearGradient } from "expo-linear-gradient";
import { Play, type LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { appTheme, withAlpha } from "../theme/appTheme";

type QuizCardProps = {
  Icon: LucideIcon;
  color: string;
  description: string;
  meta: string;
  onPress: () => void | Promise<void>;
  title: string;
  variant?: "plain" | "gradient";
};

export function QuizCard({
  Icon,
  color,
  description,
  meta,
  onPress,
  title,
  variant = "plain",
}: QuizCardProps) {
  const content = (
    <>
      <View
        style={[
          styles.icon,
          { backgroundColor: withAlpha(color, 0.16) },
          variant === "gradient" && styles.iconInverted,
        ]}
      >
        <Icon
          color={variant === "gradient" ? appTheme.color.ink : color}
          size={23}
          strokeWidth={2.35}
        />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.meta, variant === "gradient" && styles.metaInverted]}>{meta}</Text>
        <Text style={[styles.title, variant === "gradient" && styles.titleInverted]}>
          {title}
        </Text>
        <Text style={[styles.description, variant === "gradient" && styles.descriptionInverted]}>
          {description}
        </Text>
      </View>
      <View style={[styles.play, variant === "gradient" && styles.playInverted]}>
        <Play
          color={variant === "gradient" ? appTheme.color.ink : "#ffffff"}
          fill={variant === "gradient" ? appTheme.color.ink : "#ffffff"}
          size={15}
          strokeWidth={2.4}
        />
      </View>
    </>
  );

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => void onPress()}
      style={({ pressed }) => [styles.shell, pressed && styles.pressed]}
    >
      {variant === "gradient" ? (
        <LinearGradient
          colors={appTheme.gradient.quiz}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.gradient}
        >
          {content}
        </LinearGradient>
      ) : (
        <View style={styles.card}>{content}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: appTheme.color.card,
    borderColor: appTheme.color.border,
    borderRadius: appTheme.radius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 104,
    padding: 14,
    ...appTheme.shadow.card,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  description: {
    color: appTheme.color.muted,
    fontSize: 13,
    fontWeight: appTheme.weight.medium,
    lineHeight: 18,
    marginTop: 4,
  },
  descriptionInverted: {
    color: "rgba(255,255,255,0.82)",
  },
  gradient: {
    alignItems: "center",
    borderRadius: appTheme.radius.card,
    flexDirection: "row",
    gap: 12,
    minHeight: 116,
    overflow: "hidden",
    padding: 15,
    ...appTheme.shadow.card,
  },
  icon: {
    alignItems: "center",
    borderRadius: 18,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  iconInverted: {
    backgroundColor: "rgba(255,255,255,0.90)",
  },
  meta: {
    color: appTheme.color.muted,
    fontSize: 11,
    fontWeight: appTheme.weight.bold,
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  metaInverted: {
    color: "rgba(255,255,255,0.72)",
  },
  play: {
    alignItems: "center",
    backgroundColor: appTheme.color.ink,
    borderRadius: appTheme.radius.pill,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  playInverted: {
    backgroundColor: "rgba(255,255,255,0.86)",
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
  shell: {
    borderRadius: appTheme.radius.card,
  },
  title: {
    color: appTheme.color.ink,
    fontSize: 18,
    fontWeight: appTheme.weight.bold,
    lineHeight: 22,
    marginTop: 3,
  },
  titleInverted: {
    color: "#ffffff",
  },
});
