import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, StatusBar,
  TextInput, TouchableOpacity, ScrollView, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { fetchHotelPhotos } from '../lib/unsplash';

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

// ─── Hotel card + results block ───────────────────────────────────────────────

function HotelCard({ hotel, selected, onSelect }) {
  const filledStars = Math.min(Math.round(hotel.stars || 0), 5);
  const starsText = '★'.repeat(filledStars) + '☆'.repeat(5 - filledStars);
  const photos = (hotel.photos || []).filter(Boolean);

  return (
    <View style={[hs.card, selected && hs.cardSelected]}>
      {/* Photo strip is NOT inside TouchableOpacity — allows free horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={hs.photoStrip}
        contentContainerStyle={{ gap: 2 }}
      >
        {photos.length > 0 ? photos.map((url, i) => (
          <Image key={i} source={{ uri: url }} style={hs.photo} resizeMode="cover" />
        )) : (
          <View style={[hs.photo, hs.photoEmpty]}>
            <Text style={hs.photoEmptyText}>No photo</Text>
          </View>
        )}
      </ScrollView>

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
        </View>
      </TouchableOpacity>
    </View>
  );
}

function HotelResults({ hotels, onRefresh, onAddToTrip }) {
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
        <TouchableOpacity style={hs.refreshBtn} onPress={onRefresh} activeOpacity={0.8}>
          <Text style={hs.refreshBtnText}>NEW SEARCH</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Suggestions ─────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "Madrid long weekend in May",
  "Add Tokyo to my wishlist",
  "4-day Rome itinerary",
  "What's Lisbon like in October?",
];

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PlanningScreen({ route, navigation }) {
  const { ariaPreferences, addToWishlist, removeFromWishlist, wishlist } = useApp();

  const [messages, setMessages] = useState([
    { id: '0', role: 'aria', text: "Hey Marc! I'm Aria — your personal travel agent. Where are we heading?" }
  ]);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const scrollRef = useRef(null);
  const shownHotelIdsRef = useRef(new Set());

  useEffect(() => {
    if (route?.params?.initialPrompt) {
      setInput(route.params.initialPrompt);
      setShowSuggestions(false);
      navigation?.setParams({ initialPrompt: undefined });
    }
  }, [route?.params?.initialPrompt]);

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
          },
        }),
      });
      const data = await res.json();
      const reply = data.reply || 'Something went wrong.';
      const hotels = data.structured_results?.type === 'hotel_results' && data.structured_results.hotels?.length > 0
        ? data.structured_results.hotels
        : null;

      if (data.tool_calls?.length > 0) {
        data.tool_calls.forEach(tool => {
          if (tool.name === 'wishlist_update' && tool.input.action === 'add') {
            addToWishlist({
              city: tool.input.destination,
              destination: tool.input.destination,
              travel_window: tool.input.target_travel_window || null,
              notes: tool.input.notes || '',
              flag: '📍', lat: 0, lon: 0,
            });
          }
          if (tool.name === 'wishlist_update' && tool.input.action === 'remove') {
            const item = wishlist.find(w => w.city.toLowerCase() === tool.input.destination.toLowerCase());
            if (item) removeFromWishlist(item.id);
          }
        });
      }

      setHistory(prev => [...prev, { role: 'assistant', content: reply }]);

      const ariaId = Date.now().toString();
      setMessages(prev => [
        ...prev.filter(m => m.id !== 'typing'),
        { id: ariaId, role: 'aria', text: reply, hotels },
      ]);

      // Track shown hotels and enrich photos from Unsplash in the background
      if (hotels?.length > 0) {
        hotels.forEach(h => { if (h.hotel_id) shownHotelIdsRef.current.add(h.hotel_id); });
        hotels.forEach((hotel, idx) => {
          fetchHotelPhotos(hotel.name, hotel.city || '').then(photos => {
            if (!photos.length) return;
            setMessages(prev => prev.map(m =>
              m.id === ariaId && m.hotels
                ? { ...m, hotels: m.hotels.map((h, i) => i === idx ? { ...h, photos } : h) }
                : m
            ));
          });
        });
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

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>✈️</Text>
        </View>
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
              return (
                <View key={msg.id} style={styles.ariaGroup}>
                  <View style={styles.ariaRow}>
                    <View style={styles.ariaAvatar}><Text style={styles.ariaAvatarText}>A</Text></View>
                    <View style={[styles.bubble, styles.ariaBubble]}>
                      <MarkdownText text={msg.text} />
                    </View>
                  </View>
                  {msg.hotels?.length > 0 && (
                    <View style={styles.hotelWrap}>
                      <HotelResults
                        hotels={msg.hotels}
                        onRefresh={() => send('Show me different hotel options')}
                        onAddToTrip={(hotel) => {
                          addToWishlist({
                            city: hotel.name,
                            country: hotel.city || hotel.country || '',
                            flag: '🏨',
                            lat: hotel.coordinates?.lat || 0,
                            lon: hotel.coordinates?.lon || 0,
                            photo_url: hotel.photos?.[0] || null,
                            notes: hotel.cheapest_rate
                              ? `${hotel.cheapest_rate.currency} ${hotel.cheapest_rate.per_night}/night · ${hotel.stars || '?'} stars`
                              : '',
                          });
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
  photoStrip: { height: 90 },
  photo: { width: 120, height: 90 },
  photoEmpty: { backgroundColor: colors.surfaceDeep, alignItems: 'center', justifyContent: 'center' },
  photoEmptyText: { fontSize: 10, color: colors.textDim },
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
  actions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  addBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  addBtnOff: { backgroundColor: colors.primaryLight },
  addBtnText: { fontSize: 11, fontWeight: '600', color: colors.white, letterSpacing: 1 },
  refreshBtn: { flex: 1, borderWidth: 0.5, borderColor: colors.border, borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  refreshBtnText: { fontSize: 11, color: colors.textMuted, letterSpacing: 1 },
});
