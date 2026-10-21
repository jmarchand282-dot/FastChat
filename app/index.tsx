import { useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

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

const previewChats = [
  { name: "Maya Johnson", message: "Are we still meeting today?", time: "09:41", initials: "MJ", color: "#FDE7D8", unread: 2 },
  { name: "Study Group", message: "Patrick: I shared the notes.", time: "08:56", initials: "SG", color: "#DDEBFF", unread: 4 },
  { name: "Daniel Kim", message: "Thanks! Talk to you soon.", time: "Yesterday", initials: "DK", color: "#E7DDFD", unread: 0 },
  { name: "Amina Said", message: "Voice message · 0:18", time: "Yesterday", initials: "AS", color: "#DDF7E8", unread: 0 }
];

export default function HomeScreen() {
  const [tab, setTab] = useState("Chats");
  const [query, setQuery] = useState("");
  const tabs = ["Chats", "Statuses", "Contacts", "Settings"];
  const visibleChats = previewChats.filter((chat) =>
    (chat.name + " " + chat.message).toLowerCase().includes(query.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logo}><Text style={styles.logoText}>FC</Text></View>
          <View>
            <Text style={styles.brand}>FastChat</Text>
            <Text style={styles.tagline}>Stay close, anywhere.</Text>
          </View>
          <View style={styles.headerSpacer} />
          <TouchableOpacity accessibilityLabel="New message" style={styles.newButton} onPress={() => setTab("Contacts")}>
            <Text style={styles.newButtonText}>＋</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.welcome}>
          <Text style={styles.eyebrow}>YOUR WORLD, CONNECTED</Text>
          <Text style={styles.title}>Good morning 👋</Text>
          <Text style={styles.subtitle}>Your conversations, all in one place.</Text>
        </View>

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            accessibilityLabel="Search conversations"
            placeholder="Search conversations..."
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.quickCard} onPress={() => setTab("Statuses")}>
            <View style={[styles.quickIcon, { backgroundColor: "#E9E7FF" }]}><Text style={styles.quickEmoji}>◉</Text></View>
            <Text style={styles.quickTitle}>Statuses</Text>
            <Text style={styles.quickSub}>See updates</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => setTab("Contacts")}>
            <View style={[styles.quickIcon, { backgroundColor: "#DFF7EA" }]}><Text style={styles.quickEmoji}>＋</Text></View>
            <Text style={styles.quickTitle}>New chat</Text>
            <Text style={styles.quickSub}>Find people</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{tab === "Chats" ? "Recent chats" : tab}</Text>
          <Text style={styles.sectionMeta}>{tab === "Chats" ? "SEE ALL" : "PREVIEW"}</Text>
        </View>

        {tab === "Chats" ? visibleChats.map((chat) => (
          <TouchableOpacity key={chat.name} style={styles.chatRow} onPress={() => {}}>
            <View style={[styles.avatar, { backgroundColor: chat.color }]}><Text style={styles.avatarText}>{chat.initials}</Text></View>
            <View style={styles.chatBody}>
              <View style={styles.chatTop}>
                <Text style={styles.chatName}>{chat.name}</Text>
                <Text style={styles.time}>{chat.time}</Text>
              </View>
              <View style={styles.chatBottom}>
                <Text style={styles.message} numberOfLines={1}>{chat.message}</Text>
                {chat.unread > 0 && <View style={styles.unread}><Text style={styles.unreadText}>{chat.unread}</Text></View>}
              </View>
            </View>
          </TouchableOpacity>
        )) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}><Text style={styles.emptyEmoji}>{tab === "Statuses" ? "◉" : tab === "Contacts" ? "♙" : "⚙"}</Text></View>
            <Text style={styles.emptyTitle}>{tab}</Text>
            <Text style={styles.emptyText}>
              {tab === "Statuses" ? "Status updates will appear here when this feature is connected." :
               tab === "Contacts" ? "Contact discovery and new conversations will be added in the next development step." :
               "Language, privacy, notifications, and account options will be available here."}
            </Text>
            <TouchableOpacity style={styles.backButton} onPress={() => setTab("Chats")}><Text style={styles.backButtonText}>Back to chats</Text></TouchableOpacity>
          </View>
        )}
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Early preview</Text>
          <Text style={styles.noticeText}>These sample conversations are demonstration content. Online accounts and real messaging are not connected yet.</Text>
        </View>
      </ScrollView>

      <View style={styles.bottomNav}>
        {tabs.map((item, index) => (
          <TouchableOpacity key={item} onPress={() => setTab(item)} style={styles.navItem}>
            <Text style={[styles.navIcon, tab === item && styles.navIconActive]}>{["▣", "◉", "♙", "⚙"][index]}</Text>
            <Text style={[styles.navLabel, tab === item && styles.navLabelActive]}>{item}</Text>
            {tab === item && <View style={styles.activeDot} />}
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.white, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  brandRow: { flexDirection: "row", alignItems: "center" },
  logo: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginRight: 12 },
  logoText: { color: colors.white, fontSize: 15, fontWeight: "900", letterSpacing: -1 },
  brand: { color: colors.ink, fontSize: 21, fontWeight: "800", letterSpacing: -0.5 },
  tagline: { color: colors.muted, fontSize: 12, marginTop: 2 },
  headerSpacer: { flex: 1 },
  newButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  newButtonText: { color: colors.white, fontSize: 27, lineHeight: 30, fontWeight: "400" },
  content: { padding: 20, paddingBottom: 30 },
  welcome: { marginTop: 8, marginBottom: 22 },
  eyebrow: { color: colors.violet, fontSize: 10, fontWeight: "800", letterSpacing: 1.5, marginBottom: 8 },
  title: { color: colors.ink, fontSize: 27, fontWeight: "800", letterSpacing: -0.7 },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: 6 },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: 15, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, height: 50, marginBottom: 18 },
  searchIcon: { color: colors.muted, fontSize: 27, marginRight: 9 },
  searchInput: { flex: 1, color: colors.ink, fontSize: 14 },
  quickRow: { flexDirection: "row", gap: 12, marginBottom: 28 },
  quickCard: { flex: 1, backgroundColor: colors.white, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: colors.border },
  quickIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  quickEmoji: { fontSize: 22, color: colors.primary, fontWeight: "700" },
  quickTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  quickSub: { color: colors.muted, fontSize: 11, marginTop: 4 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  sectionMeta: { color: colors.violet, fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  chatRow: { flexDirection: "row", alignItems: "center", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: { width: 48, height: 48, borderRadius: 17, alignItems: "center", justifyContent: "center", marginRight: 12 },
  avatarText: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  chatBody: { flex: 1 },
  chatTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  chatName: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  time: { color: colors.muted, fontSize: 10 },
  chatBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  message: { color: colors.muted, fontSize: 12, flex: 1, marginRight: 8 },
  unread: { backgroundColor: colors.green, minWidth: 19, height: 19, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  unreadText: { color: colors.white, fontSize: 10, fontWeight: "800" },
  emptyState: { backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: "center", padding: 24, marginTop: 4 },
  emptyIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: "#E9E7FF", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyEmoji: { fontSize: 25, color: colors.primary },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  emptyText: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 8 },
  backButton: { marginTop: 16, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16 },
  backButtonText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  notice: { marginTop: 25, backgroundColor: "#EEEDFF", borderRadius: 15, padding: 14 },
  noticeTitle: { color: colors.primary, fontSize: 12, fontWeight: "800", marginBottom: 4 },
  noticeText: { color: "#575779", fontSize: 11, lineHeight: 17 },
  bottomNav: { flexDirection: "row", justifyContent: "space-around", backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, paddingBottom: 7 },
  navItem: { flex: 1, alignItems: "center", paddingVertical: 3 },
  navIcon: { color: "#9A9CB0", fontSize: 20, marginBottom: 4 },
  navIconActive: { color: colors.primary },
  navLabel: { color: "#9A9CB0", fontSize: 10, fontWeight: "600" },
  navLabelActive: { color: colors.primary, fontWeight: "800" },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, marginTop: 4 }
});
