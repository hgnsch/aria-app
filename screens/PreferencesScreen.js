import {
  View, Text, StyleSheet, SafeAreaView, StatusBar,
  ScrollView, TouchableOpacity, Switch
} from 'react-native';
import { useState } from 'react';
import { colors } from '../theme/colors';

export default function PreferencesScreen({ navigation }) {
  const [directOnly, setDirectOnly] = useState(true);
  const [baggage, setBaggage] = useState(false);
  const [breakfast, setBreakfast] = useState(false);
  const [instaSpots, setInstaSpots] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [bestTime, setBestTime] = useState(true);
  const [inspiration, setInspiration] = useState(false);

  function PrefRow({ icon, label, value, onPress }) {
    return (
      <TouchableOpacity style={styles.prefRow} onPress={onPress} activeOpacity={0.6}>
        <Text style={styles.prefIcon}>{icon}</Text>
        <Text style={styles.prefLabel}>{label}</Text>
        <Text style={styles.prefValue}>{value}</Text>
        <Text style={styles.prefArrow}>›</Text>
      </TouchableOpacity>
    );
  }

  function ToggleRow({ icon, label, value, onToggle }) {
    return (
      <View style={styles.prefRow}>
        <Text style={styles.prefIcon}>{icon}</Text>
        <Text style={styles.prefLabel}>{label}</Text>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.white}
          ios_backgroundColor={colors.border}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Preferences</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.doneBtn}>Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>M</Text>
          </View>
          <View>
            <Text style={styles.profileName}>Marc</Text>
            <Text style={styles.profileEmail}>marc@example.com</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HOME BASE</Text>
          <View style={styles.card}>
            <PrefRow icon="🏠" label="Home airport" value="ZRH" />
            <PrefRow icon="💱" label="Currency" value="CHF" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FLIGHTS</Text>
          <View style={styles.card}>
            <PrefRow icon="💺" label="Cabin class" value="Economy" />
            <ToggleRow icon="✈️" label="Direct flights only" value={directOnly} onToggle={setDirectOnly} />
            <PrefRow icon="⏰" label="Preferred departure" value="Morning" />
            <PrefRow icon="🛫" label="Preferred airlines" value="SWISS, Iberia" />
            <ToggleRow icon="🧳" label="Always include baggage" value={baggage} onToggle={setBaggage} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HOTELS</Text>
          <View style={styles.card}>
            <PrefRow icon="⭐" label="Minimum stars" value="4 stars" />
            <PrefRow icon="📍" label="Location priority" value="Central" />
            <PrefRow icon="🛏️" label="Room type" value="King / Double" />
            <ToggleRow icon="🍳" label="Breakfast included" value={breakfast} onToggle={setBreakfast} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TRAVEL STYLE</Text>
          <View style={styles.card}>
            <PrefRow icon="🚶" label="Pace" value="Relaxed" />
            <PrefRow icon="👤" label="Travelling as" value="Solo" />
            <PrefRow icon="🍽️" label="Food interests" value="Local, Fine dining" />
            <PrefRow icon="🏛️" label="Activity interests" value="Museums, Walks" />
            <ToggleRow icon="📸" label="Instagrammable spots" value={instaSpots} onToggle={setInstaSpots} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>BUDGET</Text>
          <View style={styles.card}>
            <PrefRow icon="💰" label="Budget sensitivity" value="Balanced" />
            <PrefRow icon="🔔" label="Price alert threshold" value="CHF 50 drop" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
          <View style={styles.card}>
            <ToggleRow icon="📉" label="Price drop alerts" value={priceAlerts} onToggle={setPriceAlerts} />
            <ToggleRow icon="🌤️" label="Best time to go alerts" value={bestTime} onToggle={setBestTime} />
            <ToggleRow icon="💡" label="Trip inspiration" value={inspiration} onToggle={setInspiration} />
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  title: { fontSize: 22, fontWeight: '500', color: colors.text },
  doneBtn: { fontSize: 14, color: colors.primary, fontWeight: '500' },
  scroll: { flex: 1 },
  avatarSection: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 20, borderBottomWidth: 0.5, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  avatarLarge: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '500', color: colors.white },
  profileName: { fontSize: 15, fontWeight: '500', color: colors.text },
  profileEmail: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionLabel: {
    fontSize: 10, fontWeight: '500', letterSpacing: 1.5,
    color: colors.textDim, marginBottom: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  prefRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, paddingHorizontal: 14,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
    gap: 10,
  },
  prefIcon: { fontSize: 14, width: 20, textAlign: 'center' },
  prefLabel: { fontSize: 13, color: colors.text, flex: 1 },
  prefValue: { fontSize: 12, color: colors.textMuted },
  prefArrow: { fontSize: 14, color: colors.textDim, marginLeft: 4 },
});