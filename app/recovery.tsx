import { useEffect, useRef, useState } from "react";
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
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { supabase } from "../src/lib/supabase";

const colors = {
  primary: "#4F46E5",
  violet: "#7C3AED",
  background: "#F7F8FC",
  ink: "#17172B",
  muted: "#777A91",
  white: "#FFFFFF",
  border: "#E8E9F2"
};

export default function RecoveryScreen() {
  const [checkingLink, setCheckingLink] = useState(true);
  const [validLink, setValidLink] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const handledUrls = useRef(new Set<string>());

  useEffect(() => {
    async function handleRecoveryUrl(url: string | null) {
      if (!url || handledUrls.current.has(url)) return;
      handledUrls.current.add(url);
      try {
        const parsed = new URL(url);
        const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ""));
        const query = parsed.searchParams;
        const errorDescription = query.get("error_description") || fragment.get("error_description");
        if (errorDescription) throw new Error(decodeURIComponent(errorDescription.replace(/\+/g, " ")));

        const code = query.get("code");
        if (code && supabase) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          setValidLink(true);
          setCheckingLink(false);
          return;
        }

        const accessToken = fragment.get("access_token") || query.get("access_token");
        const refreshToken = fragment.get("refresh_token") || query.get("refresh_token");
        const type = fragment.get("type") || query.get("type");
        if (!supabase || !accessToken || !refreshToken || (type && type !== "recovery")) {
          throw new Error("Le lien est incomplet ou a expiré. Demande un nouvel e-mail de récupération.");
        }
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        if (error) throw error;
        setValidLink(true);
      } catch (error) {
        Alert.alert(
          "Lien de récupération invalide",
          error instanceof Error ? error.message : "Ouvre le lien reçu par e-mail sur ce téléphone, puis réessaie."
        );
        setValidLink(false);
      } finally {
        setCheckingLink(false);
      }
    }

    Linking.getInitialURL().then(handleRecoveryUrl).catch(() => {
      setCheckingLink(false);
    });
    const subscription = Linking.addEventListener("url", ({ url }) => {
      setCheckingLink(true);
      handleRecoveryUrl(url);
    });
    return () => subscription.remove();
  }, []);

  async function updatePassword() {
    if (!supabase) {
      Alert.alert("Erreur", "FastChat n’est pas relié à Supabase.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Mot de passe trop court", "Utilise au moins 6 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Vérifie la confirmation", "Les deux mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      Alert.alert("Mot de passe modifié", "Ton nouveau mot de passe est enregistré. Tu peux maintenant te connecter.", [
        { text: "Se connecter", onPress: () => router.replace("/") }
      ]);
    } catch (error) {
      Alert.alert("Modification impossible", error instanceof Error ? error.message : "Une erreur inattendue est survenue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brandBlock}>
            <View style={styles.logo}><Text style={styles.logoText}>FC</Text></View>
            <Text style={styles.brand}>FastChat</Text>
            <Text style={styles.tagline}>Récupération du compte</Text>
          </View>

          {checkingLink ? (
            <View style={styles.statusCard}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={styles.subtitle}>Vérification du lien de récupération…</Text>
            </View>
          ) : validLink ? (
            <View style={styles.formCard}>
              <Text style={styles.title}>Choisir un nouveau mot de passe</Text>
              <Text style={styles.subtitle}>Crée un mot de passe que tu n’as pas utilisé ailleurs.</Text>
              <Text style={styles.label}>Nouveau mot de passe</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="6 caractères minimum"
                placeholderTextColor="#999BB0"
                style={styles.input}
                secureTextEntry
                autoCapitalize="none"
                textContentType="newPassword"
              />
              <Text style={styles.label}>Confirmer le mot de passe</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Saisis-le une deuxième fois"
                placeholderTextColor="#999BB0"
                style={styles.input}
                secureTextEntry
                autoCapitalize="none"
                textContentType="newPassword"
              />
              <TouchableOpacity style={[styles.primaryButton, busy && styles.disabled]} onPress={updatePassword} disabled={busy}>
                {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonText}>Enregistrer le nouveau mot de passe</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formCard}>
              <Text style={styles.title}>Lien non valide</Text>
              <Text style={styles.subtitle}>Le lien a peut-être expiré ou ne s’est pas ouvert correctement. Retourne à la connexion et demande un nouvel e-mail.</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace("/")}>
                <Text style={styles.primaryButtonText}>Retour à la connexion</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 22, paddingBottom: 35, flexGrow: 1, justifyContent: "center" },
  brandBlock: { alignItems: "center", marginBottom: 26 },
  logo: { width: 66, height: 66, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  logoText: { color: colors.white, fontSize: 22, fontWeight: "900", letterSpacing: -1 },
  brand: { color: colors.ink, fontSize: 30, fontWeight: "900", letterSpacing: -1 },
  tagline: { color: colors.muted, fontSize: 13, marginTop: 4 },
  formCard: { backgroundColor: colors.white, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: 20 },
  statusCard: { alignItems: "center", backgroundColor: colors.white, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: 28 },
  title: { color: colors.ink, fontSize: 23, fontWeight: "900", letterSpacing: -0.5 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 9, marginBottom: 18 },
  label: { color: colors.ink, fontSize: 12, fontWeight: "800", marginBottom: 7, marginTop: 12 },
  input: { height: 49, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: "#FCFCFF", paddingHorizontal: 13, color: colors.ink, fontSize: 14 },
  primaryButton: { minHeight: 50, backgroundColor: colors.primary, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 20, paddingHorizontal: 12 },
  disabled: { opacity: 0.65 },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: "800", textAlign: "center" }
});
