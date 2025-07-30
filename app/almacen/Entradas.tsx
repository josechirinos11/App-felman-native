import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';

export default function Entradas() {
  const [query, setQuery] = React.useState('');
  const [data, setData] = React.useState<any[]>([]);

  const filtered = data.filter(item =>
    item.nombre.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Entradas</Text>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} />
        <TextInput
          style={styles.searchInput}
          placeholder="Busca KPI o stock..."
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(_,i) => i.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>{item.titulo}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, padding:16, backgroundColor:'#f3f4f6' },
  title: { fontSize:24, fontWeight:'bold', marginBottom:12 },
  searchBox: { flexDirection:'row', alignItems:'center', backgroundColor:'#fff', padding:8, borderRadius:8, marginBottom:12 },
  searchInput: { flex:1, marginLeft:8 },
  card: { backgroundColor:'#fff', padding:12, borderRadius:8, marginBottom:8 }
});
