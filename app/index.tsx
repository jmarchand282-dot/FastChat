import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import * as ImagePicker from "expo-image-picker";
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

type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  preferred_language: string;
};

export default function HomeScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [busy, setBusy] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [profileName, setProfileName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [preferredLanguage, setPreferredLanguage] = useState("fr");

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

  useEffect(() => {
    if (!session || !supabase) return;
    let cancelled = false;
    setProfileLoading(true);
    supabase.from("profiles").select("id,display_name,avatar_url,preferred_language").eq("id", session.user.id).maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          Alert.alert("Profil", "Impossible de charger le profil : " + error.message);
        } else if (data) {
          setProfileName(data.display_name || String(session.user.user_metadata?.display_name || ""));
          setAvatarUrl(data.avatar_url || null);
          setPreferredLanguage(data.preferred_language || "fr");
        } else {
          setProfileName(String(session.user.user_metadata?.display_name || ""));
        }
        setProfileLoading(false);
      });
    return () => { cancelled = true; };
  }, [session]);

  async function submitAuth() {
    if (!supabase) {
      Alert.alert("Configuration nécessaire", "FastChat doit être relié à Supabase avec l’URL du projet et la clé publique.");
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
          Alert.alert("Bienvenue sur FastChat", "Ton compte est créé. Tu peux maintenant compléter ton profil.");
        } else {
          Alert.alert("Compte créé", "Si la confirmation par e-mail est désactivée dans Supabase, connecte-toi maintenant.");
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
      }
    } catch (error) {
      Alert.alert("Impossible de continuer", error instanceof Error ? error.message : "Une erreur inattendue est survenue.");
    } finally {
      setBusy(false);
    }
  }

  async function choosePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Autorisation nécessaire", "Autorise FastChat à accéder aux photos pour choisir une photo de profil.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8
    });
    if (!result.canceled && result.assets[0]) {
      setLocalPhotoUri(result.assets[0].uri);
    }
  }

  async function saveProfile() {
    if (!supabase || !session) return;
    const cleanName = profileName.trim();
    if (!cleanName) {
      Alert.alert("Nom requis", "Entre le nom que tu veux afficher.");
      return;
    }
    setBusy(true);
    try {
      let savedAvatarUrl = avatarUrl;
      if (localPhotoUri) {
        const response = await fetch(localPhotoUri);
        const fileBuffer = await response.arrayBuffer();
        const filePath = session.user.id + "/avatar-" + Date.now() + ".jpg";
        const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, fileBuffer, {
          contentType: "image/jpeg",
          upsert: true
        });
        if (uploadError) throw new Error("Envoi de la photo impossible. Vérifie que le bucket avatars et ses règles sont configurés dans Supabase. " + uploadError.message);
        const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
        savedAvatarUrl = data.publicUrl;
      }
      const { error } = await supabase.from("profiles").upsert({
        id: session.user.id,
        display_name: cleanName,
        avatar_url: savedAvatarUrl,
        preferred_language: preferredLanguage,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      setAvatarUrl(savedAvatarUrl);
      setLocalPhotoUri(null);
      Alert.alert("Profil enregistré", "Tes informations ont été enregistrées dans FastChat.");
    } catch (error) {
      Alert.alert("Enregistrement impossible", error instanceof Error ? error.message : "Une erreur inattendue est survenue.");
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
    return <SafeAreaView style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.loadingText}>Ouverture de FastChat…</Text></SafeAreaView>;
  }

  if (session) {
    const name = profileName || String(session.user.user_metadata?.display_name || session.user.email || "Utilisateur");
    const shownPhoto = localPhotoUri || avatarUrl;
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.logo}><Text style={styles.logoText}>FC</Text></View>
            <View><Text style={styles.brand}>FastChat</Text><Text style={styles.tagline}>Restez proches, où que vous soyez.</Text></View>
          </View>
        </View>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.profileContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Ton profil</Text>
            <Text style={styles.subtitle}>Ajoute ta photo et vérifie les informations que les autres verront.</Text>
            {profileLoading ? <ActivityIndicator color={colors.primary} /> : null}
            <TouchableOpacity style={styles.photoPicker} onPress={choosePhoto} disabled={busy}>
              {shownPhoto ? <Image source={{ uri: shownPhoto }} style={styles.avatarImage} /> : <View style={styles.avatar}><Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase() || "?"}</Text></View>}
              <Text style={styles.photoAction}>Choisir une photo</Text>
              <Text style={styles.photoHint}>Appuie ici pour ouvrir la galerie</Text>
            </TouchableOpacity>
            <View style={styles.formCard}>
              <Text style={styles.label}>Nom affiché</Text>
              <TextInput value={profileName} onChangeText={setProfileName} placeholder="Ton nom" placeholderTextColor="#999BB0" style={styles.input} autoCapitalize="words" maxLength={60} />
              <Text style={styles.label}>Adresse e-mail</Text>
              <View style={styles.readOnlyField}><Text style={styles.readOnlyText}>{session.user.email || "E-mail non disponible"}</Text></View>
              <Text style={styles.label}>Langue de l’application</Text>
              <View style={styles.languageRow}>
                <TouchableOpacity onPress={() => setPreferredLanguage("fr")} style={[styles.languageButton, preferredLanguage === "fr" && styles.languageSelected]}><Text style={[styles.languageText, preferredLanguage === "fr" && styles.languageTextSelected]}>Français</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setPreferredLanguage("en")} style={[styles.languageButton, preferredLanguage === "en" && styles.languageSelected]}><Text style={[styles.languageText, preferredLanguage === "en" && styles.languageTextSelected]}>English</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setPreferredLanguage("sw")} style={[styles.languageButton, preferredLanguage === "sw" && styles.languageSelected]}><Text style={[styles.languageText, preferredLanguage === "sw" && styles.languageTextSelected]}>Kiswahili</Text></TouchableOpacity>
              </View>
              <TouchableOpacity style={[styles.primaryButton, busy && styles.buttonDisabled]} onPress={saveProfile} disabled={busy || profileLoading}>
                {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonText}>Enregistrer mon profil</Text>}
              </TouchableOpacity>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Prochaine étape</Text>
              <Text style={styles.infoText}>Après le profil, nous connecterons la recherche de contacts et les conversations.</Text>
            </View>
            <TouchableOpacity style={styles.secondaryButton} onPress={signOut}><Text style={styles.secondaryButtonText}>Se déconnecter</Text></TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brandBlock}><View style={styles.logoLarge}><Text style={styles.logoText}>FC</Text></View><Text style={styles.brandLarge}>FastChat</Text><Text style={styles.tagline}>Restez proches, où que vous soyez.</Text></View>
          {!isSupabaseConfigured && <View style={styles.warning}><Text style={styles.warningTitle}>Connexion à configurer</Text><Text style={styles.warningText}>L’URL Supabase et la clé publique ne sont pas configurées.</Text></View>}
          <View style={styles.formCard}>
            <Text style={styles.title}>{mode === "signup" ? "Créer un compte" : "Heureux de te revoir"}</Text>
            <Text style={styles.subtitle}>{mode === "signup" ? "Rejoins FastChat gratuitement." : "Connecte-toi pour retrouver ton compte."}</Text>
            {mode === "signup" && <View style={styles.field}><Text style={styles.label}>Nom affiché</Text><TextInput value={displayName} onChangeText={setDisplayName} placeholder="Ex. Amina" placeholderTextColor="#999BB0" style={styles.input} autoCapitalize="words" maxLength={60} /></View>}
            <View style={styles.field}><Text style={styles.label}>Adresse e-mail</Text><TextInput value={email} onChangeText={setEmail} placeholder="toi@exemple.com" placeholderTextColor="#999BB0" style={styles.input} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" /></View>
            <View style={styles.field}><Text style={styles.label}>Mot de passe</Text><TextInput value={password} onChangeText={setPassword} placeholder="6 caractères minimum" placeholderTextColor="#999BB0" style={styles.input} secureTextEntry autoCapitalize="none" textContentType={mode === "signup" ? "newPassword" : "password"} /></View>
            <TouchableOpacity style={[styles.primaryButton, busy && styles.buttonDisabled]} onPress={submitAuth} disabled={busy}>{busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonText}>{mode === "signup" ? "Créer mon compte" : "Se connecter"}</Text>}</TouchableOpacity>
            <TouchableOpacity style={styles.modeButton} onPress={() => setMode(mode === "signup" ? "signin" : "signup")} disabled={busy}><Text style={styles.modeText}>{mode === "signup" ? "Tu as déjà un compte ? Se connecter" : "Nouveau sur FastChat ? Créer un compte"}</Text></TouchableOpacity>
          </View>
          <Text style={styles.privacyNote}>Ne partage ton mot de passe avec personne.</Text>
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
  profileContent: { padding: 22, paddingBottom: 35 },
  brandBlock: { alignItems: "center", marginBottom: 26 },
  warning: { backgroundColor: "#FFF4D9", borderColor: "#F5D98A", borderWidth: 1, borderRadius: 14, padding: 13, marginBottom: 16 },
  warningTitle: { color: "#805B00", fontWeight: "800", fontSize: 13, marginBottom: 4 },
  warningText: { color: "#735B20", fontSize: 12, lineHeight: 18 },
  formCard: { backgroundColor: colors.white, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: 20, marginTop: 12 },
  title: { color: colors.ink, fontSize: 23, fontWeight: "900", letterSpacing: -0.5 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 7, marginBottom: 20 },
  field: { marginBottom: 15 },
  label: { color: colors.ink, fontSize: 12, fontWeight: "800", marginBottom: 7, marginTop: 12 },
  input: { height: 49, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: "#FCFCFF", paddingHorizontal: 13, color: colors.ink, fontSize: 14 },
  readOnlyField: { minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: "#F5F5FA", paddingHorizontal: 13, justifyContent: "center" },
  readOnlyText: { color: colors.muted, fontSize: 14 },
  primaryButton: { minHeight: 50, backgroundColor: colors.primary, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 18, paddingHorizontal: 12 },
  buttonDisabled: { opacity: 0.65 },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: "800", textAlign: "center" },
  modeButton: { paddingVertical: 15, alignItems: "center" },
  modeText: { color: colors.violet, fontSize: 12, fontWeight: "800", textAlign: "center" },
  privacyNote: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: "center", marginTop: 18, paddingHorizontal: 8 },
  signedIn: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center" },
  avatar: { width: 104, height: 104, borderRadius: 36, backgroundColor: "#E9E7FF", alignItems: "center", justifyContent: "center", marginBottom: 10, overflow: "hidden" },
  avatarText: { color: colors.primary, fontSize: 38, fontWeight: "900" },
  avatarImage: { width: 104, height: 104, borderRadius: 36, marginBottom: 10 },
  photoPicker: { alignItems: "center", marginVertical: 8, padding: 12 },
  photoAction: { color: colors.primary, fontSize: 14, fontWeight: "800", marginTop: 6 },
  photoHint: { color: colors.muted, fontSize: 11, marginTop: 4 },
  infoCard: { width: "100%", backgroundColor: colors.white, borderRadius: 17, padding: 17, marginTop: 20, borderWidth: 1, borderColor: colors.border },
  infoTitle: { color: colors.ink, fontSize: 14, fontWeight: "900", marginBottom: 7 },
  infoText: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  secondaryButton: { width: "100%", marginTop: 18, padding: 14, borderRadius: 13, alignItems: "center", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  secondaryButtonText: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  languageRow: { flexDirection: "row", gap: 7, marginTop: 2 },
  languageButton: { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: "center", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  languageSelected: { borderColor: colors.primary, backgroundColor: "#EEEDFF" },
  languageText: { fontSize: 11, color: colors.muted, fontWeight: "700" },
  languageTextSelected: { color: colors.primary }
});
