import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../src/lib/supabase";

const colors = {
  primary: "#4F46E5",
  violet: "#7C3AED",
  background: "#F7F8FC",
  ink: "#17172B",
  muted: "#777A91",
  white: "#FFFFFF",
  border: "#E8E9F2",
  green: "#16A34A"
};

export default function HomeScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (!supabase) {
      setLoadingSession(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoadingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function submitAuth() {
    if (!supabase) {
      Alert.alert("Configuration nécessaire", "FastChat doit d’abord être relié à Supabase avec l’URL du projet et la clé publique anon.");
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      Alert.alert("Adresse e-mail", "Entre une adresse e-mail valide.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Mot de passe", "Utilise au moins 6 caractères.");
      return;
    }
    if (mode === "signup" && !displayName.trim()) {
      Alert.alert("Nom affiché", "Entre le nom que les autres pourront voir.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { display_name: displayName.trim() } }
        });
        if (error) throw error;
        if (data.session) {
          Alert.alert("Bienvenue sur FastChat", "Ton compte est créé.");
        } else {
          Alert.alert("Vérifie ta boîte e-mail", "Supabase a créé la demande de compte. Ouvre l’e-mail de confirmation si la confirmation est activée dans ton projet.");
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });
        if (error) throw error;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Une erreur inattendue est survenue.";
      Alert.alert("Impossible de continuer", message);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert("Erreur", error.message);
  }

  if (loadingSession) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Ouverture de FastChat…</Text>
      </SafeAreaView>
    );
  }

  if (session) {
    const name = String(session.user.user_metadata?.display_name || session.user.email || "Utilisateur");
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.logo}><Text style={styles.logoText}>FC</Text></View>
            <View>
              <Text style={styles.brand}>FastChat</Text>
              <Text style={styles.tagline}>Restez proches, où que vous soyez.</Text>
            </View>
          </View>
        </View>
        <View style={styles.signedIn}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text></View>
          <Text style={styles.title}>Bienvenue, {name} !</Text>
          <Text style={styles.subtitle}>Ton compte est connecté.</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Prochaine étape</Text>
            <Text style={styles.infoText}>Nous allons maintenant relier le profil, les contacts et les conversations aux tables Supabase. Les discussions ne sont pas encore actives.</Text>
          </View>
          <TouchableOpacity style={styles.secondaryButton} onPress={signOut}>
            <Text style={styles.secondaryButtonText}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brandBlock}>
            <View style={styles.logoLarge}><Text style={styles.logoText}>FC</Text></View>
            <Text style={styles.brandLarge}>FastChat</Text>
            <Text style={styles.tagline}>Restez proches, où que vous soyez.</Text>
          </View>

          {!isSupabaseConfigured && (
            <View style={styles.warning}>
              <Text style={styles.warningTitle}>Connexion à configurer</Text>
              <Text style={styles.warningText}>L’écran est prêt, mais l’URL Supabase et la clé publique anon ne sont pas encore configurées dans l’environnement de l’application.</Text>
            </View>
          )}

          <View style={styles.formCard}>
            <Text style={styles.title}>{mode === "signup" ? "Créer un compte" : "Heureux de te revoir"}</Text>
            <Text style={styles.subtitle}>{mode === "signup" ? "Rejoins FastChat gratuitement." : "Connecte-toi pour retrouver ton compte."}</Text>

            {mode === "signup" && (
              <View style={styles.field}>
                <Text style={styles.label}>Nom affiché</Text>
                <TextInput
                  accessibilityLabel="Nom affiché"
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Ex. Amina"
                  placeholderTextColor="#999BB0"
                  style={styles.input}
                  autoCapitalize="words"
                  maxLength={60}
                />
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Adresse e-mail</Text>
              <TextInput
                accessibilityLabel="Adresse e-mail"
                value={email}
                onChangeText={setEmail}
                placeholder="toi@exemple.com"
                placeholderTextColor="#999BB0"
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Mot de passe</Text>
              <TextInput
                accessibilityLabel="Mot de passe"
                value={password}
                onChangeText={setPassword}
                placeholder="6 caractères minimum"
                placeholderTextColor="#999BB0"
                style={styles.input}
                secureTextEntry
                autoCapitalize="none"
                textContentType={mode === "signup" ? "newPassword" : "password"}
              />
            </View>

            <TouchableOpacity style={[styles.primaryButton, busy && styles.buttonDisabled]} onPress={submitAuth} disabled={busy}>
              {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonText}>{mode === "signup" ? "Créer mon compte" : "Se connecter"}</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.modeButton} onPress={() => setMode(mode === "signup" ? "signin" : "signup")} disabled={busy}>
              <Text style={styles.modeText}>
                {mode === "signup" ? "Tu as déjà un compte ? Se connecter" : "Nouveau sur FastChat ? Créer un compte"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.privacyNote}>Ton mot de passe est envoyé directement au service d’authentification Supabase. Ne le partage avec personne.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, color: colors.muted, fontSize: 14 },
  header: { backgroundColor: colors.white, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  brandRow: { flexDirection: "row", alignItems: "center" },
  logo: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginRight: 12 },
  logoLarge: { width: 66, height: 66, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  logoText: { color: colors.white, fontSize: 18, fontWeight: "900", letterSpacing: -1 },
  brand: { color: colors.ink, fontSize: 21, fontWeight: "800" },
  brandLarge: { color: colors.ink, fontSize: 30, fontWeight: "900", letterSpacing: -1 },
  tagline: { color: colors.muted, fontSize: 12, marginTop: 4 },
  content: { padding: 22, paddingBottom: 35, flexGrow: 1, justifyContent: "center" },
  brandBlock: { alignItems: "center", marginBottom: 26 },
  warning: { backgroundColor: "#FFF4D9", borderColor: "#F5D98A", borderWidth: 1, borderRadius: 14, padding: 13, marginBottom: 16 },
  warningTitle: { color: "#805B00", fontWeight: "800", fontSize: 13, marginBottom: 4 },
  warningText: { color: "#735B20", fontSize: 12, lineHeight: 18 },
  formCard: { backgroundColor: colors.white, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: 20 },
  title: { color: colors.ink, fontSize: 23, fontWeight: "900", letterSpacing: -0.5 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 7, marginBottom: 20 },
  field: { marginBottom: 15 },
  label: { color: colors.ink, fontSize: 12, fontWeight: "800", marginBottom: 7 },
  input: { height: 49, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: "#FCFCFF", paddingHorizontal: 13, color: colors.ink, fontSize: 14 },
  primaryButton: { height: 50, backgroundColor: colors.primary, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 5 },
  buttonDisabled: { opacity: 0.65 },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: "800" },
  modeButton: { paddingVertical: 15, alignItems: "center" },
  modeText: { color: colors.violet, fontSize: 12, fontWeight: "800", textAlign: "center" },
  privacyNote: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: "center", marginTop: 18, paddingHorizontal: 8 },
  signedIn: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center" },
  avatar: { width: 74, height: 74, borderRadius: 26, backgroundColor: "#E9E7FF", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  avatarText: { color: colors.primary, fontSize: 30, fontWeight: "900" },
  infoCard: { width: "100%", backgroundColor: colors.white, borderRadius: 17, padding: 17, marginTop: 24, borderWidth: 1, borderColor: colors.border },
  infoTitle: { color: colors.ink, fontSize: 14, fontWeight: "900", marginBottom: 7 },
  infoText: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  secondaryButton: { width: "100%", marginTop: 18, padding: 14, borderRadius: 13, alignItems: "center", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  secondaryButtonText: { color: colors.ink, fontSize: 13, fontWeight: "800" }
});
