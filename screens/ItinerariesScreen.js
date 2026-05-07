import {
  View, Text, StyleSheet, SafeAreaView, StatusBar,
  ScrollView, TouchableOpacity
} from 'react-native';
import { colors } from '../theme/colors';

const ITINERARIES = [
  {
    id: '1',
    city: 'Madrid',
    country: 'Spain',
    status: 'Upcoming',
    dates: 'May 9 – 12 · 4 days · Solo',
    month: 'May 2026',
    days: ['Day 1', 'Day 2', 'Day 3', 'Day 4'],
    color: colors.primaryDark,
    accent: colors.primary,
  },
  {
    id: '2',
    city: 'Rome',
    country: 'Italy',
    status: 'Planned',
    dates: 'June 20 – 24 · 4 days · Solo',
    month: 'June 2026',
    days: ['Day 1', 'Day 2', 'Day 3', 'Day 4'],
    color: '#085041',
    accent: colors.accent,
  },
];

export default function ItinerariesScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Itineraries</Text>
          <Text style={styles.sub}>Upcoming & planned trips</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {ITINERARIES.map(item => (
          <TouchableOpacity key={item.id} style={styles.card} activeOpacity={0.75}>

            <View style={[styles.cardTop, { backgroundColor: item.color }]}>
              <View style={[styles.accentLine, { backgroundColor: item.accent }]} />
              <View style={styles.cardTopContent}>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                </View>
                <Text style={styles.cardMonth}>{item.month}</Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.cardBodyTop}>
                <View>
                  <Text style={styles.cardCity}>{item.city}</Text>
                  <Text style={styles.cardDates}>{item.dates}</Text>
                </View>
                <TouchableOpacity style={styles.editBtn}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dayRow}>
                {item.days.map((day, i) => (
                  <TouchableOpacity key={i} style={styles.dayPill}>
                    <Text style={styles.dayText}>{day}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.newBtn} activeOpacity={0.7}>
          <Text style={styles.newBtnText}>+ PLAN A NEW TRIP</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  header: {
    padding: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: { fontSize: 22, fontWeight: '500', color: colors.text },
  sub: { fontSize: 11, color: colors.textMuted, marginTop: 2, letterSpacing: 0.5 },

  scroll: { flex: 1, padding: 16 },

  card: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: colors.surface,
  },

  cardTop: {
    height: 72,
    overflow: 'hidden',
  },

  accentLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 2,
  },

  cardTopContent: {
    flex: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },

  statusBadge: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
  },
  statusText: {
    fontSize: 9, fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1.2,
  },

  cardMonth: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5,
  },

  cardBody: {
    padding: 14,
    backgroundColor: colors.surface,
  },

  cardBodyTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  cardCity: { fontSize: 18, fontWeight: '500', color: colors.text },
  cardDates: { fontSize: 11, color: colors.textMuted, marginTop: 3, letterSpacing: 0.3 },

  editBtn: {
    borderWidth: 0.5,
    borderColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 4,
  },
  editBtnText: { fontSize: 11, color: colors.primary, fontWeight: '500' },

  dayRow: {
    flexDirection: 'row',
    gap: 6,
  },

  dayPill: {
    flex: 1,
    paddingVertical: 7,
    backgroundColor: colors.surfaceDeep,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  dayText: { fontSize: 10, color: colors.textMuted, letterSpacing: 0.3 },

  newBtn: {
    borderWidth: 0.5,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  newBtnText: {
    fontSize: 11, fontWeight: '500',
    color: colors.primary, letterSpacing: 1.2,
  },
});