import {
  View, Text, StyleSheet, SafeAreaView, StatusBar,
  ScrollView, TouchableOpacity, Switch
} from 'react-native';
import { colors } from '../theme/colors';
import { useApp } from '../context/AppContext';

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

function ToggleRow({ icon, label, prefKey, preferences, updatePreference }) {
  return (
    <View style={styles.prefRow}>
      <Text style={styles.prefIcon}>{icon}</Text>
      <Text style={styles.prefLabel}>{label}</Text>
      <Switch
        value={preferences[prefKey]}
        onValueChange={(val) => updatePreference(prefKey, val)}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.white}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

export default function PreferencesScreen({ navigation }) {
  const { preferences, updatePreference } = useApp();

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
            <Text style={styles.avatarText}>
              {preferences.name ? preferences.name[0].toUpperCase() : 'M'}
            </Text>
          </View>
          <View>
            <Text style={styles.profileName}>{preferences.name}</Text>
            <Text style={styles.profileEmail}>{preferences.email}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HOME BASE</Text>
          <View style={styles.card}>
            <PrefRow icon="🏠" label="Home airport" value={preferences.home_airports.join(', ')} />
            <PrefRow icon="💱" label="Currency" value={preferences.currency} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FLIGHTS</Text>
          <View style={styles.card}>
            <PrefRow icon="💺" label="Cabin class" value={preferences.cabin_class} />
            <ToggleRow icon="✈️" label="Direct flights only" prefKey="direct_flights_only"
              preferences={preferences} updatePreference={updatePreference} />
            <PrefRow icon="⏰" label="Preferred departure" value={preferences.preferred_departure} />
            <PrefRow icon="🛫" label="Preferred airlines" value={preferences.preferred_airlines.join(', ')} />
            <ToggleRow icon="🧳" label="Always include baggage" prefKey="always_include_baggage"
              preferences={preferences} updatePreference={updatePreference} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HOTELS</Text>
          <View style={styles.card}>
            <PrefRow icon="⭐" label="Minimum stars" value={`${preferences.min_hotel_stars} stars`} />
            <PrefRow icon="📍" label="Location priority" value={preferences.hotel_location_priority} />
            <PrefRow icon="🛏️" label="Room type" value={preferences.room_type} />
            <ToggleRow icon="🍳" label="Breakfast included" prefKey="breakfast_included"
              preferences={preferences} updatePreference={updatePreference} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TRAVEL STYLE</Text>
          <View style={styles.card}>
            <PrefRow icon="🚶" label="Pace" value={preferences.pace} />
            <PrefRow icon="👤" label="Travelling as" value={preferences.travelling_as} />
            <PrefRow icon="🍽️" label="Food interests" value={preferences.food_interests.join(', ')} />
            <PrefRow icon="🏛️" label="Activity interests" value={preferences.activity_interests.join(', ')} />
            <ToggleRow icon="📸" label="Instagrammable spots" prefKey="instagrammable_spots"
              preferences={preferences} updatePreference={updatePreference} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>BUDGET</Text>
          <View style={styles.card}>
            <PrefRow icon="💰" label="Budget sensitivity" value={preferences.budget_sensitivity} />
            <PrefRow icon="🔔" label="Price alert threshold"
              value={`${preferences.currency} ${preferences.price_alert_threshold} drop`} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
          <View style={styles.card}>
            <ToggleRow icon="📉" label="Price drop alerts" prefKey="price_drop_alerts"
              preferences={preferences} updatePreference={updatePreference} />
            <ToggleRow icon="🌤️" label="Best time to go alerts" prefKey="best_time_alerts"
              preferences={preferences} updatePreference={updatePreference} />
            <ToggleRow icon="💡" label="Trip inspiration" prefKey="trip_inspiration"
              preferences={preferences} updatePreference={updatePreference} />
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