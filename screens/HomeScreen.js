import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, SafeAreaView, StatusBar
} from 'react-native';
import { colors } from '../theme/colors';
import { useApp } from '../context/AppContext';
import Globe from '../components/Globe';

const TAG_COLORS = {
  alert: colors.primary,
  ready: colors.accent,
  explore: colors.pink,
};

export default function HomeScreen({ navigation }) {
  const [view, setView] = useState('list');
  const { wishlist } = useApp();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <View style={styles.toggleGroup}>
          <TouchableOpacity
            style={[styles.toggleBtn, view === 'list' && styles.toggleActive]}
            onPress={() => setView('list')}
          >
            <Text style={[styles.toggleText, view === 'list' && styles.toggleTextActive]}>LIST</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, view === 'map' && styles.toggleActive]}
            onPress={() => setView('map')}
          >
            <Text style={[styles.toggleText, view === 'map' && styles.toggleTextActive]}>MAP</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Preferences')}>
          <Text style={styles.avatarText}>M</Text>
        </TouchableOpacity>
      </View>

      {view === 'list' ? (
        <View style={styles.listContainer}>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {wishlist.map((item, index) => (
              <TouchableOpacity key={item.id} style={styles.tile} activeOpacity={0.7}>
                <View style={[styles.tileAccent, { backgroundColor: colors.tileColors[index % colors.tileColors.length] }]} />
                <View style={styles.tileBody}>
                  <View style={styles.tileTop}>
                    <View>
                      <Text style={styles.tileCity}>{item.city}</Text>
                      <Text style={styles.tileCountry}>{item.country.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.tileFlag}>{item.flag}</Text>
                  </View>
                  <View style={styles.tileBottom}>
                    <Text style={styles.tileWhen}>{item.when}</Text>
                    <View style={[styles.tag, { borderColor: TAG_COLORS[item.tagType] || colors.primary }]}>
                      <Text style={[styles.tagText, { color: TAG_COLORS[item.tagType] || colors.primary }]}>
                        {item.tag.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.addBtn} activeOpacity={0.7}>
            <Text style={styles.addIcon}>+</Text>
            <Text style={styles.addText}>ADD A DESTINATION</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.mapContainer}>
          <View style={styles.globeWrap}>
            <Globe cities={wishlist} />
          </View>
          <TouchableOpacity style={styles.addBtn} activeOpacity={0.7}>
            <Text style={styles.addIcon}>+</Text>
            <Text style={styles.addText}>ADD A DESTINATION</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  headerSpacer: { width: 32 },
  toggleGroup: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: 4, overflow: 'hidden',
  },
  toggleBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 4 },
  toggleActive: { backgroundColor: colors.primary },
  toggleText: { fontSize: 10, fontWeight: '500', letterSpacing: 1, color: colors.textDim },
  toggleTextActive: { color: colors.white },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 12, fontWeight: '500', color: colors.white },
  listContainer: { flex: 1, flexDirection: 'column' },
  scroll: { flex: 1 },
  tile: {
    flexDirection: 'row', minHeight: 96,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  tileAccent: { width: 4 },
  tileBody: { flex: 1, padding: 14, justifyContent: 'space-between' },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tileCity: { fontSize: 18, fontWeight: '500', color: colors.text },
  tileCountry: { fontSize: 10, color: colors.textMuted, marginTop: 2, letterSpacing: 0.5 },
  tileFlag: { fontSize: 22 },
  tileBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  tileWhen: { fontSize: 11, color: colors.textMuted },
  tag: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 2 },
  tagText: { fontSize: 9, fontWeight: '500', letterSpacing: 1 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52, borderTopWidth: 0.5, borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  addIcon: { fontSize: 16, color: colors.textDim },
  addText: { fontSize: 10, letterSpacing: 1.2, color: colors.textDim, fontWeight: '500' },
  mapContainer: { flex: 1, flexDirection: 'column', backgroundColor: colors.bg },
  globeWrap: { flex: 1 },
});