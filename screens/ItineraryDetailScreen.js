import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, StatusBar,
  ScrollView, FlatList, TouchableOpacity, Image, Linking,
  useWindowDimensions,
} from 'react-native';
import { colors } from '../theme/colors';
import { useApp } from '../context/AppContext';

const BACKEND = 'https://aria-travel-production.up.railway.app';

function PhotoCarousel({ photos }) {
  const { width } = useWindowDimensions();
  const [activeIdx, setActiveIdx] = useState(0);
  const height = 160;

  if (!photos?.length) return null;

  return (
    <View style={{ marginHorizontal: -20, marginTop: 8 }}>
      <FlatList
        data={photos}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item: uri }) => (
          <Image source={{ uri }} style={{ width, height }} resizeMode="cover" />
        )}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onScroll={e => setActiveIdx(Math.round(e.nativeEvent.contentOffset.x / width))}
        scrollEventThrottle={16}
        style={{ width, height }}
      />
      {photos.length > 1 && (
        <View style={s.dots}>
          {photos.map((_, i) => (
            <View key={i} style={[s.dot, i === activeIdx && s.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

export default function ItineraryDetailScreen({ route, navigation }) {
  const { day, dayIndex, destination, country, accentColor = colors.primary, itineraryId } = route.params;
  const { updateItineraryDay } = useApp();

  const slots = day?.slots || [];
  const accent = accentColor || colors.primary;

  // slotPhotos: { [slotIndex]: string[] } — fetched from Google for slots without photos
  const [slotPhotos, setSlotPhotos] = useState({});

  useEffect(() => {
    const slotsToEnrich = slots
      .map((slot, i) => ({ slot, i }))
      .filter(({ slot }) => !slot.photos?.length && !slot.photo_url);

    if (slotsToEnrich.length === 0) return;

    let cancelled = false;

    Promise.all(
      slotsToEnrich.map(async ({ slot, i }) => {
        try {
          const query = encodeURIComponent(slot.location || slot.activity || '');
          const city = encodeURIComponent(destination || '');
          const res = await fetch(`${BACKEND}/activity-photos?activity=${query}&city=${city}`);
          const data = await res.json();
          return { i, photos: data.photos || [] };
        } catch {
          return { i, photos: [] };
        }
      })
    ).then(results => {
      if (cancelled) return;

      const photoMap = {};
      results.forEach(({ i, photos }) => {
        if (photos.length > 0) photoMap[i] = photos;
      });

      if (Object.keys(photoMap).length === 0) return;

      setSlotPhotos(photoMap);

      // Persist back so they load instantly next time
      if (itineraryId != null && dayIndex != null) {
        const updatedSlots = slots.map((slot, i) =>
          photoMap[i]
            ? { ...slot, photos: photoMap[i], photo_url: photoMap[i][0] }
            : slot
        );
        updateItineraryDay(itineraryId, dayIndex, updatedSlots);
      }
    });

    return () => { cancelled = true; };
  }, []);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />

      <View style={[s.header, { borderBottomColor: accent + '44' }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerCity}>{destination}</Text>
          <Text style={s.headerDay}>{day?.date_label || `Day ${(dayIndex ?? 0) + 1}`}</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {day?.summary ? (
        <View style={[s.summaryBar, { backgroundColor: accent + '18' }]}>
          <View style={[s.summaryDot, { backgroundColor: accent }]} />
          <Text style={[s.summaryText, { color: accent }]}>{day.summary}</Text>
        </View>
      ) : null}

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {slots.length === 0 ? (
          <Text style={s.emptyText}>No activities planned for this day.</Text>
        ) : (
          slots.map((slot, i) => {
            const isRestaurant = slot.slot_type === 'restaurant';
            const photos = slot.photos?.length > 0
              ? slot.photos
              : slotPhotos[i]?.length > 0
                ? slotPhotos[i]
                : slot.photo_url ? [slot.photo_url] : [];

            return (
              <View key={i}>
                {i > 0 && <View style={s.divider} />}

                {photos.length > 0 ? <PhotoCarousel photos={photos} /> : null}

                <View style={s.slotRow}>
                  <View style={s.timeCol}>
                    <Text style={[s.timeStart, { color: accent }]}>{slot.time}</Text>
                    {slot.end_time ? <Text style={s.timeEnd}>{slot.end_time}</Text> : null}
                  </View>
                  <View style={[s.timeLine, { backgroundColor: accent + '55' }]} />
                  <View style={s.actCol}>
                    <Text style={s.actName}>{slot.activity}</Text>

                    {isRestaurant && (slot.rating != null || slot.price) ? (
                      <View style={s.restaurantMetaRow}>
                        {slot.rating != null ? (
                          <Text style={s.restaurantRating}>
                            ★ {slot.rating}{slot.review_count ? ` (${slot.review_count})` : ''}
                          </Text>
                        ) : null}
                        {slot.price ? (
                          <Text style={s.restaurantPrice}>{slot.price}</Text>
                        ) : null}
                      </View>
                    ) : null}

                    {isRestaurant && slot.cuisine ? (
                      <Text style={s.restaurantCuisine}>{slot.cuisine}</Text>
                    ) : null}

                    {isRestaurant && slot.description ? (
                      <Text style={s.restaurantDescription}>{slot.description}</Text>
                    ) : null}

                    {!isRestaurant && slot.location ? (
                      <Text style={s.actLocation}>{slot.location}</Text>
                    ) : null}

                    {slot.notes ? (
                      <Text style={s.actNotes}>{slot.notes}</Text>
                    ) : null}

                    {isRestaurant && slot.opentable_url ? (
                      <TouchableOpacity
                        style={s.reserveBtn}
                        onPress={() => Linking.openURL(slot.opentable_url)}
                        activeOpacity={0.8}
                      >
                        <Text style={s.reserveBtnText}>RESERVE ON OPENTABLE</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.ariaBtn, { borderColor: accent }]}
          onPress={() => navigation.navigate('Main', {
            screen: 'Planning',
            params: {
              initialPrompt: `I'd like to adjust ${day?.date_label || 'a day'} of my ${destination} itinerary.`,
              planCity: destination,
            },
          })}
        >
          <Text style={[s.ariaBtnText, { color: accent }]}>ADJUST WITH ARIA ✈</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5,
    backgroundColor: colors.surface,
  },
  backBtn: { paddingVertical: 4, paddingRight: 12, width: 60 },
  backText: { fontSize: 16, color: colors.text },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerCity: { fontSize: 16, fontWeight: '600', color: colors.text },
  headerDay: { fontSize: 11, color: colors.textMuted, marginTop: 1, letterSpacing: 0.3 },

  summaryBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  summaryDot: { width: 6, height: 6, borderRadius: 3 },
  summaryText: { fontSize: 13, fontWeight: '500' },

  scroll: { flex: 1 },
  scrollContent: { paddingTop: 8, paddingHorizontal: 20 },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 72,
  },

  slotRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    gap: 0,
  },

  timeCol: {
    width: 52,
    alignItems: 'flex-start',
    paddingTop: 2,
  },
  timeStart: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  timeEnd: {
    fontSize: 11,
    color: colors.textDim,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },

  timeLine: {
    width: 1.5,
    alignSelf: 'stretch',
    marginHorizontal: 10,
    borderRadius: 1,
    minHeight: 20,
  },

  actCol: { flex: 1, gap: 3 },
  actName: { fontSize: 15, fontWeight: '500', color: colors.text, lineHeight: 20 },
  actLocation: { fontSize: 12, color: colors.textMuted },
  actNotes: { fontSize: 12, color: colors.textDim, fontStyle: 'italic', marginTop: 2 },

  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 20, gap: 5 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 14, borderRadius: 3 },

  restaurantMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  restaurantRating: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  restaurantPrice: {
    fontSize: 12,
    color: colors.textMuted,
  },
  restaurantCuisine: {
    fontSize: 12,
    color: colors.textDim,
    fontStyle: 'italic',
  },
  restaurantDescription: {
    fontSize: 12,
    color: colors.textDim,
    lineHeight: 18,
    marginTop: 2,
  },

  reserveBtn: {
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: 8, paddingVertical: 9, alignItems: 'center',
  },
  reserveBtnText: { fontSize: 11, fontWeight: '600', color: colors.white, letterSpacing: 1 },

  emptyText: { textAlign: 'center', color: colors.textDim, fontSize: 14, marginTop: 40 },

  footer: {
    padding: 16,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  ariaBtn: {
    borderWidth: 1, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  ariaBtnText: { fontSize: 11, fontWeight: '600', letterSpacing: 1.2 },
});
