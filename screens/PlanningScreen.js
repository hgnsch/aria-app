import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, StatusBar,
  TextInput, TouchableOpacity, ScrollView, FlatList, Image, KeyboardAvoidingView,
  Platform, ActivityIndicator, Linking,
} from 'react-native';
import { colors } from '../theme/colors';
import { useApp } from '../context/AppContext';

const BACKEND = 'https://aria-travel-production.up.railway.app';

// ─── Markdown renderer ────────────────────────────────────────────────────────

function parseInline(text, baseStyle) {
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  const parts = [];
  let last = 0, key = 0, match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(<Text key={key++} style={baseStyle}>{text.slice(last, match.index)}</Text>);
    if (match[1] !== undefined) parts.push(<Text key={key++} style={[baseStyle, { fontWeight: '700', color: colors.text }]}>{match[1]}</Text>);
    else parts.push(<Text key={key++} style={[baseStyle, { fontStyle: 'italic' }]}>{match[2]}</Text>);
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(<Text key={key++} style={baseStyle}>{text.slice(last)}</Text>);
  return parts;
}

function MarkdownText({ text }) {
  const base = styles.ariaText;
  return (
    <View style={{ gap: 2 }}>
      {text.split('\n').map((line, i) => {
        if (!line.trim()) return <View key={i} style={{ height: 4 }} />;
        if (line.startsWith('### ')) return <Text key={i} style={[base, { fontWeight: '600', fontSize: 14, marginTop: 4 }]}>{parseInline(line.slice(4), base)}</Text>;
        if (line.startsWith('## '))  return <Text key={i} style={[base, { fontWeight: '700', fontSize: 15, marginTop: 6 }]}>{parseInline(line.slice(3), base)}</Text>;
        if (line.startsWith('# '))   return <Text key={i} style={[base, { fontWeight: '700', fontSize: 16, marginTop: 6 }]}>{parseInline(line.slice(2), base)}</Text>;
        if (line.match(/^[-•*] /))   return <Text key={i} style={base}>{'  · '}{parseInline(line.slice(2), base)}</Text>;
        if (line.match(/^\d+\. /)) {
          const num = line.match(/^(\d+)/)[1];
          return <Text key={i} style={base}>{`  ${num}. `}{parseInline(line.replace(/^\d+\. /, ''), base)}</Text>;
        }
        return <Text key={i} style={base}>{parseInline(line, base)}</Text>;
      })}
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractWhyItFits(replyText, hotels) {
  if (!replyText || !hotels?.length) return hotels;
  const matches = [...replyText.matchAll(/Why it fits you:\s*([^\n]+)/gi)];
  if (!matches.length) return hotels;
  return hotels.map((hotel, i) =>
    matches[i] ? { ...hotel, why_it_fits: matches[i][1].trim() } : hotel
  );
}

function hotelIntro(text) {
  // Keep only the intro line(s) before the first "Why it fits you:" line
  const cut = text.search(/Why it fits you:/i);
  const intro = (cut > 0 ? text.slice(0, cut) : text).trim();
  return intro;
}

// ─── Photo carousel ───────────────────────────────────────────────────────────

function PhotoCarousel({ photos, height = 130 }) {
  const [slideWidth, setSlideWidth] = useState(0);
  const [activeIdx, setActiveIdx] = useState(0);
  const hasPhotos = photos?.length > 0;
  const multi = (photos?.length || 0) > 1;

  return (
    <View
      style={{ height: height + (multi ? 20 : 0) }}
      onLayout={e => setSlideWidth(e.nativeEvent.layout.width)}
    >
      <View style={{ height, overflow: 'hidden' }}>
        {!hasPhotos && (
          <View style={{ flex: 1, backgroundColor: colors.surfaceDeep, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 10, color: colors.textDim }}>No photo</Text>
          </View>
        )}
        {hasPhotos && slideWidth > 0 && (
          <FlatList
            data={photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={{ width: slideWidth, height }} resizeMode="cover" />
            )}
            getItemLayout={(_, i) => ({ length: slideWidth, offset: slideWidth * i, index: i })}
            onMomentumScrollEnd={e => {
              if (slideWidth > 0) setActiveIdx(Math.round(e.nativeEvent.contentOffset.x / slideWidth));
            }}
            style={{ width: slideWidth, height }}
          />
        )}
      </View>
      {multi && slideWidth > 0 && (
        <View style={ph.dots}>
          {photos.map((_, i) => (
            <View key={i} style={[ph.dot, i === activeIdx && ph.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const ph = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 20, gap: 5 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 14, borderRadius: 3 },
});

// ─── Date chips ───────────────────────────────────────────────────────────────

function DateChips({ suggestions, onSelect }) {
  const [chosen, setChosen] = useState(null);

  function handlePick(option) {
    if (chosen) return;
    setChosen(option.label);
    onSelect(option);
  }

  return (
    <View style={dc.wrap}>
      {suggestions.options.map((opt, i) => (
        <TouchableOpacity
          key={i}
          style={[dc.chip, chosen === opt.label && dc.chipSel]}
          onPress={() => handlePick(opt)}
          disabled={!!chosen}
          activeOpacity={0.75}
        >
          <Text style={[dc.label, chosen === opt.label && dc.labelSel]}>{opt.label}</Text>
          {opt.note ? <Text style={dc.note}>{opt.note}</Text> : null}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const dc = StyleSheet.create({
  wrap: { gap: 6, marginTop: 2 },
  chip: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  chipSel: { borderColor: colors.primary, backgroundColor: colors.primary + '18' },
  label: { fontSize: 13, color: colors.text, fontWeight: '500' },
  labelSel: { color: colors.primary },
  note: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
});

// ─── Flight time chips ────────────────────────────────────────────────────────

function FlightTimeChips({ options, onSelect }) {
  const [chosen, setChosen] = useState(null);

  const ICONS = { morning: '🌅', daytime: '☀️', evening: '🌆' };

  function handlePick(opt) {
    if (chosen) return;
    setChosen(opt.value);
    onSelect(opt);
  }

  return (
    <View style={ftc.wrap}>
      {options.map((opt, i) => (
        <TouchableOpacity
          key={i}
          style={[ftc.chip, chosen === opt.value && ftc.chipSel]}
          onPress={() => handlePick(opt)}
          disabled={!!chosen}
          activeOpacity={0.75}
        >
          <View style={ftc.row}>
            <Text style={ftc.icon}>{ICONS[opt.value] || '✈️'}</Text>
            <View>
              <Text style={[ftc.label, chosen === opt.value && ftc.labelSel]}>{opt.label}</Text>
              {opt.note ? <Text style={ftc.note}>{opt.note}</Text> : null}
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const ftc = StyleSheet.create({
  wrap: { gap: 6, marginTop: 2 },
  chip: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  chipSel: { borderColor: colors.primary, backgroundColor: colors.primary + '18' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { fontSize: 18 },
  label: { fontSize: 13, color: colors.text, fontWeight: '500' },
  labelSel: { color: colors.primary },
  note: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
});

// ─── Flight cards ─────────────────────────────────────────────────────────────

function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function fmtDur(mins) {
  if (!mins) return '';
  return `${Math.floor(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}m` : ''}`;
}

function FlightCard({ flight, selected, onSelect }) {
  return (
    <TouchableOpacity
      style={[fs.card, selected && fs.cardSel]}
      onPress={onSelect}
      activeOpacity={0.85}
    >
      <View style={fs.topRow}>
        <View style={[fs.radio, selected && fs.radioOn]}>
          {selected && <View style={fs.radioDot} />}
        </View>
        <Text style={fs.airline} numberOfLines={1}>{flight.airline}</Text>
        <Text style={fs.flightNum}>{flight.flight_number}</Text>
        {flight.stops === 0
          ? <View style={fs.directBadge}><Text style={fs.directText}>Direct</Text></View>
          : <Text style={fs.stops}>{flight.stops} stop</Text>
        }
      </View>

      <View style={fs.legRow}>
        <View style={fs.endpoint}>
          <Text style={fs.iata}>{flight.origin}</Text>
          <Text style={fs.time}>{fmtTime(flight.departure)}</Text>
        </View>
        <View style={fs.middle}>
          <Text style={fs.dur}>{fmtDur(flight.duration_minutes)}</Text>
          <View style={fs.line} />
        </View>
        <View style={[fs.endpoint, { alignItems: 'flex-end' }]}>
          <Text style={fs.iata}>{flight.destination}</Text>
          <Text style={fs.time}>{fmtTime(flight.arrival)}</Text>
        </View>
      </View>

      <View style={fs.priceRow}>
        <Text style={fs.price}>
          {flight.currency} {flight.price_per_person}
          <Text style={fs.priceSub}>/person</Text>
        </Text>
        <Text style={fs.meta}>
          {[
            flight.cabin_class,
            flight.baggage_included ? 'Baggage incl.' : 'Carry-on only',
            flight.refundable ? 'Refundable' : null,
          ].filter(Boolean).join(' · ')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function FlightResults({ options, onSave }) {
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    if (selectedIdx === null || saved) return;
    onSave(options.results[selectedIdx]);
    setSaved(true);
  }

  return (
    <View style={fs.block}>
      {options.results.map((flight, i) => (
        <FlightCard
          key={i}
          flight={flight}
          selected={selectedIdx === i}
          onSelect={() => { setSelectedIdx(prev => prev === i ? null : i); setSaved(false); }}
        />
      ))}
      <TouchableOpacity
        style={[fs.saveBtn, (selectedIdx === null || saved) && fs.saveBtnOff]}
        onPress={handleSave}
        disabled={selectedIdx === null || saved}
        activeOpacity={0.8}
      >
        <Text style={fs.saveBtnText}>{saved ? 'FLIGHT SAVED TO TRIP' : 'SAVE TO TRIP'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const fs = StyleSheet.create({
  block: { gap: 8 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12, borderWidth: 0.5, borderColor: colors.border,
    padding: 12, gap: 10,
  },
  cardSel: { borderColor: colors.primary, borderWidth: 1.5 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radio: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  airline: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  flightNum: { fontSize: 11, color: colors.textMuted },
  directBadge: { backgroundColor: colors.accent + '20', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  directText: { fontSize: 10, color: colors.accent, fontWeight: '600' },
  stops: { fontSize: 11, color: colors.textMuted },
  legRow: { flexDirection: 'row', alignItems: 'center' },
  endpoint: { width: 52 },
  iata: { fontSize: 18, fontWeight: '700', color: colors.text },
  time: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  middle: { flex: 1, alignItems: 'center', gap: 3, paddingHorizontal: 8 },
  dur: { fontSize: 10, color: colors.textDim },
  line: { height: 1, width: '100%', backgroundColor: colors.border },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  price: { fontSize: 15, fontWeight: '700', color: colors.accent },
  priceSub: { fontSize: 11, fontWeight: '400', color: colors.textMuted },
  meta: { fontSize: 10, color: colors.textDim, flex: 1, textAlign: 'right' },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  saveBtnOff: { backgroundColor: colors.primaryLight },
  saveBtnText: { fontSize: 11, fontWeight: '600', color: colors.white, letterSpacing: 1 },
});

// ─── Hotel card + results block ───────────────────────────────────────────────

function HotelCard({ hotel, selected, onSelect }) {
  const filledStars = Math.min(Math.round(hotel.stars || 0), 5);
  const starsText = '★'.repeat(filledStars) + '☆'.repeat(5 - filledStars);
  const photos = (hotel.photos || []).filter(Boolean);

  return (
    <View style={[hs.card, selected && hs.cardSelected]}>
      <PhotoCarousel photos={photos} height={120} />

      {/* Info row is the tap target for selection */}
      <TouchableOpacity onPress={onSelect} activeOpacity={0.85}>
        <View style={hs.info}>
          <View style={hs.infoTop}>
            <View style={[hs.radio, selected && hs.radioOn]}>
              {selected && <View style={hs.radioDot} />}
            </View>
            <Text style={hs.hotelName} numberOfLines={1}>{hotel.name}</Text>
            <Text style={hs.stars}>{starsText}</Text>
          </View>

          <View style={hs.infoMeta}>
            {hotel.rating != null && <Text style={hs.rating}>{hotel.rating}/10</Text>}
            {hotel.review_count != null && <Text style={hs.reviews}>({hotel.review_count})</Text>}
            {hotel.cheapest_rate && (
              <Text style={hs.price}>
                {hotel.cheapest_rate.currency} {hotel.cheapest_rate.per_night}/night
              </Text>
            )}
          </View>

          {hotel.cheapest_rate && (
            <Text style={hs.roomLine} numberOfLines={1}>
              {[
                hotel.cheapest_rate.room_name,
                hotel.cheapest_rate.board,
                hotel.cheapest_rate.refundable != null
                  ? (hotel.cheapest_rate.refundable ? 'Refundable' : 'Non-refundable')
                  : null,
              ].filter(Boolean).join(' · ')}
            </Text>
          )}

          {hotel.amenities?.length > 0 && (
            <Text style={hs.amenities} numberOfLines={1}>
              {hotel.amenities.slice(0, 5).join(' · ')}
            </Text>
          )}

          {hotel.why_it_fits && (
            <Text style={hs.whyItFits} numberOfLines={2}>{hotel.why_it_fits}</Text>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

function HotelResults({ hotels, searchParams, onRefresh, onAddToTrip }) {
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [added, setAdded] = useState(false);

  function handleSelect(i) {
    setSelectedIdx(prev => prev === i ? null : i);
    setAdded(false);
  }

  function handleAdd() {
    if (selectedIdx === null || added) return;
    onAddToTrip(hotels[selectedIdx]);
    setAdded(true);
  }

  function handleNewSearch() {
    let msg = 'Show me different hotel options';
    if (searchParams?.location && searchParams?.check_in && searchParams?.check_out) {
      const g = searchParams.guests || 1;
      msg = `Search hotels in ${searchParams.location} from ${searchParams.check_in} to ${searchParams.check_out} for ${g} guest${g !== 1 ? 's' : ''}`;
    }
    onRefresh(msg);
  }

  return (
    <View style={hs.block}>
      {hotels.map((hotel, i) => (
        <HotelCard
          key={hotel.hotel_id || i}
          hotel={hotel}
          selected={selectedIdx === i}
          onSelect={() => handleSelect(i)}
        />
      ))}

      <View style={hs.actions}>
        <TouchableOpacity
          style={[hs.addBtn, (selectedIdx === null || added) && hs.addBtnOff]}
          onPress={handleAdd}
          disabled={selectedIdx === null || added}
          activeOpacity={0.8}
        >
          <Text style={hs.addBtnText}>{added ? 'ADDED TO TRIP' : 'ADD TO TRIP'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={hs.refreshBtn} onPress={handleNewSearch} activeOpacity={0.8}>
          <Text style={hs.refreshBtnText}>NEW SEARCH</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Restaurant cards ─────────────────────────────────────────────────────────

function extractRestaurantWhyItFits(replyText, restaurants) {
  if (!replyText || !restaurants?.length) return restaurants;
  const matches = [...replyText.matchAll(/Why it fits you:\s*([^\n]+)/gi)];
  if (!matches.length) return restaurants;
  return restaurants.map((r, i) =>
    matches[i] ? { ...r, why_it_fits: matches[i][1].trim() } : r
  );
}

function restaurantIntro(text) {
  const cut = text.search(/Why it fits you:/i);
  return (cut > 0 ? text.slice(0, cut) : text).trim();
}

function RestaurantCard({ restaurant, onAddToTrip }) {
  const priceColor = { '$': colors.accent, '$$': colors.text, '$$$': colors.primary, '$$$$': colors.primary };
  const [added, setAdded] = useState(false);

  function handleAdd() {
    if (added) return;
    setAdded(true);
    onAddToTrip?.(restaurant);
  }

  return (
    <View style={rsc.card}>
      <PhotoCarousel photos={restaurant.photos || []} height={130} />
      <View style={rsc.info}>
        <View style={rsc.nameRow}>
          <Text style={rsc.name} numberOfLines={1}>{restaurant.name}</Text>
          {restaurant.price && (
            <Text style={[rsc.price, { color: priceColor[restaurant.price] || colors.text }]}>
              {restaurant.price}
            </Text>
          )}
        </View>
        <View style={rsc.metaRow}>
          {restaurant.rating != null && (
            <Text style={rsc.rating}>★ {restaurant.rating}</Text>
          )}
          {restaurant.review_count != null && (
            <Text style={rsc.reviews}>({restaurant.review_count})</Text>
          )}
          {restaurant.cuisine ? (
            <Text style={rsc.cuisine} numberOfLines={1}>{restaurant.cuisine}</Text>
          ) : null}
        </View>
        {restaurant.address ? (
          <Text style={rsc.address} numberOfLines={1}>{restaurant.address}</Text>
        ) : null}
        {restaurant.why_it_fits ? (
          <Text style={rsc.whyItFits} numberOfLines={2}>{restaurant.why_it_fits}</Text>
        ) : null}
        <TouchableOpacity
          style={[rsc.addBtn, added && rsc.addBtnDone]}
          onPress={handleAdd}
          disabled={added}
          activeOpacity={0.8}
        >
          <Text style={rsc.addBtnText}>{added ? 'ADDED TO TRIP' : 'ADD TO TRIP'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function RestaurantResults({ restaurants, onAddToTrip }) {
  return (
    <View style={rsc.block}>
      {restaurants.map((r, i) => (
        <RestaurantCard key={r.id || i} restaurant={r} onAddToTrip={onAddToTrip} />
      ))}
    </View>
  );
}

const rsc = StyleSheet.create({
  block: { gap: 10 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12, borderWidth: 0.5, borderColor: colors.border,
    overflow: 'hidden',
  },
  info: { padding: 10, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  price: { fontSize: 13, fontWeight: '600' },
  metaRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  rating: { fontSize: 12, fontWeight: '600', color: colors.accent },
  reviews: { fontSize: 11, color: colors.textDim },
  cuisine: { fontSize: 11, color: colors.textMuted, flex: 1 },
  address: { fontSize: 11, color: colors.textDim },
  whyItFits: { fontSize: 11, color: colors.textMuted, fontStyle: 'italic' },
  addBtn: {
    marginTop: 6, backgroundColor: colors.primary,
    borderRadius: 8, paddingVertical: 10, alignItems: 'center',
  },
  addBtnDone: { backgroundColor: colors.primaryLight },
  addBtnText: { fontSize: 11, fontWeight: '600', color: colors.white, letterSpacing: 1 },
});

// ─── Suggestions ─────────────────────────────────────────────────────────────

function ItineraryPreviewCard({ itinerary, onView }) {
  return (
    <View style={ic.card}>
      <View style={ic.header}>
        <Text style={ic.dest}>{(itinerary.destination || '').toUpperCase()}</Text>
        <Text style={ic.count}>{itinerary.days?.length} DAYS</Text>
      </View>
      {(itinerary.days || []).map((day, i) => (
        <View key={i} style={ic.dayRow}>
          <Text style={ic.dayLabel}>{day.date_label || `Day ${i + 1}`}</Text>
          {day.summary ? <Text style={ic.daySummary} numberOfLines={1}>{day.summary}</Text> : null}
        </View>
      ))}
      <TouchableOpacity style={ic.viewBtn} onPress={onView} activeOpacity={0.8}>
        <Text style={ic.viewBtnText}>VIEW FULL ITINERARY →</Text>
      </TouchableOpacity>
    </View>
  );
}

const ic = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.border,
    overflow: 'hidden',
    marginTop: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  dest: { fontSize: 12, fontWeight: '700', color: colors.text, letterSpacing: 0.8 },
  count: { fontSize: 11, color: colors.textMuted, letterSpacing: 0.5 },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border + '66',
  },
  dayLabel: { fontSize: 12, fontWeight: '600', color: colors.primary, width: 80 },
  daySummary: { flex: 1, fontSize: 12, color: colors.textMuted },
  viewBtn: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    alignItems: 'center',
  },
  viewBtnText: { fontSize: 11, fontWeight: '600', color: colors.primary, letterSpacing: 0.8 },
});

const SUGGESTIONS = [
  "Madrid long weekend in May",
  "Add Tokyo to my wishlist",
  "4-day Rome itinerary",
  "What's Lisbon like in October?",
];

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PlanningScreen({ route, navigation }) {
  const { ariaPreferences, addToWishlist, removeFromWishlist, updateWishlistItem, upsertWishlist, wishlist, preferences, itineraries, saveItinerary, updateItineraryDay } = useApp();

  const greeting = preferences.name
    ? `Hey ${preferences.name}! I'm Aria — your personal travel agent. Where are we heading?`
    : "Hey there! I'm Aria — your personal travel agent. Where are we heading?";

  const [messages, setMessages] = useState([
    { id: '0', role: 'aria', text: greeting }
  ]);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const scrollRef = useRef(null);
  const shownHotelIdsRef = useRef(new Set());
  const activeDestRef = useRef(null);
  const pendingRestaurantRef = useRef(null);
  const pendingAutoSendRef = useRef(null);

  useEffect(() => {
    const prompt = route?.params?.initialPrompt;
    if (!prompt) return;
    const city = route?.params?.planCity;
    navigation?.setParams({ initialPrompt: undefined, planCity: undefined });
    if (city) activeDestRef.current = city;
    setShowSuggestions(false);
    // Reset to a fresh chat, then auto-send via pendingAutoSendRef
    setMessages([{ id: '0', role: 'aria', text: greeting }]);
    setHistory([]);
    setLoading(false);
    pendingAutoSendRef.current = prompt;
  }, [route?.params?.initialPrompt]);

  // Auto-send after chat resets (history becomes empty)
  useEffect(() => {
    if (!pendingAutoSendRef.current || loading || history.length > 0) return;
    const prompt = pendingAutoSendRef.current;
    pendingAutoSendRef.current = null;
    send(prompt);
  }, [history, loading]);

  async function send(text) {
    const msg = text || input.trim();
    if (!msg || loading) return;

    setInput('');
    setShowSuggestions(false);

    const userMsg = { id: Date.now().toString(), role: 'user', text: msg };
    const newHistory = [...history, { role: 'user', content: msg }];

    setMessages(prev => [...prev, userMsg, { id: 'typing', role: 'typing' }]);
    setHistory(newHistory);
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const res = await fetch(BACKEND + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory,
          user_preferences: {
            ...ariaPreferences,
            excluded_hotel_ids: [...shownHotelIdsRef.current],
            // Strip photo arrays and descriptions from itinerary slots — not needed by the
            // server and can make the request body large enough to abort the connection.
            itineraries: ariaPreferences.itineraries?.map(itin => ({
              city: itin.city,
              days: itin.days?.map(day => ({
                date_label: day.date_label,
                summary: day.summary,
                slots: (day.slots || []).map(
                  ({ photos, photo_url, description, ...slot }) => slot
                ),
              })),
            })),
          },
        }),
      });
      const data = await res.json();
      const rawHotels = data.structured_results?.type === 'hotel_results' && data.structured_results.hotels?.length > 0
        ? data.structured_results.hotels : null;
      const hotels = rawHotels ? extractWhyItFits(data.reply, rawHotels) : null;
      const hotelSearchParams = hotels ? {
        location: data.structured_results.location,
        check_in: data.structured_results.check_in,
        check_out: data.structured_results.check_out,
        guests: data.structured_results.guests,
      } : null;
      const flight_options = data.flight_options?.results?.length > 0 ? data.flight_options : null;
      const flight_time_options = data.flight_time_options?.options?.length > 0 ? data.flight_time_options : null;
      const date_suggestions = data.date_suggestions?.options?.length > 0 ? data.date_suggestions : null;

      const rawRestaurants = data.restaurant_results?.restaurants?.length > 0
        ? data.restaurant_results.restaurants : null;
      const restaurants = rawRestaurants
        ? extractRestaurantWhyItFits(data.reply, rawRestaurants) : null;

      const itinerary = data.itinerary_results?.success && data.itinerary_results?.days?.length > 0
        ? { destination: data.itinerary_results.destination, days: data.itinerary_results.days }
        : null;

      const hasStructuredContent = !!(flight_time_options || flight_options || date_suggestions || hotels || restaurants || itinerary);
      const reply = data.reply || (hasStructuredContent ? '' : 'Something went wrong.');

      // Handle itinerary results
      if (data.itinerary_results?.success) {
        const itiResult = data.itinerary_results;
        const cityName = (itiResult.destination || '').split(',')[0].trim();
        if (itiResult.partial_update && itiResult.update_day_index != null) {
          const normalize = s => (s || '').toLowerCase().trim();
          const existing = itineraries.find(i => normalize(i.city) === normalize(cityName));
          if (existing) updateItineraryDay(existing.id, itiResult.update_day_index, itiResult.updated_slots || []);
        } else if (itiResult.days?.length > 0) {
          saveItinerary(cityName, itiResult.days);
        }
      }

      // Handle tool calls
      const norm = s => (s || '').toLowerCase().trim();
      if (data.tool_calls?.length > 0) {
        data.tool_calls.forEach(tool => {
          if (tool.name === 'save_restaurant_to_itinerary' && tool.result?.success) {
            const { destination, day_index, time, end_time, restaurant_name, meal_type, notes } = tool.result;
            const restaurant = pendingRestaurantRef.current;
            const cityName = (destination || '').split(',')[0].trim();
            const itin = itineraries.find(i => norm(i.city) === norm(cityName));
            if (itin && itin.days?.[day_index]) {
              const mealLabel = meal_type ? meal_type.charAt(0).toUpperCase() + meal_type.slice(1) : 'Dinner';
              const newSlot = {
                time,
                end_time,
                activity: `${mealLabel} at ${restaurant_name}`,
                location: restaurant?.address || '',
                notes: notes || '',
                slot_type: 'restaurant',
                photo_url: restaurant?.photos?.[0] || null,
                photos: restaurant?.photos?.slice(0, 6) || [],
                description: restaurant?.description || null,
                opentable_url: restaurant?.opentable_url || null,
                rating: restaurant?.rating ?? null,
                review_count: restaurant?.review_count ?? null,
                price: restaurant?.price || null,
                cuisine: restaurant?.cuisine || null,
              };
              const updatedSlots = [...(itin.days[day_index].slots || []), newSlot]
                .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
              updateItineraryDay(itin.id, day_index, updatedSlots);
              pendingRestaurantRef.current = null;
            }
          }
          if (tool.name === 'wishlist_update') {
            const city = tool.input.destination;
            if (tool.input.action === 'add') {
              activeDestRef.current = city;
              upsertWishlist({
                city,
                destination: city,
                travel_window: tool.input.target_travel_window || null,
                notes: tool.input.notes || '',
                flag: '📍', lat: 0, lon: 0,
              });
            } else if (tool.input.action === 'update') {
              const existing = wishlist.find(w => norm(w.city) === norm(city));
              if (existing) {
                const updates = {};
                if (tool.input.target_travel_window) { updates.travel_window = tool.input.target_travel_window; updates.when = tool.input.target_travel_window; }
                if (tool.input.notes) updates.notes = tool.input.notes;
                if (Object.keys(updates).length > 0) updateWishlistItem(existing.id, updates);
              }
            } else if (tool.input.action === 'remove') {
              const item = wishlist.find(w => norm(w.city) === norm(city));
              if (item) removeFromWishlist(item.id);
            }
          }
        });
      }

      setHistory(prev => [...prev, { role: 'assistant', content: reply }]);

      const ariaId = Date.now().toString();
      setMessages(prev => [
        ...prev.filter(m => m.id !== 'typing'),
        { id: ariaId, role: 'aria', text: reply, hotels, hotelSearchParams, restaurants, flight_options, flight_time_options, date_suggestions, itinerary },
      ]);

      if (hotels?.length > 0) {
        shownHotelIdsRef.current = new Set(hotels.map(h => h.hotel_id).filter(Boolean));
      }
    } catch {
      setMessages(prev => [
        ...prev.filter(m => m.id !== 'typing'),
        { id: Date.now().toString(), role: 'aria', text: 'Could not reach Aria. Check your connection.' },
      ]);
    }

    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  function newChat() {
    setMessages([{ id: '0', role: 'aria', text: greeting }]);
    setHistory([]);
    setInput('');
    setShowSuggestions(true);
    setLoading(false);
    shownHotelIdsRef.current = new Set();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={newChat} activeOpacity={0.7} style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>✈️</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerName}>Aria</Text>
          <Text style={styles.headerSub}>your personal travel agent</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map(msg => {
            if (msg.role === 'typing') {
              return (
                <View key="typing" style={styles.ariaRow}>
                  <View style={styles.ariaAvatar}><Text style={styles.ariaAvatarText}>A</Text></View>
                  <View style={[styles.bubble, styles.ariaBubble]}>
                    <ActivityIndicator size="small" color={colors.textMuted} />
                  </View>
                </View>
              );
            }

            if (msg.role === 'aria') {
              const displayText = (() => {
                if (msg.restaurants) return restaurantIntro(msg.text);
                if (msg.hotels) return hotelIntro(msg.text);
                // Strip "Why it fits you:" lines if restaurant cards failed to load
                if (msg.text?.match(/Why it fits you:/i)) {
                  return msg.text.replace(/Why it fits you:[^\n]*/gi, '').replace(/\n{3,}/g, '\n\n').trim();
                }
                return msg.text;
              })();
              return (
                <View key={msg.id} style={styles.ariaGroup}>
                  <View style={styles.ariaRow}>
                    <View style={styles.ariaAvatar}><Text style={styles.ariaAvatarText}>A</Text></View>
                    {displayText?.trim() ? (
                      <View style={[styles.bubble, styles.ariaBubble]}>
                        <MarkdownText text={displayText} />
                      </View>
                    ) : null}
                  </View>
                  {msg.date_suggestions && (
                    <View style={styles.hotelWrap}>
                      <DateChips
                        suggestions={msg.date_suggestions}
                        onSelect={(opt) => {
                          const norm = s => (s || '').toLowerCase().trim();
                          const city = norm(msg.date_suggestions.destination || activeDestRef.current || '');
                          const existing = wishlist.find(w => norm(w.city) === city);
                          if (existing) updateWishlistItem(existing.id, { travel_window: opt.label, when: opt.label });
                          send(`I'd like to go ${opt.label} (${opt.check_in} to ${opt.check_out})`);
                        }}
                      />
                    </View>
                  )}
                  {msg.itinerary && (
                    <View style={styles.hotelWrap}>
                      <ItineraryPreviewCard
                        itinerary={msg.itinerary}
                        onView={() => navigation.navigate('Main', { screen: 'Itineraries' })}
                      />
                    </View>
                  )}
                  {msg.flight_time_options && (
                    <View style={styles.hotelWrap}>
                      <FlightTimeChips
                        options={msg.flight_time_options.options}
                        onSelect={(opt) => {
                          send(`I prefer to fly in the ${opt.value}. Please search for flights now.`);
                        }}
                      />
                    </View>
                  )}
                  {msg.flight_options && (
                    <View style={styles.hotelWrap}>
                      <FlightResults
                        options={msg.flight_options}
                        onSave={(flight) => {
                          const norm = s => (s || '').toLowerCase().trim();
                          const city = norm(activeDestRef.current || '');
                          const existing = wishlist.find(w => norm(w.city) === city);
                          if (existing) {
                            updateWishlistItem(existing.id, { flight_info: flight });
                            setTimeout(() => send(`Flight saved. Now let's find a hotel in ${existing.city}.`), 300);
                          }
                        }}
                      />
                    </View>
                  )}
                  {msg.restaurants?.length > 0 && (
                    <View style={styles.hotelWrap}>
                      <RestaurantResults
                        restaurants={msg.restaurants}
                        onAddToTrip={(restaurant) => {
                          pendingRestaurantRef.current = restaurant;
                          const city = activeDestRef.current || '';
                          send(`I'd like to add ${restaurant.name} to my ${city} trip.`);
                        }}
                      />
                    </View>
                  )}
                  {msg.hotels?.length > 0 && (
                    <View style={styles.hotelWrap}>
                      <HotelResults
                        hotels={msg.hotels}
                        searchParams={msg.hotelSearchParams}
                        onRefresh={(refreshMsg) => send(refreshMsg)}
                        onAddToTrip={(hotel) => {
                          const norm = s => (s || '').toLowerCase().trim();
                          const cityName = (msg.hotelSearchParams?.location || activeDestRef.current || '').split(',')[0].trim();
                          const existing = wishlist.find(w => norm(w.city) === norm(cityName));
                          if (existing) {
                            updateWishlistItem(existing.id, {
                              hotel_info: {
                                name: hotel.name,
                                stars: hotel.stars,
                                per_night: hotel.cheapest_rate?.per_night,
                                total: hotel.cheapest_rate?.total,
                                currency: hotel.cheapest_rate?.currency,
                                nights: hotel.cheapest_rate ? Math.round(hotel.cheapest_rate.total / hotel.cheapest_rate.per_night) : null,
                                room_name: hotel.cheapest_rate?.room_name,
                                board: hotel.cheapest_rate?.board,
                                photo_url: hotel.photos?.[0] || null,
                                photos: hotel.photos?.slice(0, 6) || [],
                              },
                            });
                          }
                          const city = existing?.city || cityName;
                          if (city) setTimeout(() => send(`Hotel added to my ${city} trip.`), 300);
                        }}
                      />
                    </View>
                  )}
                </View>
              );
            }

            return (
              <View key={msg.id} style={styles.userRow}>
                <View style={[styles.bubble, styles.userBubble]}>
                  <Text style={styles.userText}>{msg.text}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {showSuggestions && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.suggestions}
            contentContainerStyle={styles.suggestionsContent}
          >
            {SUGGESTIONS.map((s, i) => (
              <TouchableOpacity key={i} style={styles.chip} onPress={() => send(s)}>
                <Text style={styles.chipText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask Aria anything about travel..."
            placeholderTextColor={colors.textDim}
            multiline
            returnKeyType="send"
            onSubmitEditing={() => send()}
            color={colors.text}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => send()}
            disabled={!input.trim() || loading}
          >
            {loading
              ? <ActivityIndicator size="small" color={colors.white} />
              : <Text style={styles.sendBtnText}>↑</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderBottomWidth: 0.5, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { fontSize: 16 },
  headerName: { fontSize: 15, fontWeight: '500', color: colors.text },
  headerSub: { fontSize: 11, color: colors.primary, marginTop: 1 },
  messages: { flex: 1 },
  messagesContent: { padding: 16, gap: 12 },
  ariaGroup: { gap: 8 },
  ariaRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  userRow: { flexDirection: 'row-reverse' },
  ariaAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  ariaAvatarText: { fontSize: 11, fontWeight: '500', color: colors.primary },
  bubble: { maxWidth: '80%', padding: 10, paddingHorizontal: 14, borderRadius: 16 },
  ariaBubble: { backgroundColor: colors.surface, borderTopLeftRadius: 4 },
  userBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  ariaText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  userText: { fontSize: 14, color: colors.white, lineHeight: 20 },
  hotelWrap: { marginLeft: 36 },
  suggestions: { maxHeight: 48 },
  suggestionsContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  chip: { borderWidth: 0.5, borderColor: colors.border, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, backgroundColor: colors.surface },
  chipText: { fontSize: 12, color: colors.textMuted },
  inputArea: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, borderTopWidth: 0.5, borderTopColor: colors.border, backgroundColor: colors.surface },
  input: { flex: 1, borderWidth: 0.5, borderColor: colors.border, borderRadius: 20, paddingVertical: 9, paddingHorizontal: 16, fontSize: 14, maxHeight: 100, backgroundColor: colors.surfaceDeep },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: colors.border },
  sendBtnText: { color: colors.white, fontSize: 18, fontWeight: '600' },
});

// Hotel-specific styles
const hs = StyleSheet.create({
  block: { gap: 8 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12, borderWidth: 0.5, borderColor: colors.border,
    overflow: 'hidden',
  },
  cardSelected: { borderColor: colors.primary, borderWidth: 1.5 },
  info: { padding: 10, gap: 4 },
  infoTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radio: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  hotelName: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  stars: { fontSize: 11, color: colors.accent, letterSpacing: 1 },
  infoMeta: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  rating: { fontSize: 12, fontWeight: '600', color: colors.accent },
  reviews: { fontSize: 11, color: colors.textDim },
  price: { fontSize: 12, color: colors.text, marginLeft: 'auto' },
  roomLine: { fontSize: 11, color: colors.textMuted },
  amenities: { fontSize: 11, color: colors.textDim },
  whyItFits: { fontSize: 11, color: colors.textMuted, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  addBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  addBtnOff: { backgroundColor: colors.primaryLight },
  addBtnText: { fontSize: 11, fontWeight: '600', color: colors.white, letterSpacing: 1 },
  refreshBtn: { flex: 1, borderWidth: 0.5, borderColor: colors.border, borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  refreshBtnText: { fontSize: 11, color: colors.textMuted, letterSpacing: 1 },
});
