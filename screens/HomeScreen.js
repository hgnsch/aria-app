import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, SafeAreaView, StatusBar, Modal,
  TextInput, KeyboardAvoidingView, Platform,
  TouchableWithoutFeedback, ActivityIndicator, ImageBackground,
} from 'react-native';
import { colors } from '../theme/colors';
import { useApp } from '../context/AppContext';
import InteractiveMap from '../components/InteractiveMap';

const TAG_COLORS = {
  alert: colors.primary,
  ready: colors.accent,
  explore: colors.pink,
};

function countryCodeToFlag(code) {
  return code.toUpperCase().split('').map(c =>
    String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
  ).join('');
}

async function reverseGeocode(lat, lon, nominatimZoom = 10) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&zoom=${nominatimZoom}`,
      { headers: { 'User-Agent': 'AriaApp/1.0' } }
    );
    const data = await res.json();
    const addr = data?.address || {};
    const cc = addr.country_code || '';
    const city =
      addr.city || addr.town || addr.village ||
      addr.municipality || addr.county || addr.state ||
      addr.country || 'Unknown';
    return {
      city: city.replace(/\b\w/g, c => c.toUpperCase()),
      country: addr.country || '',
      flag: cc ? countryCodeToFlag(cc) : '📍',
      lat, lon,
    };
  } catch {
    return { city: 'Unknown location', country: '', flag: '📍', lat, lon };
  }
}

async function geocodePlace(query) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`,
    { headers: { 'User-Agent': 'AriaApp/1.0' } }
  );
  const data = await res.json();
  if (!data?.length) return null;
  const place = data[0];
  const addr = place.address || {};
  const cc = addr.country_code || '';
  return {
    country: addr.country || '',
    flag: cc ? countryCodeToFlag(cc) : '📍',
    lat: parseFloat(place.lat),
    lon: parseFloat(place.lon),
  };
}

function AddDestinationModal({ visible, onClose, onAdd }) {
  const [where, setWhere] = useState('');
  const [when, setWhen] = useState('');
  const [loading, setLoading] = useState(false);

  function reset() { setWhere(''); setWhen(''); }

  async function handleAdd() {
    if (!where.trim()) return;
    setLoading(true);
    const name = where.trim().replace(/\b\w/g, c => c.toUpperCase());
    try {
      const geo = await geocodePlace(where.trim());
      onAdd({ city: name, country: geo?.country || '', flag: geo?.flag || '📍', lat: geo?.lat || 0, lon: geo?.lon || 0, travel_window: when.trim() || null });
    } catch {
      onAdd({ city: name, country: '', flag: '📍', lat: 0, lon: 0, travel_window: when.trim() || null });
    }
    reset(); setLoading(false); onClose();
  }

  function handleClose() { reset(); onClose(); }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={modal.overlay} />
      </TouchableWithoutFeedback>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={modal.sheet}>
        <View style={modal.handle} />
        <Text style={modal.title}>Add Destination</Text>
        <TextInput style={modal.input} placeholder="Where  ·  city, country, or region"
          placeholderTextColor={colors.textDim} value={where} onChangeText={setWhere}
          color={colors.text} autoFocus returnKeyType="next" />
        <TextInput style={modal.input} placeholder="When  ·  e.g. Summer 2026, Flexible"
          placeholderTextColor={colors.textDim} value={when} onChangeText={setWhen}
          color={colors.text} returnKeyType="done" onSubmitEditing={handleAdd} />
        <TouchableOpacity
          style={[modal.addBtn, (!where.trim() || loading) && modal.addBtnDisabled]}
          onPress={handleAdd} disabled={!where.trim() || loading} activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator size="small" color={colors.white} />
            : <Text style={modal.addBtnText}>ADD TO WISHLIST</Text>
          }
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function HomeScreen({ navigation }) {
  const [view, setView] = useState('list');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const { wishlist, addToWishlist, removeFromWishlist } = useApp();

  // Map state
  const mapRef = useRef(null);
  const [pendingCoord, setPendingCoord] = useState(null);
  const [pendingGeo, setPendingGeo] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState(null); // wishlist item
  const [areaSelection, setAreaSelection] = useState(null);  // continent panel

  async function handleMapPress(lat, lon) {
    setSelectedMarker(null);
    setAreaSelection(null);
    setPendingCoord({ lat, lon });
    setPendingGeo(null);
    setGeoLoading(true);
    mapRef.current?.addPendingPin(lat, lon);
    const geo = await reverseGeocode(lat, lon, 10);
    setPendingGeo(geo);
    setGeoLoading(false);
  }

  async function handleCityPress(name, lat, lon) {
    setSelectedMarker(null);
    setAreaSelection(null);
    setPendingCoord({ lat, lon });
    setPendingGeo(null);
    setGeoLoading(true);
    mapRef.current?.addPendingPin(lat, lon);
    const geo = await reverseGeocode(lat, lon, 10);
    setPendingGeo({ ...geo, city: name });
    setGeoLoading(false);
  }

  async function handleAreaPress(lat, lon, mode, continentName) {
    setPendingCoord(null);
    setPendingGeo(null);
    setSelectedMarker(null);
    mapRef.current?.clearPendingPin();

    if (mode === 0) {
      setAreaSelection({ label: continentName, icon: '🌍' });
      return;
    }

    // Country level — geocode to get country name + flag
    setAreaSelection(null);
    setPendingCoord({ lat, lon });
    setGeoLoading(true);
    const geo = await reverseGeocode(lat, lon, 5);
    setPendingGeo({ ...geo, city: geo.country || geo.city });
    setGeoLoading(false);
  }

  function handleMarkerPress(id) {
    const item = wishlist.find(w => w.id === id);
    if (!item) return;
    const index = wishlist.indexOf(item);
    setPendingCoord(null);
    setPendingGeo(null);
    setAreaSelection(null);
    mapRef.current?.clearPendingPin();
    setSelectedMarker({ item, index });
  }

  function handleAddPending() {
    if (!pendingGeo) return;
    addToWishlist(pendingGeo);
    setPendingCoord(null);
    setPendingGeo(null);
    mapRef.current?.clearPendingPin();
  }

  function dismissPanel() {
    setPendingCoord(null);
    setPendingGeo(null);
    setSelectedMarker(null);
    setAreaSelection(null);
    mapRef.current?.clearPendingPin();
  }

  const panelVisible = !!(pendingCoord || selectedMarker || areaSelection);

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
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {wishlist.map((item, index) => {
              const accentColor = colors.tileColors[index % colors.tileColors.length];
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.tileCard}
                  activeOpacity={0.85}
                  onLongPress={() => setDeletingId(item.id)}
                  onPress={() => {
                    if (deletingId === item.id) { setDeletingId(null); return; }
                    navigation.navigate('WishlistDetail', { item, accentColor });
                  }}
                >
                  <ImageBackground
                    source={item.photo_url ? { uri: item.photo_url } : undefined}
                    style={styles.tileImageBg}
                    resizeMode="cover"
                  >
                    {item.photo_url && <View style={styles.tileDim} />}
                    <View style={[styles.tileContent, !item.photo_url && { backgroundColor: accentColor + '1A' }]}>
                      <View style={styles.tileTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.tileCity}>{item.city}</Text>
                          <Text style={styles.tileCountry}>{item.country.toUpperCase()}</Text>
                        </View>
                        <Text style={styles.tileFlag}>{item.flag}</Text>
                      </View>
                      {(item.flight_info || item.hotel_info || item.notes) ? (() => {
                          const ob = item.flight_info?.outbound || item.flight_info;
                          const ret = item.flight_info?.return || null;
                          const flightTotal = (ob?.total_price || 0) + (ret?.total_price || 0);
                          const costLine = item.flight_info && item.hotel_info
                            ? `${item.hotel_info.currency} ${Math.round(flightTotal + item.hotel_info.total).toLocaleString()} total`
                            : item.flight_info
                            ? `${ob?.currency} ${ob?.price_per_person} · ${ob?.airline}`
                            : item.hotel_info
                            ? `${item.hotel_info.currency} ${item.hotel_info.per_night}/night · ${item.hotel_info.name}`
                            : item.notes;
                          return costLine ? (
                            <Text style={styles.tileCost} numberOfLines={1}>{costLine}</Text>
                          ) : null;
                        })() : null}
                      <View style={styles.tileBottom}>
                        <Text style={styles.tileWhen}>{item.when}</Text>
                        <View style={[styles.tag, { borderColor: TAG_COLORS[item.tagType] || accentColor }]}>
                          <Text style={[styles.tagText, { color: TAG_COLORS[item.tagType] || accentColor }]}>
                            {item.tag.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </ImageBackground>
                  {deletingId === item.id && (
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => { removeFromWishlist(item.id); setDeletingId(null); }}
                    >
                      <Text style={styles.deleteBtnText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={styles.addBtn} activeOpacity={0.7} onPress={() => setShowAddModal(true)}>
            <Text style={styles.addIcon}>+</Text>
            <Text style={styles.addText}>ADD A DESTINATION</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.mapContainer}>
          <InteractiveMap
            ref={mapRef}
            cities={wishlist}
            onMapPress={handleMapPress}
            onMarkerPress={handleMarkerPress}
            onCityPress={handleCityPress}
            onAreaPress={handleAreaPress}
          />

          {/* Action panel */}
          {panelVisible && (
            <View style={styles.mapPanel}>
              {/* New location tapped */}
              {pendingCoord && (
                <>
                  <View style={styles.panelRow}>
                    {geoLoading ? (
                      <ActivityIndicator size="small" color={colors.textMuted} style={{ marginRight: 8 }} />
                    ) : (
                      <Text style={styles.panelFlag}>{pendingGeo?.flag ?? '📍'}</Text>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.panelCity}>
                        {geoLoading ? 'Looking up location…' : (pendingGeo?.city ?? '—')}
                      </Text>
                      {!geoLoading && pendingGeo?.country ? (
                        <Text style={styles.panelCountry}>{pendingGeo.country}</Text>
                      ) : null}
                    </View>
                    <TouchableOpacity onPress={dismissPanel} style={styles.panelClose}>
                      <Text style={styles.panelCloseText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  {!geoLoading && pendingGeo && (
                    <View style={styles.panelBtns}>
                      <TouchableOpacity style={styles.panelBtnPrimary} onPress={handleAddPending}>
                        <Text style={styles.panelBtnPrimaryText}>+ ADD TO WISHLIST</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.panelBtnSecondary}
                        onPress={() => {
                          dismissPanel();
                          navigation.navigate('Main', {
                            screen: 'Planning',
                            params: { initialPrompt: `Tell me about ${pendingGeo.city}${pendingGeo.country ? `, ${pendingGeo.country}` : ''}. What's the best time to visit and what should I see?` },
                          });
                        }}
                      >
                        <Text style={styles.panelBtnSecondaryText}>ASK ARIA ✈</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}

              {/* Continent / area selected */}
              {areaSelection && (
                <>
                  <View style={styles.panelRow}>
                    <Text style={styles.panelFlag}>{areaSelection.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.panelCity}>{areaSelection.label}</Text>
                      <Text style={styles.panelCountry}>Zoom in to explore destinations</Text>
                    </View>
                    <TouchableOpacity onPress={dismissPanel} style={styles.panelClose}>
                      <Text style={styles.panelCloseText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.panelBtns}>
                    <TouchableOpacity
                      style={styles.panelBtnSecondary}
                      onPress={() => {
                        dismissPanel();
                        navigation.navigate('Main', {
                          screen: 'Planning',
                          params: { initialPrompt: `Tell me about travel in ${areaSelection.label}. What are the best destinations to visit and when?` },
                        });
                      }}
                    >
                      <Text style={styles.panelBtnSecondaryText}>ASK ARIA ✈</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Existing wishlist marker tapped */}
              {selectedMarker && (
                <>
                  <View style={styles.panelRow}>
                    <Text style={styles.panelFlag}>{selectedMarker.item.flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.panelCity}>{selectedMarker.item.city}</Text>
                      <Text style={styles.panelCountry}>
                        {selectedMarker.item.travel_window || 'No date set'}
                        {' · '}
                        {selectedMarker.item.tag}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={dismissPanel} style={styles.panelClose}>
                      <Text style={styles.panelCloseText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.panelBtns}>
                    <TouchableOpacity
                      style={styles.panelBtnPrimary}
                      onPress={() => {
                        dismissPanel();
                        navigation.navigate('WishlistDetail', {
                          item: selectedMarker.item,
                          accentColor: colors.tileColors[selectedMarker.index % colors.tileColors.length],
                        });
                      }}
                    >
                      <Text style={styles.panelBtnPrimaryText}>VIEW DETAILS</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.addBtn} activeOpacity={0.7} onPress={() => setShowAddModal(true)}>
            <Text style={styles.addIcon}>+</Text>
            <Text style={styles.addText}>ADD A DESTINATION</Text>
          </TouchableOpacity>
        </View>
      )}

      <AddDestinationModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addToWishlist}
      />
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
  toggleGroup: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 4, overflow: 'hidden' },
  toggleBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 4 },
  toggleActive: { backgroundColor: colors.primary },
  toggleText: { fontSize: 10, fontWeight: '500', letterSpacing: 1, color: colors.textDim },
  toggleTextActive: { color: colors.white },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12, fontWeight: '500', color: colors.white },

  // List
  listContainer: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 12, paddingBottom: 8 },
  tileCard: {
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 14, overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.border,
    minHeight: 155,
  },
  tileImageBg: { flex: 1, minHeight: 155, justifyContent: 'flex-end' },
  tileDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,5,18,0.42)' },
  tileContent: {
    backgroundColor: 'rgba(8,8,22,0.72)',
    borderRadius: 10, margin: 10, padding: 14,
  },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tileCity: { fontSize: 19, fontWeight: '600', color: colors.text },
  tileCountry: { fontSize: 10, color: colors.textMuted, marginTop: 3, letterSpacing: 0.5 },
  tileFlag: { fontSize: 24 },
  tileCost: { fontSize: 11, color: colors.accent, marginTop: 8, marginBottom: 2 },
  tileBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  tileWhen: { fontSize: 11, color: colors.textMuted },
  tag: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 2 },
  tagText: { fontSize: 9, fontWeight: '500', letterSpacing: 1 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderTopWidth: 0.5, borderTopColor: colors.border, backgroundColor: colors.surface },
  addIcon: { fontSize: 16, color: colors.textDim },
  addText: { fontSize: 10, letterSpacing: 1.2, color: colors.textDim, fontWeight: '500' },
  deleteBtn: { position: 'absolute', right: 0, top: 0, bottom: 0, backgroundColor: '#C0392B', paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center' },
  deleteBtnText: { fontSize: 12, color: colors.white, fontWeight: '600', letterSpacing: 0.5 },

  // Map
  mapContainer: { flex: 1 },
  mapPanel: {
    backgroundColor: colors.surface,
    borderTopWidth: 0.5, borderTopColor: colors.border,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    gap: 12,
  },
  panelRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  panelFlag: { fontSize: 28 },
  panelCity: { fontSize: 16, fontWeight: '500', color: colors.text },
  panelCountry: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  panelClose: { padding: 4 },
  panelCloseText: { fontSize: 16, color: colors.textDim },
  panelBtns: { flexDirection: 'row', gap: 10 },
  panelBtnPrimary: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  panelBtnPrimaryText: { fontSize: 11, fontWeight: '600', color: colors.white, letterSpacing: 1 },
  panelBtnSecondary: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  panelBtnSecondaryText: { fontSize: 11, fontWeight: '500', color: colors.textMuted, letterSpacing: 1 },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, gap: 12 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '500', color: colors.text, marginBottom: 4 },
  input: { backgroundColor: colors.surfaceDeep, borderWidth: 0.5, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text },
  addBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  addBtnDisabled: { backgroundColor: colors.primaryLight },
  addBtnText: { fontSize: 12, fontWeight: '600', color: colors.white, letterSpacing: 1.2 },
});
