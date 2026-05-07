import {
  View, Text, StyleSheet, SafeAreaView, StatusBar,
  TouchableOpacity, ScrollView
} from 'react-native';
import { colors } from '../theme/colors';

const COMING_SOON = [
  { icon: '🗺️', title: 'Personalised destinations', desc: 'Aria learns your taste and surfaces places you\'ll love — before you think to ask.' },
  { icon: '📅', title: 'Best time to go', desc: 'For every destination on your wishlist, Aria tells you the ideal travel window based on weather, crowds, and price.' },
  { icon: '💸', title: 'Hidden deal alerts', desc: 'Aria monitors fares and flags genuinely good deals — not just sales, but the right trip at the right price for you.' },
  { icon: '🍽️', title: 'Local insider guides', desc: 'Restaurants, bars, walks, and experiences curated by Aria based on what you actually enjoy.' },
];

export default function IdeasScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Ideas</Text>
          <Text style={styles.sub}>Coming in the next update</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.hero}>
          <Text style={styles.heroIcon}>✦</Text>
          <Text style={styles.heroTitle}>Travel inspiration,{'\n'}curated for you</Text>
          <Text style={styles.heroDesc}>
            Aria will surface destination ideas based on your taste, past trips, and the best times to go. Here's what's coming.
          </Text>
        </View>

        {COMING_SOON.map((item, i) => (
          <View key={i} style={styles.featureCard}>
            <View style={styles.featureIconWrap}>
              <Text style={styles.featureIcon}>{item.icon}</Text>
            </View>
            <View style={styles.featureBody}>
              <Text style={styles.featureTitle}>{item.title}</Text>
              <Text style={styles.featureDesc}>{item.desc}</Text>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.notifyBtn} activeOpacity={0.75}>
          <Text style={styles.notifyBtnText}>NOTIFY ME WHEN LIVE</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
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

  scroll: { flex: 1 },

  hero: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 16,
  },
  heroIcon: {
    fontSize: 28,
    color: colors.primary,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 10,
  },
  heroDesc: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  featureCard: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.border,
  },

  featureIconWrap: {
    width: 40, height: 40,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureIcon: { fontSize: 18 },

  featureBody: { flex: 1 },
  featureTitle: {
    fontSize: 14, fontWeight: '500',
    color: colors.text, marginBottom: 4,
  },
  featureDesc: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },

  notifyBtn: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 14,
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  notifyBtnText: {
    fontSize: 11, fontWeight: '500',
    color: colors.white, letterSpacing: 1.5,
  },
});