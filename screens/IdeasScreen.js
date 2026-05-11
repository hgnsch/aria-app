import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, StatusBar,
  FlatList, TouchableOpacity, ImageBackground,
  TextInput, Modal, KeyboardAvoidingView, Platform,
  ActivityIndicator, TouchableWithoutFeedback,
} from 'react-native';
import { colors } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { fetchDestinationPhoto } from '../lib/unsplash';

const BACKEND = 'https://aria-travel-production.up.railway.app';

const CATEGORIES = [
  { id: 'foryou',     label: 'For You',     icon: '✨', tagline: 'Tailored to your taste',        color: '#3E35A0' },
  { id: 'europe',     label: 'Europe',      icon: '🏛️', tagline: 'Cities, culture & cuisine',      color: '#23578A' },
  { id: 'asia',       label: 'Asia',        icon: '🏯', tagline: 'Ancient wonders & modern life',  color: '#8A3520' },
  { id: 'americas',   label: 'Americas',    icon: '🌎', tagline: 'Landscapes & vibrant cities',    color: '#1E7040' },
  { id: 'africa',     label: 'Africa',      icon: '🦁', tagline: 'Safari & golden horizons',       color: '#8A5A14' },
  { id: 'oceania',    label: 'Oceania',     icon: '🏄', tagline: 'Beaches, reefs & wilderness',    color: '#12768A' },
  { id: 'middleeast', label: 'Middle East', icon: '🕌', tagline: 'Desert luxury & history',        color: '#7A2E6E' },
  { id: 'adventure',  label: 'Adventure',   icon: '🧗', tagline: 'Trails, peaks & open water',    color: '#4A7018' },
];


export default function IdeasScreen({ navigation }) {
  const { ariaPreferences, addToWishlist } = useApp();

  const [view, setView] = useState('categories');
  const [activeCategory, setActiveCategory] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addCity, setAddCity] = useState('');
  const [addCountry, setAddCountry] = useState('');
  const [addWhen, setAddWhen] = useState('');

  const loadDestinations = useCallback(async (category) => {
    setLoadingAI(true);
    setLoadError(false);
    setDestinations([]);
    setSelected(null);
    try {
      const res = await fetch(`${BACKEND}/ideas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: category.id,
          user_preferences: {
            travel_style: ariaPreferences.travel_style,
            household: ariaPreferences.household,
            wishlist: ariaPreferences.wishlist,
          },
        }),
      });
      const data = await res.json();
      const parsed = data?.destinations;
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setLoadError(true);
        setLoadingAI(false);
        return;
      }

      const initial = parsed.map((d, i) => ({
        id: `${Date.now()}_${i}`,
        city: d.city || '',
        country: d.country || '',
        reason: d.reason || '',
        photo_url: null,
      }));
      setDestinations(initial);
      setLoadingAI(false);

      // Fetch photos progressively
      initial.forEach(dest => {
        fetchDestinationPhoto(dest.city, dest.country).then(url => {
          if (url) {
            setDestinations(prev =>
              prev.map(d => d.id === dest.id ? { ...d, photo_url: url } : d)
            );
          }
        });
      });
    } catch {
      setLoadError(true);
      setLoadingAI(false);
    }
  }, [ariaPreferences]);

  function handleCategoryPress(cat) {
    setActiveCategory(cat);
    setView('inspirations');
    loadDestinations(cat);
  }

  function handleBack() {
    setView('categories');
    setActiveCategory(null);
    setDestinations([]);
    setSelected(null);
    setLoadError(false);
  }

  function handleCardPress(dest) {
    setSelected(prev => prev?.id === dest.id ? null : dest);
  }

  function handleAddPress() {
    setAddCity(selected?.city || '');
    setAddCountry(selected?.country || '');
    setAddWhen('');
    setShowAddModal(true);
  }

  function handleSubmitAdd() {
    if (!addCity.trim()) return;
    addToWishlist({
      city: addCity.trim(),
      country: addCountry.trim(),
      travel_window: addWhen.trim() || null,
      photo_url: selected?.photo_url || null,
    });
    setShowAddModal(false);
    setSelected(null);
  }

  const ariaPrompt = selected
    ? `Tell me about ${selected.city}, ${selected.country}. What should I know about visiting — best time to go, top things to do, and highlights?`
    : '';

  function renderCategoryTile({ item }) {
    return (
      <TouchableOpacity
        style={[ct.tile, { backgroundColor: item.color }]}
        activeOpacity={0.82}
        onPress={() => handleCategoryPress(item)}
      >
        <View style={ct.tileGlow} />
        <Text style={ct.tileIcon}>{item.icon}</Text>
        <Text style={ct.tileLabel}>{item.label}</Text>
        <Text style={ct.tileTagline}>{item.tagline}</Text>
      </TouchableOpacity>
    );
  }

  function renderDestCard({ item }) {
    const isSelected = selected?.id === item.id;
    return (
      <TouchableOpacity
        style={[dc.card, isSelected && dc.cardSel]}
        activeOpacity={0.85}
        onPress={() => handleCardPress(item)}
      >
        <ImageBackground
          source={item.photo_url ? { uri: item.photo_url } : undefined}
          style={[dc.img, !item.photo_url && { backgroundColor: (activeCategory?.color || '#1A1A2E') + '99' }]}
          resizeMode="cover"
        >
          <View style={dc.dim} />
          <View style={dc.content}>
            {!item.photo_url && (
              <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" style={{ marginBottom: 6 }} />
            )}
            <Text style={dc.city} numberOfLines={1}>{item.city}</Text>
            <Text style={dc.country} numberOfLines={1}>{item.country}</Text>
            {item.reason ? (
              <Text style={dc.reason} numberOfLines={2}>{item.reason}</Text>
            ) : null}
          </View>
        </ImageBackground>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />

      {view === 'categories' ? (
        <>
          <View style={s.header}>
            <Text style={s.title}>Ideas</Text>
            <Text style={s.sub}>What kind of trip are you dreaming of?</Text>
          </View>
          <FlatList
            data={CATEGORIES}
            renderItem={renderCategoryTile}
            keyExtractor={item => item.id}
            numColumns={2}
            contentContainerStyle={ct.listContent}
            columnWrapperStyle={ct.colWrap}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <>
          <View style={s.headerRow}>
            <TouchableOpacity onPress={handleBack} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.backIcon}>←</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{activeCategory?.label}</Text>
              <Text style={s.sub}>{activeCategory?.tagline}</Text>
            </View>
            <TouchableOpacity
              style={[s.refreshBtn, loadingAI && { opacity: 0.3 }]}
              onPress={() => !loadingAI && loadDestinations(activeCategory)}
            >
              <Text style={s.refreshIcon}>↻</Text>
            </TouchableOpacity>
          </View>

          {loadingAI ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={s.loadingText}>Asking Aria for ideas…</Text>
            </View>
          ) : loadError ? (
            <View style={s.loadingWrap}>
              <Text style={s.errorIcon}>⚡</Text>
              <Text style={s.errorTitle}>Couldn't load ideas</Text>
              <TouchableOpacity style={s.retryBtn} onPress={() => loadDestinations(activeCategory)}>
                <Text style={s.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={destinations}
              renderItem={renderDestCard}
              keyExtractor={item => item.id}
              numColumns={2}
              contentContainerStyle={dc.listContent}
              columnWrapperStyle={dc.colWrap}
              showsVerticalScrollIndicator={false}
            />
          )}

          {selected && (
            <View style={s.panel}>
              <View style={s.panelRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.panelCity}>{selected.city}</Text>
                  <Text style={s.panelCountry}>{selected.country}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelected(null)} style={s.panelClose}>
                  <Text style={s.panelCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              {selected.reason ? (
                <Text style={s.panelReason} numberOfLines={2}>{selected.reason}</Text>
              ) : null}
              <View style={s.panelBtns}>
                <TouchableOpacity style={s.panelBtnPrimary} onPress={handleAddPress}>
                  <Text style={s.panelBtnPrimaryText}>+ ADD TO WISHLIST</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.panelBtnSecondary}
                  onPress={() => {
                    setSelected(null);
                    navigation.navigate('Main', {
                      screen: 'Planning',
                      params: { initialPrompt: ariaPrompt },
                    });
                  }}
                >
                  <Text style={s.panelBtnSecondaryText}>ASK ARIA ✈</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      )}

      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowAddModal(false)}>
          <View style={m.overlay} />
        </TouchableWithoutFeedback>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={m.sheet}>
          <View style={m.handle} />
          <Text style={m.title}>Add to Wishlist</Text>
          <TextInput
            style={m.input}
            value={addCity}
            onChangeText={setAddCity}
            placeholder="City or destination"
            placeholderTextColor={colors.textDim}
            color={colors.text}
            autoFocus
            returnKeyType="next"
          />
          <TextInput
            style={m.input}
            value={addCountry}
            onChangeText={setAddCountry}
            placeholder="Country"
            placeholderTextColor={colors.textDim}
            color={colors.text}
            returnKeyType="next"
          />
          <TextInput
            style={m.input}
            value={addWhen}
            onChangeText={setAddWhen}
            placeholder="When  ·  e.g. Summer 2026, Flexible"
            placeholderTextColor={colors.textDim}
            color={colors.text}
            returnKeyType="done"
            onSubmitEditing={handleSubmitAdd}
          />
          <TouchableOpacity
            style={[m.addBtn, !addCity.trim() && m.addBtnDisabled]}
            onPress={handleSubmitAdd}
            disabled={!addCity.trim()}
            activeOpacity={0.8}
          >
            <Text style={m.addBtnText}>ADD TO WISHLIST</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  header: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    gap: 12,
  },
  title: { fontSize: 22, fontWeight: '500', color: colors.text },
  sub: { fontSize: 11, color: colors.textMuted, marginTop: 2, letterSpacing: 0.4 },

  backBtn: { padding: 4 },
  backIcon: { fontSize: 22, color: colors.textMuted },
  refreshBtn: { padding: 8 },
  refreshIcon: { fontSize: 22, color: colors.textMuted },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 13, color: colors.textMuted },
  errorIcon: { fontSize: 32 },
  errorTitle: { fontSize: 14, color: colors.textMuted },
  retryBtn: {
    marginTop: 4, paddingHorizontal: 20, paddingVertical: 9,
    borderRadius: 8, borderWidth: 1, borderColor: colors.border,
  },
  retryText: { fontSize: 13, color: colors.textDim, fontWeight: '500' },

  panel: {
    backgroundColor: colors.surface,
    borderTopWidth: 0.5, borderTopColor: colors.border,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12,
    gap: 10,
  },
  panelRow: { flexDirection: 'row', alignItems: 'center' },
  panelCity: { fontSize: 16, fontWeight: '500', color: colors.text },
  panelCountry: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  panelReason: { fontSize: 12, color: colors.textDim, lineHeight: 17 },
  panelClose: { padding: 4 },
  panelCloseText: { fontSize: 16, color: colors.textDim },
  panelBtns: { flexDirection: 'row', gap: 10 },
  panelBtnPrimary: {
    flex: 1, backgroundColor: colors.primary,
    borderRadius: 8, paddingVertical: 11, alignItems: 'center',
  },
  panelBtnPrimaryText: { fontSize: 11, fontWeight: '600', color: colors.white, letterSpacing: 1 },
  panelBtnSecondary: {
    flex: 1, borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, paddingVertical: 11, alignItems: 'center',
  },
  panelBtnSecondaryText: { fontSize: 11, fontWeight: '500', color: colors.textMuted, letterSpacing: 1 },
});

const ct = StyleSheet.create({
  listContent: { padding: 12, paddingBottom: 24 },
  colWrap: { gap: 10 },
  tile: {
    flex: 1, height: 138,
    borderRadius: 14, padding: 16,
    marginBottom: 10, overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  tileGlow: {
    position: 'absolute', top: -24, right: -24,
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  tileIcon: { fontSize: 28, marginBottom: 8 },
  tileLabel: { fontSize: 15, fontWeight: '600', color: '#fff', letterSpacing: 0.2 },
  tileTagline: { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2, lineHeight: 14 },
});

const dc = StyleSheet.create({
  listContent: { padding: 10 },
  colWrap: { gap: 10 },
  card: {
    flex: 1, height: 168,
    borderRadius: 12, overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: colors.surface,
  },
  cardSel: { borderWidth: 2.5, borderColor: colors.primary },
  img: { flex: 1, justifyContent: 'flex-end' },
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.38)' },
  content: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  city: {
    color: '#fff', fontSize: 13, fontWeight: '600', lineHeight: 17,
    textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  country: {
    color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 1,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  reason: {
    color: 'rgba(255,255,255,0.6)', fontSize: 9, marginTop: 4, lineHeight: 13,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
});

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40, gap: 12,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '500', color: colors.text, marginBottom: 4 },
  input: {
    backgroundColor: colors.surfaceDeep, borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
  },
  addBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  addBtnDisabled: { backgroundColor: colors.primaryLight },
  addBtnText: { fontSize: 12, fontWeight: '600', color: colors.white, letterSpacing: 1.2 },
});
