import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert } from "react-native";
import { router } from "expo-router";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../src/lib/supabase";

const C = { primary:"#4F46E5", violet:"#7C3AED", bg:"#F7F8FC", ink:"#17172B", muted:"#777A91", white:"#FFFFFF", border:"#E8E9F2", pale:"#EEEDFF" };
type Tab = "chats" | "status" | "communities" | "profile";
type Conversation = { id:string; kind:string; title:string|null; created_at:string; lastMessage?:string; otherName?:string };
type Message = { id:string; conversation_id:string; sender_id:string; body:string; created_at:string };

export default function ChatScreen() {
  const [session,setSession] = useState<Session|null>(null);
  const [tab,setTab] = useState<Tab>("chats");
  const [loading,setLoading] = useState(true);
  const [conversations,setConversations] = useState<Conversation[]>([]);
  const [selected,setSelected] = useState<Conversation|null>(null);
  const [messages,setMessages] = useState<Message[]>([]);
  const [draft,setDraft] = useState("");
  const [search,setSearch] = useState("");
  const [people,setPeople] = useState<any[]>([]);
  const [statusItems,setStatusItems] = useState<any[]>([]);
  const [newStatus,setNewStatus] = useState("");
  const [profile,setProfile] = useState<any>(null);

  useEffect(()=>{ if(!supabase){setLoading(false);return;} supabase.auth.getSession().then(({data})=>{setSession(data.session);if(!data.session)router.replace("/");else setLoading(false);}); const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);if(!s)router.replace("/");}); return ()=>subscription.unsubscribe();},[]);

  const loadConversations = useCallback(async()=>{
    if(!supabase||!session)return;
    const {data:members,error}=await supabase.from("conversation_members").select("conversation_id").eq("user_id",session.user.id);
    if(error){Alert.alert("Discussions",error.message);return;}
    const ids=(members||[]).map(x=>x.conversation_id);
    if(!ids.length){setConversations([]);return;}
    const {data:rows,error:convError}=await supabase.from("conversations").select("id,kind,title,created_at").in("id",ids).order("created_at",{ascending:false});
    if(convError){Alert.alert("Discussions",convError.message);return;}
    const enriched:Conversation[]=[];
    for(const row of rows||[]){
      const {data:last}=await supabase.from("messages").select("body").eq("conversation_id",row.id).order("created_at",{ascending:false}).limit(1).maybeSingle();
      let otherName=row.title||"Nouvelle conversation";
      if(row.kind==="direct"){
        const {data:ms}=await supabase.from("conversation_members").select("user_id").eq("conversation_id",row.id).neq("user_id",session.user.id).limit(1);
        if(ms?.[0]){const {data:p}=await supabase.from("profiles").select("display_name").eq("id",ms[0].user_id).maybeSingle();otherName=p?.display_name||"Contact FastChat";}
      }
      enriched.push({...row,lastMessage:last?.body||"Commencez la conversation",otherName});
    }
    setConversations(enriched);
  },[session]);

  useEffect(()=>{if(session) {loadConversations(); supabase?.from("profiles").select("*").eq("id",session.user.id).maybeSingle().then(({data})=>setProfile(data));}},[session,loadConversations]);

  const loadMessages=useCallback(async(conv:Conversation)=>{
    if(!supabase)return;
    const {data,error}=await supabase.from("messages").select("*").eq("conversation_id",conv.id).order("created_at",{ascending:true}).limit(100);
    if(error)Alert.alert("Messages",error.message);else setMessages(data||[]);
  },[]);
  useEffect(()=>{if(selected)loadMessages(selected);},[selected,loadMessages]);

  async function sendMessage(){
    const body=draft.trim(); if(!body||!selected||!session||!supabase)return;
    setDraft("");
    const {error}=await supabase.from("messages").insert({conversation_id:selected.id,sender_id:session.user.id,body});
    if(error){setDraft(body);Alert.alert("Envoi impossible",error.message);return;}
    await loadMessages(selected); await loadConversations();
  }

  async function findPeople(){
    if(!supabase||!session)return;
    const term=search.trim(); if(term.length<2){Alert.alert("Recherche","Entre au moins deux caractères.");return;}
    const {data,error}=await supabase.from("profiles").select("id,display_name,avatar_url").ilike("display_name","%"+term+"%").neq("id",session.user.id).limit(20);
    if(error)Alert.alert("Recherche",error.message);else setPeople(data||[]);
  }

  async function startConversation(person:any){
    if(!supabase||!session)return;
    const existing=conversations.find(c=>c.kind==="direct"&&c.otherName===person.display_name);
    if(existing){setSelected(existing);return;}
    const {data:conv,error}=await supabase.from("conversations").insert({kind:"direct",created_by:session.user.id}).select("id,kind,title,created_at").single();
    if(error){Alert.alert("Conversation",error.message);return;}
    const {error:memberError}=await supabase.from("conversation_members").insert([{conversation_id:conv.id,user_id:session.user.id},{conversation_id:conv.id,user_id:person.id}]);
    if(memberError){Alert.alert("Membres",memberError.message);return;}
    const next={...conv,otherName:person.display_name,lastMessage:"Commencez la conversation"};
    setConversations(prev=>[next,...prev]);setSelected(next);setPeople([]);
  }

  async function createStatus(){
    if(!supabase||!session||!newStatus.trim())return;
    const {error}=await supabase.from("statuses").insert({user_id:session.user.id,text_content:newStatus.trim()});
    if(error)Alert.alert("Statut",error.message);else{setNewStatus("");loadStatuses();}
  }
  async function loadStatuses(){if(!supabase)return;const {data,error}=await supabase.from("statuses").select("id,user_id,text_content,created_at,expires_at").gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false});if(error)Alert.alert("Statuts",error.message);else setStatusItems(data||[]);}
  useEffect(()=>{if(tab==="status")loadStatuses();},[tab]);

  async function createGroup(){
    if(!supabase||!session)return;
    Alert.prompt?.("Nouveau groupe","Nom du groupe",async(title)=>{if(!title?.trim())return;const {data,error}=await supabase.from("conversations").insert({kind:"group",title:title.trim(),created_by:session.user.id}).select("id,kind,title,created_at").single();if(error){Alert.alert("Groupe",error.message);return;}const {error:e}=await supabase.from("conversation_members").insert({conversation_id:data.id,user_id:session.user.id});if(e){Alert.alert("Membres",e.message);return;}await loadConversations();setTab("chats");}, "plain-text");
    if(Platform.OS==="android") Alert.alert("Création de groupe","La création de groupe avec formulaire sera ajoutée dans la prochaine version. Utilise la messagerie privée pour le moment.");
  }

  async function signOut(){await supabase?.auth.signOut();router.replace("/");}
  if(loading||!session)return <SafeAreaView style={s.center}><ActivityIndicator color={C.primary}/><Text style={s.muted}>Chargement de FastChat…</Text></SafeAreaView>;

  if(selected)return <SafeAreaView style={s.safe}><View style={s.chatHeader}><TouchableOpacity onPress={()=>setSelected(null)}><Text style={s.back}>‹</Text></TouchableOpacity><View style={s.avatarSmall}><Text style={s.avatarLetter}>{(selected.otherName||selected.title||"F").slice(0,1).toUpperCase()}</Text></View><View style={{flex:1}}><Text style={s.personTitle}>{selected.otherName||selected.title}</Text><Text style={s.muted}>Conversation FastChat</Text></View></View><FlatList style={{flex:1}} contentContainerStyle={{padding:16}} data={messages} keyExtractor={m=>m.id} renderItem={({item})=><View style={[s.bubble,item.sender_id===session.user.id?s.myBubble:s.theirBubble]}><Text style={item.sender_id===session.user.id?s.myText:s.theirText}>{item.body}</Text><Text style={s.time}>{new Date(item.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</Text></View>} ListEmptyComponent={<Text style={s.empty}>Aucun message. Écris le premier message !</Text>}/><KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":undefined}><View style={s.composer}><TextInput value={draft} onChangeText={setDraft} placeholder="Écrire un message…" style={s.messageInput} multiline/><TouchableOpacity style={s.send} onPress={sendMessage}><Text style={s.sendText}>➤</Text></TouchableOpacity></View></KeyboardAvoidingView></SafeAreaView>;

  return <SafeAreaView style={s.safe}>
    <View style={s.top}><View style={s.brandRow}><View style={s.logo}><Text style={s.logoText}>FC</Text></View><View><Text style={s.brand}>FastChat</Text><Text style={s.muted}>Restez proches, où que vous soyez.</Text></View></View><TouchableOpacity onPress={()=>setTab("profile")}><View style={s.profileDot}><Text style={s.profileDotText}>{(profile?.display_name||"F").slice(0,1).toUpperCase()}</Text></View></TouchableOpacity></View>
    {tab==="chats"&&<View style={{flex:1}}><View style={s.sectionHead}><Text style={s.heading}>Discussions</Text><TouchableOpacity style={s.newButton} onPress={()=>{setPeople([]);setSearch("");Alert.alert("Nouvelle discussion","Utilise la recherche ci-dessous pour trouver un utilisateur.");}}><Text style={s.newButtonText}>＋ Nouveau</Text></TouchableOpacity></View><View style={s.searchRow}><TextInput value={search} onChangeText={setSearch} placeholder="Rechercher une personne…" style={s.searchInput}/><TouchableOpacity style={s.searchButton} onPress={findPeople}><Text style={s.searchButtonText}>Chercher</Text></TouchableOpacity></View>{people.map(p=><TouchableOpacity key={p.id} style={s.personRow} onPress={()=>startConversation(p)}><View style={s.avatarSmall}><Text style={s.avatarLetter}>{p.display_name?.slice(0,1).toUpperCase()}</Text></View><Text style={s.personTitle}>{p.display_name}</Text><Text style={s.muted}>Message ›</Text></TouchableOpacity>)}<FlatList data={conversations} keyExtractor={c=>c.id} onRefresh={loadConversations} refreshing={false} renderItem={({item})=><TouchableOpacity style={s.conversationRow} onPress={()=>setSelected(item)}><View style={s.avatar}><Text style={s.avatarLetter}>{(item.otherName||item.title||"F").slice(0,1).toUpperCase()}</Text></View><View style={{flex:1}}><Text style={s.personTitle}>{item.otherName||item.title}</Text><Text style={s.muted} numberOfLines={1}>{item.lastMessage}</Text></View><Text style={s.chevron}>›</Text></TouchableOpacity>} ListEmptyComponent={<View style={s.emptyCard}><Text style={s.emptyTitle}>Bienvenue sur FastChat</Text><Text style={s.muted}>Tes conversations apparaîtront ici. Recherche une personne pour commencer à discuter.</Text></View>}/></View>}
    {tab==="status"&&<ScrollView contentContainerStyle={s.page}><Text style={s.heading}>Statuts</Text><Text style={s.muted}>Partage une pensée avec les utilisateurs de FastChat. Les statuts expirent après 24 heures.</Text><View style={s.card}><TextInput value={newStatus} onChangeText={setNewStatus} placeholder="Quoi de neuf ?" style={s.searchInput} multiline/><TouchableOpacity style={s.primary} onPress={createStatus}><Text style={s.primaryText}>Publier mon statut</Text></TouchableOpacity></View>{statusItems.map(st=><View key={st.id} style={s.statusRow}><Text style={s.personTitle}>{st.user_id===session.user.id?"Mon statut":"Statut FastChat"}</Text><Text style={s.statusText}>{st.text_content}</Text><Text style={s.time}>{new Date(st.created_at).toLocaleString()}</Text></View>)}</ScrollView>}
    {tab==="communities"&&<ScrollView contentContainerStyle={s.page}><Text style={s.heading}>Communautés</Text><Text style={s.muted}>Crée des espaces pour discuter avec plusieurs personnes.</Text><View style={s.card}><Text style={s.emptyTitle}>Groupes FastChat</Text><Text style={s.muted}>Les groupes utilisent les conversations collectives. Les outils d'administration avancés arriveront dans une prochaine phase.</Text><TouchableOpacity style={s.primary} onPress={createGroup}><Text style={s.primaryText}>＋ Créer un groupe</Text></TouchableOpacity></View></ScrollView>}
    {tab==="profile"&&<ScrollView contentContainerStyle={s.page}><Text style={s.heading}>Mon profil</Text><View style={s.card}><View style={s.avatarBig}><Text style={s.avatarLetter}>{(profile?.display_name||session.user.email||"F").slice(0,1).toUpperCase()}</Text></View><Text style={s.profileName}>{profile?.display_name||"Utilisateur FastChat"}</Text><Text style={s.muted}>{session.user.email}</Text><Text style={s.muted}>Langue : {profile?.preferred_language||"fr"}</Text></View><TouchableOpacity style={s.primary} onPress={()=>router.replace("/")}><Text style={s.primaryText}>Gérer mon profil</Text></TouchableOpacity><TouchableOpacity style={s.logout} onPress={signOut}><Text style={s.logoutText}>Se déconnecter</Text></TouchableOpacity></ScrollView>}
    <View style={s.nav}>{([{id:"chats",label:"Discussions",ico:"▤"},{id:"status",label:"Statuts",ico:"◉"},{id:"communities",label:"Groupes",ico:"♧"},{id:"profile",label:"Profil",ico:"●"}] as const).map(x=><TouchableOpacity key={x.id} style={s.navItem} onPress={()=>setTab(x.id)}><Text style={[s.navIcon,tab===x.id&&s.navActive]}>{x.ico}</Text><Text style={[s.navLabel,tab===x.id&&s.navActive]}>{x.label}</Text></TouchableOpacity>)}</View>
  </SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:C.bg},center:{flex:1,alignItems:"center",justifyContent:"center",backgroundColor:C.bg},muted:{color:C.muted,fontSize:12},top:{backgroundColor:C.white,paddingHorizontal:18,paddingVertical:14,borderBottomWidth:1,borderColor:C.border,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},brandRow:{flexDirection:"row",alignItems:"center"},logo:{width:43,height:43,borderRadius:15,backgroundColor:C.primary,alignItems:"center",justifyContent:"center",marginRight:11},logoText:{color:C.white,fontWeight:"900",fontSize:17},brand:{fontSize:21,fontWeight:"900",color:C.ink},profileDot:{width:38,height:38,borderRadius:19,backgroundColor:C.pale,alignItems:"center",justifyContent:"center"},profileDotText:{color:C.primary,fontWeight:"900"},sectionHead:{paddingHorizontal:18,paddingTop:20,paddingBottom:10,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},heading:{fontSize:25,fontWeight:"900",color:C.ink,marginBottom:6},newButton:{backgroundColor:C.pale,paddingHorizontal:13,paddingVertical:9,borderRadius:12},newButtonText:{color:C.primary,fontWeight:"800",fontSize:12},searchRow:{flexDirection:"row",paddingHorizontal:16,paddingBottom:10,gap:8},searchInput:{flex:1,backgroundColor:C.white,borderWidth:1,borderColor:C.border,borderRadius:13,paddingHorizontal:13,paddingVertical:11,color:C.ink},searchButton:{backgroundColor:C.primary,borderRadius:12,paddingHorizontal:13,justifyContent:"center"},searchButtonText:{color:C.white,fontWeight:"800",fontSize:12},conversationRow:{flexDirection:"row",alignItems:"center",paddingHorizontal:17,paddingVertical:13,borderBottomWidth:1,borderColor:C.border,gap:12},avatar:{width:49,height:49,borderRadius:18,backgroundColor:"#E9E7FF",alignItems:"center",justifyContent:"center"},avatarSmall:{width:40,height:40,borderRadius:15,backgroundColor:"#E9E7FF",alignItems:"center",justifyContent:"center"},avatarLetter:{fontSize:18,fontWeight:"900",color:C.primary},personTitle:{fontSize:14,fontWeight:"800",color:C.ink},chevron:{fontSize:25,color:C.muted},emptyCard:{margin:18,padding:22,backgroundColor:C.white,borderRadius:18,alignItems:"center",gap:8},emptyTitle:{fontSize:17,fontWeight:"900",color:C.ink},page:{padding:18,paddingBottom:35},card:{backgroundColor:C.white,borderWidth:1,borderColor:C.border,borderRadius:18,padding:17,marginTop:16,gap:10},primary:{backgroundColor:C.primary,borderRadius:13,padding:14,alignItems:"center",marginTop:12},primaryText:{color:C.white,fontWeight:"800"},statusRow:{padding:16,backgroundColor:C.white,borderRadius:15,marginTop:10,borderWidth:1,borderColor:C.border},statusText:{fontSize:15,color:C.ink,marginTop:7},time:{fontSize:10,color:C.muted,marginTop:7},nav:{height:66,backgroundColor:C.white,borderTopWidth:1,borderColor:C.border,flexDirection:"row",justifyContent:"space-around",alignItems:"center"},navItem:{alignItems:"center",flex:1,gap:3},navIcon:{fontSize:19,color:C.muted},navLabel:{fontSize:10,color:C.muted,fontWeight:"700"},navActive:{color:C.primary},chatHeader:{height:64,backgroundColor:C.white,borderBottomWidth:1,borderColor:C.border,flexDirection:"row",alignItems:"center",paddingHorizontal:14,gap:10},back:{fontSize:34,color:C.primary,marginRight:3},bubble:{maxWidth:"82%",padding:11,borderRadius:15,marginBottom:9},myBubble:{alignSelf:"flex-end",backgroundColor:C.primary,borderBottomRightRadius:4},theirBubble:{alignSelf:"flex-start",backgroundColor:C.white,borderBottomLeftRadius:4,borderWidth:1,borderColor:C.border},myText:{color:C.white,fontSize:14},theirText:{color:C.ink,fontSize:14},composer:{flexDirection:"row",alignItems:"center",padding:10,backgroundColor:C.white,borderTopWidth:1,borderColor:C.border,gap:8},messageInput:{flex:1,minHeight:43,maxHeight:100,borderRadius:14,backgroundColor:C.bg,paddingHorizontal:13,paddingVertical:10,color:C.ink},send:{width:43,height:43,borderRadius:15,backgroundColor:C.primary,alignItems:"center",justifyContent:"center"},sendText:{color:C.white,fontSize:18},empty:{textAlign:"center",color:C.muted,marginTop:30},logout:{padding:15,alignItems:"center",marginTop:12},logoutText:{color:"#DC2626",fontWeight:"800"},avatarBig:{width:84,height:84,borderRadius:28,backgroundColor:C.pale,alignItems:"center",justifyContent:"center"},profileName:{fontSize:20,fontWeight:"900",color:C.ink}
});
