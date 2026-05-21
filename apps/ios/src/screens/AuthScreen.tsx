import { LinearGradient } from "expo-linear-gradient";
import { AtSign, Lock, UserRound } from "lucide-react-native";
import { type ReactNode, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { VeloraButton } from "../components/VeloraButton";
import { useAuth } from "../context/AuthContext";
import { getUsernameValidationMessage, normalizeUsername } from "../lib/slug";
import { colors } from "../theme/colors";

export function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLogin = mode === "login";
  const normalizedUsername = useMemo(() => normalizeUsername(username), [username]);

  async function submit() {
    setError(null);

    if (!isLogin) {
      const usernameError = getUsernameValidationMessage(normalizedUsername);

      if (usernameError) {
        setError(usernameError);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password, normalizedUsername);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Action impossible pour le moment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <LinearGradient colors={["#07111f", "#132338", "#050812"]} start={{ x: 0.15, y: 0 }} end={{ x: 1, y: 1 }} style={styles.root}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 26 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Compte Velora</Text>
            <Text style={styles.title}>{isLogin ? "Reprendre ta découverte" : "Créer ton accès"}</Text>
            <Text style={styles.copy}>
              {isLogin
                ? "Connecte-toi pour retrouver tes lectures, tes sauvegardes et ta progression."
                : "Choisis un pseudo et garde ta progression synchronisée dès le premier fait."}
            </Text>
          </View>

          <View style={styles.fields}>
            {!isLogin ? (
              <Field icon={<UserRound color="rgba(248,250,252,0.54)" size={19} strokeWidth={2.2} />}>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="username"
                  onChangeText={setUsername}
                  placeholder="Pseudo"
                  placeholderTextColor="rgba(248,250,252,0.42)"
                  style={styles.input}
                  textContentType="username"
                  value={username}
                />
              </Field>
            ) : null}

            <Field icon={<AtSign color="rgba(248,250,252,0.54)" size={19} strokeWidth={2.2} />}>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="rgba(248,250,252,0.42)"
                style={styles.input}
                textContentType="emailAddress"
                value={email}
              />
            </Field>

            <Field icon={<Lock color="rgba(248,250,252,0.54)" size={19} strokeWidth={2.2} />}>
              <TextInput
                autoCapitalize="none"
                onChangeText={setPassword}
                placeholder="Mot de passe"
                placeholderTextColor="rgba(248,250,252,0.42)"
                secureTextEntry
                style={styles.input}
                textContentType={isLogin ? "password" : "newPassword"}
                value={password}
              />
            </Field>

            {!isLogin && normalizedUsername ? (
              <Text style={styles.normalized}>Pseudo enregistré : {normalizedUsername}</Text>
            ) : null}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <VeloraButton disabled={!email || password.length < 6 || (!isLogin && !username)} isLoading={isSubmitting} onPress={submit}>
              {isLogin ? "Se connecter" : "Créer le compte"}
            </VeloraButton>
            <VeloraButton
              onPress={() => {
                setError(null);
                setMode(isLogin ? "register" : "login");
              }}
              variant="ghost"
            >
              {isLogin ? "Créer un compte" : "J'ai déjà un compte"}
            </VeloraButton>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function Field({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return (
    <View style={styles.field}>
      {icon}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 10,
    marginTop: 8,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: 34,
    paddingHorizontal: 22,
  },
  copy: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 16,
  },
  error: {
    backgroundColor: "rgba(255,122,144,0.10)",
    borderColor: "rgba(255,122,144,0.20)",
    borderRadius: 16,
    borderWidth: 1,
    color: "#ffd7de",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
    marginTop: 16,
    padding: 13,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  field: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.075)",
    borderColor: "rgba(255,255,255,0.13)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 11,
    minHeight: 58,
    paddingHorizontal: 15,
  },
  fields: {
    gap: 13,
    marginTop: 34,
  },
  glowBottom: {
    backgroundColor: "rgba(106,227,192,0.12)",
    borderRadius: 999,
    bottom: -120,
    height: 260,
    left: -90,
    position: "absolute",
    width: 260,
  },
  glowTop: {
    backgroundColor: "rgba(255,209,102,0.18)",
    borderRadius: 999,
    height: 280,
    position: "absolute",
    right: -110,
    top: -80,
    width: 280,
  },
  header: {
    marginTop: "auto",
  },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    minHeight: 54,
  },
  keyboard: {
    flex: 1,
  },
  normalized: {
    color: "rgba(248,250,252,0.48)",
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 3,
  },
  root: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 42,
    marginTop: 9,
  },
});
