import { useEffect } from "react";
import { router } from "expo-router";
import { ActivityIndicator, SafeAreaView, Text } from "react-native";
export default function HomeScreen(){
 useEffect(()=>{router.replace("/chat");},[]);
 return <SafeAreaView style={{flex:1,alignItems:"center",justifyContent:"center",backgroundColor:"#F6F7FC"}}><Text style={{fontSize:28,fontWeight:"900",color:"#5555D9"}}>FC · FastChat</Text><ActivityIndicator color="#5555D9" style={{marginTop:18}}/><Text style={{color:"#777A91",marginTop:10}}>Ouverture de votre espace…</Text></SafeAreaView>;
}