import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, StatusBar,
  ScrollView, TouchableOpacity, TextInput, Modal,
  KeyboardAvoidingView, Platform, ImageBackground,
  LayoutAnimation, UIManager, FlatList, Image, useWindowDimensions,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { colors } from '../theme/colors';
import { useApp } from '../context/AppContext';

// ─── Hotel photo strip ────────────────────────────────────────────────────────

function HotelPhotoStrip({ photos }) {
  const { width } = useWindowDimensions();
  // Card has 16px padding each side + screen has ~16px margin each side = ~64px total
  const gap = 5;
  const photoWidth = (width - 64 - gap * 2) / 3;

  if (!photos?.length) return null;

  return (
    <FlatList
      data={photos}
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={photoWidth + gap}
      decelerationRate="fast"
      keyExtractor={(_, i) => String(i)}
      renderItem={({ item: uri }) => (
        <Image
          source={{ uri }}
          style={{ width: photoWidth, height: 86, borderRadius: 8, marginRight: gap }}
          resizeMode="cover"
        />
      )}
      style={{ marginBottom: 12 }}
    />
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// flight_info may be a legacy direct object or { outbound, return }
function getOutbound(flight_info) {
  if (!flight_info) return null;
  return flight_info.outbound || flight_info;
}
function getReturnFlight(flight_info) {
  if (!flight_info) return null;
  return flight_info.return || null;
}

function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function fmtDuration(mins) {
  if (!mins) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m > 0 ? ` ${m}m` : ''}`;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SEASONS = ['Winter','Spring','Summer','Autumn'];

const TAGS = [
  { type: 'explore', label: 'Exploring',        color: colors.pink    },
  { type: 'alert',   label: 'Alert set',         color: colors.primary },
  { type: 'ready',   label: 'Itinerary ready',   color: colors.accent  },
];

// ─── Window Picker ────────────────────────────────────────────────────────────

function WindowPicker({ value, onSelect }) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const years = [currentYear, currentYear + 1, currentYear + 2, currentYear + 3];

  function getInitYear() {
    if (!value || value === 'Flexible') return null;
    const m = value.match(/\d{4}/);
    return m ? parseInt(m[0]) : null;
  }

  const [selYear, setSelYear] = useState(getInitYear);

  if (!selYear) {
    return (
      <View>
        <TouchableOpacity
          style={[wp.chip, value === 'Flexible' && wp.chipSel]}
          onPress={() => onSelect('Flexible')}
        >
          <Text style={[wp.chipText, value === 'Flexible' && wp.chipTextSel]}>Flexible</Text>
        </TouchableOpacity>
        <Text style={wp.sectionLabel}>SELECT YEAR</Text>
        <View style={{ gap: 8, marginTop: 4 }}>
          {years.map(y => (
            <TouchableOpacity key={y} style={wp.yearBtn} onPress={() => setSelYear(y)}>
              <Text style={wp.yearBtnText}>{y}</Text>
              <Text style={wp.yearArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  const months = Array.from({ length: 24 }, (_, i) => {
    const d = new Date(selYear, i, 1);
    return `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
  });
  const seasons = [];
  for (let y = selYear; y <= selYear + 1; y++) {
    SEASONS.forEach(s => seasons.push(`${s} ${y}`));
  }

  return (
    <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={wp.backBtn} onPress={() => setSelYear(null)}>
        <Text style={wp.backBtnText}>‹  {selYear} – {selYear + 1}</Text>
      </TouchableOpacity>
      <Text style={wp.sectionLabel}>MONTHS</Text>
      <View style={wp.grid}>
        {months.map(m => (
          <TouchableOpacity key={m} style={[wp.chip, value === m && wp.chipSel]} onPress={() => onSelect(m)}>
            <Text style={[wp.chipText, value === m && wp.chipTextSel]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={wp.sectionLabel}>SEASONS</Text>
      <View style={wp.grid}>
        {seasons.map(s => (
          <TouchableOpacity key={s} style={[wp.chip, value === s && wp.chipSel]} onPress={() => onSelect(s)}>
            <Text style={[wp.chipText, value === s && wp.chipTextSel]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ height: 8 }} />
    </ScrollView>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

const BACKEND = 'https://aria-travel-production.up.railway.app';

export default function WishlistDetailScreen({ route, navigation }) {
  const { item: initial, accentColor } = route.params;
  const { updateWishlistItem, removeFromWishlist, itineraries } = useApp();

  const [item, setItem] = useState(initial);
  const [itiExpanded, setItiExpanded] = useState(false);

  // Fetch Google photos for the hotel if we only have one (or none)
  useEffect(() => {
    const hi = item.hotel_info;
    if (!hi?.name) return;
    if ((hi.photos?.length ?? 0) >= 2) return; // already enriched

    fetch(`${BACKEND}/hotel-photos?name=${encodeURIComponent(hi.name)}&city=${encodeURIComponent(item.city || '')}`)
      .then(r => r.json())
      .then(data => {
        if (data.photos?.length > 0) {
          const updated = { ...hi, photos: data.photos };
          setItem(prev => ({ ...prev, hotel_info: updated }));
          updateWishlistItem(item.id, { hotel_info: updated });
        }
      })
      .catch(() => {});
  }, [item.hotel_info?.name]);

  const itinerary = itineraries.find(i => {
    const norm = s => (s || '').toLowerCase().trim();
    return (
      norm(i.city) === norm(item.city) ||
      norm(i.city.split(',')[0]) === norm(item.city.split(',')[0]) ||
      i.wishlist_item_id === item.id
    );
  }) || null;
  const [notes, setNotes] = useState(initial.notes || '');
  const [showWindowModal, setShowWindowModal] = useState(false);

  function save(updates) {
    const merged = { ...item, ...updates };
    setItem(merged);
    updateWishlistItem(item.id, updates);
  }

  function handleWindowSelect(window) {
    save({ travel_window: window, when: window || 'No date set' });
    setShowWindowModal(false);
  }

  function handleDelete() {
    removeFromWishlist(item.id);
    navigation.goBack();
  }

  const tagDef = TAGS.find(t => t.type === item.tagType) || TAGS[0];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.removeBtn} onPress={handleDelete}>
          <Text style={s.removeText}>Remove</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Hero tile */}
        <ImageBackground
          source={item.photo_url ? { uri: item.photo_url } : undefined}
          style={s.hero}
          resizeMode="cover"
        >
          <View style={[s.heroOverlay, { backgroundColor: accentColor + '55' }]} />
          <View style={[s.heroOverlay, { backgroundColor: 'rgba(0,0,0,0.38)' }]} />
          <View style={s.heroBody}>
            <View style={s.heroTop}>
              <View style={{ flex: 1 }}>
                <Text style={s.heroCity}>{item.city}</Text>
                <Text style={s.heroCountry}>{item.country.toUpperCase()}</Text>
              </View>
              <Text style={s.heroFlag}>{item.flag}</Text>
            </View>
            <View style={s.heroBottom}>
              <Text style={s.heroWhen}>{item.travel_window || 'No date set'}</Text>
              <View style={[s.tagBadge, { borderColor: tagDef.color }]}>
                <Text style={[s.tagBadgeText, { color: tagDef.color }]}>
                  {item.tag.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        </ImageBackground>

        {/* When */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>WHEN</Text>
            <TouchableOpacity onPress={() => setShowWindowModal(true)}>
              <Text style={[s.cardAction, { color: accentColor }]}>Edit</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.cardValue}>
            {item.travel_window || 'No date set'}
          </Text>
        </View>

        {/* Indicative flights */}
        {item.flight_info && (() => {
          const outbound = getOutbound(item.flight_info);
          const returnFlight = getReturnFlight(item.flight_info);
          return (
            <View style={s.card}>
              <Text style={[s.cardTitle, { marginBottom: 12 }]}>INDICATIVE FLIGHTS</Text>

              {/* Outbound leg */}
              <Text style={s.flightLegLabel}>OUTBOUND</Text>
              <View style={s.flightHeader}>
                <Text style={s.flightAirline}>{outbound.airline}</Text>
                <Text style={s.flightNum}>{outbound.flight_number}</Text>
                {outbound.stops === 0
                  ? <Text style={s.flightDirect}>Direct</Text>
                  : <Text style={s.flightDirect}>{outbound.stops} stop</Text>
                }
              </View>
              <View style={s.flightLeg}>
                <View style={s.flightEndpoint}>
                  <Text style={s.flightCode}>{outbound.origin}</Text>
                  <Text style={s.flightTime}>{fmtTime(outbound.departure)}</Text>
                  <Text style={s.flightDate}>{fmtDate(outbound.departure)}</Text>
                </View>
                <View style={s.flightMiddle}>
                  <Text style={s.flightDur}>{fmtDuration(outbound.duration_minutes)}</Text>
                  <View style={s.flightLine} />
                </View>
                <View style={[s.flightEndpoint, { alignItems: 'flex-end' }]}>
                  <Text style={s.flightCode}>{outbound.destination}</Text>
                  <Text style={s.flightTime}>{fmtTime(outbound.arrival)}</Text>
                  <Text style={s.flightDate}>{fmtDate(outbound.arrival)}</Text>
                </View>
              </View>
              <View style={s.flightPriceRow}>
                <Text style={s.flightPrice}>
                  {outbound.currency} {outbound.price_per_person}
                  <Text style={s.flightPriceSub}>/person</Text>
                </Text>
                {outbound.total_price !== outbound.price_per_person && (
                  <Text style={s.flightTotal}>
                    {outbound.currency} {outbound.total_price} total
                  </Text>
                )}
              </View>
              <Text style={s.flightMeta}>
                {[outbound.cabin_class, outbound.baggage_included ? 'Baggage included' : 'Carry-on only', outbound.refundable ? 'Refundable' : null].filter(Boolean).join(' · ')}
              </Text>

              {/* Return leg */}
              {returnFlight && (
                <>
                  <View style={s.flightDivider} />
                  <Text style={s.flightLegLabel}>RETURN</Text>
                  <View style={s.flightHeader}>
                    <Text style={s.flightAirline}>{returnFlight.airline}</Text>
                    <Text style={s.flightNum}>{returnFlight.flight_number}</Text>
                    {returnFlight.stops === 0
                      ? <Text style={s.flightDirect}>Direct</Text>
                      : <Text style={s.flightDirect}>{returnFlight.stops} stop</Text>
                    }
                  </View>
                  <View style={s.flightLeg}>
                    <View style={s.flightEndpoint}>
                      <Text style={s.flightCode}>{returnFlight.origin}</Text>
                      <Text style={s.flightTime}>{fmtTime(returnFlight.departure)}</Text>
                      <Text style={s.flightDate}>{fmtDate(returnFlight.departure)}</Text>
                    </View>
                    <View style={s.flightMiddle}>
                      <Text style={s.flightDur}>{fmtDuration(returnFlight.duration_minutes)}</Text>
                      <View style={s.flightLine} />
                    </View>
                    <View style={[s.flightEndpoint, { alignItems: 'flex-end' }]}>
                      <Text style={s.flightCode}>{returnFlight.destination}</Text>
                      <Text style={s.flightTime}>{fmtTime(returnFlight.arrival)}</Text>
                      <Text style={s.flightDate}>{fmtDate(returnFlight.arrival)}</Text>
                    </View>
                  </View>
                  <View style={s.flightPriceRow}>
                    <Text style={s.flightPrice}>
                      {returnFlight.currency} {returnFlight.price_per_person}
                      <Text style={s.flightPriceSub}>/person</Text>
                    </Text>
                    {returnFlight.total_price !== returnFlight.price_per_person && (
                      <Text style={s.flightTotal}>
                        {returnFlight.currency} {returnFlight.total_price} total
                      </Text>
                    )}
                  </View>
                  <Text style={s.flightMeta}>
                    {[returnFlight.cabin_class, returnFlight.baggage_included ? 'Baggage included' : 'Carry-on only', returnFlight.refundable ? 'Refundable' : null].filter(Boolean).join(' · ')}
                  </Text>
                </>
              )}
            </View>
          );
        })()}

        {/* Hotel info */}
        {item.hotel_info && (
          <View style={s.card}>
            <Text style={[s.cardTitle, { marginBottom: 12 }]}>HOTEL</Text>

            <HotelPhotoStrip
              photos={item.hotel_info.photos?.length > 0
                ? item.hotel_info.photos
                : item.hotel_info.photo_url ? [item.hotel_info.photo_url] : []}
            />

            <View style={s.hotelHeader}>
              <Text style={s.hotelName}>{item.hotel_info.name}</Text>
              {item.hotel_info.stars ? (
                <Text style={s.hotelStars}>{'★'.repeat(Math.min(item.hotel_info.stars, 5))}</Text>
              ) : null}
            </View>

            {(item.hotel_info.per_night || item.hotel_info.total) ? (
              <View style={s.hotelPriceRow}>
                {item.hotel_info.per_night ? (
                  <Text style={s.hotelPrice}>
                    {item.hotel_info.currency} {item.hotel_info.per_night}
                    <Text style={s.hotelPriceSub}>/night</Text>
                  </Text>
                ) : null}
                {item.hotel_info.total ? (
                  <Text style={s.hotelTotal}>
                    {item.hotel_info.currency} {item.hotel_info.total} total
                    {item.hotel_info.nights ? ` · ${item.hotel_info.nights} nights` : ''}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {(item.hotel_info.room_name || item.hotel_info.board) ? (
              <Text style={s.hotelMeta}>
                {[item.hotel_info.room_name, item.hotel_info.board].filter(Boolean).join(' · ')}
              </Text>
            ) : null}

            {/* Total trip cost */}
            {item.flight_info && item.hotel_info?.total ? (() => {
              const ob = getOutbound(item.flight_info);
              const ret = getReturnFlight(item.flight_info);
              const flightTotal = (ob?.total_price || 0) + (ret?.total_price || 0);
              if (!flightTotal) return null;
              return (
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>ESTIMATED TRIP TOTAL</Text>
                  <Text style={s.totalValue}>
                    {item.hotel_info.currency} {Math.round(flightTotal + item.hotel_info.total).toLocaleString()}
                  </Text>
                </View>
              );
            })() : null}
          </View>
        )}

        {/* Itinerary */}
        <View style={s.card}>
          <TouchableOpacity
            style={s.cardHeader}
            onPress={() => {
              if (itinerary?.structured_days?.length > 0) {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setItiExpanded(v => !v);
              }
            }}
            activeOpacity={itinerary?.structured_days?.length > 0 ? 0.7 : 1}
          >
            <Text style={s.cardTitle}>ITINERARY</Text>
            {itinerary?.structured_days?.length > 0 && (
              <Text style={[s.cardAction, { color: accentColor }]}>
                {itiExpanded ? 'Collapse' : `${itinerary.structured_days.length} days planned`}
              </Text>
            )}
          </TouchableOpacity>

          {!itinerary ? (
            <TouchableOpacity
              style={[s.planBtn, { borderColor: accentColor }]}
              onPress={() => navigation.navigate('Main', {
                screen: 'Planning',
                params: {
                  initialPrompt: `Plan a detailed day-by-day itinerary for my ${item.city} trip${item.travel_window ? ` in ${item.travel_window}` : ''}.`,
                  planCity: item.city,
                },
              })}
            >
              <Text style={[s.planBtnText, { color: accentColor }]}>PLAN YOUR DAYS NOW</Text>
            </TouchableOpacity>
          ) : itiExpanded ? (
            <View style={s.itiDayList}>
              {(itinerary.structured_days || []).map((day, dayIdx) => (
                <TouchableOpacity
                  key={dayIdx}
                  style={s.itiDayRow}
                  activeOpacity={0.75}
                  onPress={() => navigation.navigate('ItineraryDetail', {
                    day,
                    dayIndex: dayIdx,
                    itineraryId: itinerary.id,
                    destination: item.city,
                    country: item.country,
                    accentColor,
                  })}
                >
                  <View style={[s.itiDayDot, { backgroundColor: accentColor }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.itiDayLabel}>{day.date_label || `Day ${dayIdx + 1}`}</Text>
                    {day.summary ? <Text style={s.itiDaySummary}>{day.summary}</Text> : null}
                  </View>
                  <Text style={[s.itiDayArrow, { color: accentColor }]}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>

        {/* Status */}
        <View style={s.card}>
          <Text style={[s.cardTitle, { marginBottom: 12 }]}>STATUS</Text>
          <View style={s.tagRow}>
            {TAGS.map(t => {
              const active = item.tagType === t.type;
              return (
                <TouchableOpacity
                  key={t.type}
                  style={[s.tagBtn, { borderColor: active ? t.color : colors.border },
                    active && { backgroundColor: t.color + '1A' }]}
                  onPress={() => save({ tagType: t.type, tag: t.label })}
                >
                  <Text style={[s.tagBtnText, { color: active ? t.color : colors.textMuted }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Notes */}
        <View style={s.card}>
          <Text style={[s.cardTitle, { marginBottom: 12 }]}>NOTES</Text>
          <TextInput
            style={s.notesInput}
            value={notes}
            onChangeText={setNotes}
            onBlur={() => save({ notes })}
            placeholder="Add notes about this destination..."
            placeholderTextColor={colors.textDim}
            color={colors.text}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Plan with Aria */}
        <TouchableOpacity
          style={[s.ariaBtn, { borderColor: accentColor }]}
          onPress={() => {
            const hasFlights = !!item.flight_info;
            const hasHotel = !!item.hotel_info;
            const hasItinerary = !!itinerary;
            let initialPrompt;
            if (hasFlights && hasHotel && hasItinerary) {
              initialPrompt = `I want to add restaurants to my ${item.city} itinerary. Can you find some great options?`;
            } else if (hasFlights && hasHotel) {
              initialPrompt = `My flights and hotel for ${item.city} are all set${item.travel_window ? ` for ${item.travel_window}` : ''}. Please build me a day-by-day itinerary.`;
            } else if (hasFlights) {
              initialPrompt = `I've got my flights to ${item.city} booked${item.travel_window ? ` for ${item.travel_window}` : ''}. Now help me find a hotel.`;
            } else if (item.travel_window) {
              initialPrompt = `I want to plan my ${item.city} trip for ${item.travel_window}. Help me through flights and accommodation.`;
            } else {
              initialPrompt = `I want to plan my trip to ${item.city}. When would you recommend going, and how long should I stay?`;
            }
            navigation.navigate('Main', {
              screen: 'Planning',
              params: { initialPrompt, planCity: item.city },
            });
          }}
        >
          <Text style={[s.ariaBtnText, { color: accentColor }]}>PLAN WITH ARIA ✈</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Window Modal */}
      <Modal
        visible={showWindowModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowWindowModal(false)}
      >
        <View style={m.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={m.sheet}
          >
            <View style={m.handle} />
            <Text style={m.title}>Travel Window</Text>
            <WindowPicker value={item.travel_window} onSelect={handleWindowSelect} />
            <TouchableOpacity style={m.cancelBtn} onPress={() => setShowWindowModal(false)}>
              <Text style={m.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  backBtn: { paddingVertical: 4, paddingRight: 12 },
  backText: { fontSize: 16, color: colors.text },
  removeBtn: { paddingVertical: 4, paddingLeft: 12 },
  removeText: { fontSize: 14, color: '#C0392B' },

  hero: {
    minHeight: 130,
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: colors.surface,
    borderRadius: 12, overflow: 'hidden',
    borderWidth: 0.5, borderColor: colors.border,
  },
  heroOverlay: { ...StyleSheet.absoluteFillObject },
  heroBody: { flex: 1, padding: 16, justifyContent: 'space-between' },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start' },
  heroCity: { fontSize: 24, fontWeight: '600', color: colors.text },
  heroCountry: { fontSize: 10, color: colors.textMuted, marginTop: 3, letterSpacing: 0.5 },
  heroFlag: { fontSize: 32 },
  heroBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  heroWhen: { fontSize: 12, color: colors.textMuted },
  tagBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 2 },
  tagBadgeText: { fontSize: 9, fontWeight: '500', letterSpacing: 1 },

  card: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: colors.surface, borderRadius: 12, padding: 16,
    borderWidth: 0.5, borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 10, fontWeight: '600', letterSpacing: 1.2, color: colors.textMuted },
  cardAction: { fontSize: 13, fontWeight: '500' },
  cardValue: { fontSize: 15, color: colors.text },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagBtn: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  tagBtnText: { fontSize: 13, fontWeight: '500' },

  notesInput: {
    backgroundColor: colors.surfaceDeep,
    borderWidth: 0.5, borderColor: colors.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, minHeight: 80,
  },

  flightHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  flightAirline: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 },
  flightNum: { fontSize: 12, color: colors.textMuted },
  flightDirect: { fontSize: 11, color: colors.accent, fontWeight: '500' },
  flightLeg: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  flightEndpoint: { width: 68 },
  flightCode: { fontSize: 20, fontWeight: '700', color: colors.text },
  flightTime: { fontSize: 15, fontWeight: '500', color: colors.text, marginTop: 2 },
  flightDate: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  flightMiddle: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: 8 },
  flightDur: { fontSize: 11, color: colors.textDim },
  flightLine: { height: 1, width: '100%', backgroundColor: colors.border },
  flightPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12, marginBottom: 6 },
  flightPrice: { fontSize: 17, fontWeight: '700', color: colors.accent },
  flightPriceSub: { fontSize: 12, fontWeight: '400', color: colors.textMuted },
  flightTotal: { fontSize: 12, color: colors.textMuted },
  flightMeta: { fontSize: 11, color: colors.textDim },
  flightLegLabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8, marginBottom: 8 },
  flightDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 14 },

  hotelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  hotelName: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  hotelStars: { fontSize: 12, color: colors.accent, letterSpacing: 1 },
  hotelPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12, marginBottom: 6 },
  hotelPrice: { fontSize: 17, fontWeight: '700', color: colors.accent },
  hotelPriceSub: { fontSize: 12, fontWeight: '400', color: colors.textMuted },
  hotelTotal: { fontSize: 12, color: colors.textMuted },
  hotelMeta: { fontSize: 11, color: colors.textDim },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 14, paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
  totalLabel: { fontSize: 9, fontWeight: '700', color: colors.textMuted, letterSpacing: 1.2 },
  totalValue: { fontSize: 18, fontWeight: '700', color: colors.text },

  planBtn: {
    borderWidth: 1, borderRadius: 8,
    paddingVertical: 12, alignItems: 'center', marginTop: 4,
  },
  planBtnText: { fontSize: 11, fontWeight: '600', letterSpacing: 1.2 },

  itiDayList: { gap: 0 },
  itiDayRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
  itiDayDot: { width: 7, height: 7, borderRadius: 4 },
  itiDayLabel: { fontSize: 13, fontWeight: '500', color: colors.text },
  itiDaySummary: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  itiDayArrow: { fontSize: 18 },

  ariaBtn: {
    marginHorizontal: 16, marginTop: 12,
    borderWidth: 1, borderRadius: 10,
    paddingVertical: 13, alignItems: 'center',
  },
  ariaBtnText: { fontSize: 11, fontWeight: '600', letterSpacing: 1.2 },
});

const wp = StyleSheet.create({
  sectionLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 1.2, color: colors.textMuted, marginTop: 14, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: colors.surfaceDeep, borderWidth: 0.5, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  chipSel: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text },
  chipTextSel: { color: colors.white, fontWeight: '500' },
  yearBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surfaceDeep, borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14,
  },
  yearBtnText: { fontSize: 18, fontWeight: '500', color: colors.text },
  yearArrow: { fontSize: 16, color: colors.textDim },
  backBtn: { paddingVertical: 8, paddingBottom: 4 },
  backBtnText: { fontSize: 14, color: colors.primary, fontWeight: '500' },
});

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 16, fontWeight: '500', color: colors.text, marginBottom: 14 },
  cancelBtn: {
    marginTop: 16, paddingVertical: 12, alignItems: 'center',
    borderRadius: 10, borderWidth: 0.5, borderColor: colors.border,
  },
  cancelText: { fontSize: 14, color: colors.textMuted },
});
