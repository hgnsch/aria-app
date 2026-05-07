import { createContext, useContext, useState, useCallback } from 'react';

const DEFAULT_PREFERENCES = {
  name: 'Marc',
  email: 'marc@example.com',
  home_airports: ['ZRH'],
  currency: 'CHF',
  cabin_class: 'Economy',
  direct_flights_only: true,
  preferred_departure: 'Morning',
  preferred_airlines: ['SWISS', 'Iberia'],
  always_include_baggage: false,
  min_hotel_stars: 4,
  hotel_location_priority: 'Central',
  room_type: 'King / Double',
  breakfast_included: false,
  pace: 'Relaxed',
  travelling_as: 'Solo',
  food_interests: ['Local', 'Fine dining'],
  activity_interests: ['Museums', 'City walks', 'Rooftop bars'],
  instagrammable_spots: true,
  budget_sensitivity: 'Balanced',
  price_alert_threshold: 50,
  price_drop_alerts: true,
  best_time_alerts: true,
  trip_inspiration: false,
};

const DEFAULT_WISHLIST = [
  { id: '1', city: 'Tokyo', country: 'Japan', flag: '🇯🇵', lat: 35.7, lon: 139.7, when: 'Autumn 2026 · 10 days', travel_window: 'Autumn 2026', tag: 'Alert set', tagType: 'alert', notes: '' },
  { id: '2', city: 'Lisbon', country: 'Portugal', flag: '🇵🇹', lat: 38.7, lon: -9.1, when: 'Spring 2026 · 5 days', travel_window: 'Spring 2026', tag: 'Itinerary ready', tagType: 'ready', notes: '' },
  { id: '3', city: 'Barcelona', country: 'Spain', flag: '🇪🇸', lat: 41.4, lon: 2.2, when: 'Flexible', travel_window: 'Flexible', tag: 'Exploring', tagType: 'explore', notes: '' },
  { id: '4', city: 'Kyoto', country: 'Japan', flag: '🇯🇵', lat: 35.0, lon: 135.8, when: 'No date set', travel_window: null, tag: 'Exploring', tagType: 'explore', notes: '' },
];

const DEFAULT_ITINERARIES = [
  { id: '1', city: 'Madrid', country: 'Spain', status: 'Upcoming', dates: 'May 9 – 12 · 4 days · Solo', month: 'May 2026', days: ['Day 1', 'Day 2', 'Day 3', 'Day 4'], colorDark: '#26215C', colorLight: '#534AB7' },
  { id: '2', city: 'Rome', country: 'Italy', status: 'Planned', dates: 'June 20 – 24 · 4 days · Solo', month: 'June 2026', days: ['Day 1', 'Day 2', 'Day 3', 'Day 4'], colorDark: '#085041', colorLight: '#1D9E75' },
];

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [wishlist, setWishlist] = useState(DEFAULT_WISHLIST);
  const [itineraries, setItineraries] = useState(DEFAULT_ITINERARIES);
  const [chatHistory, setChatHistory] = useState([]);

  const updatePreference = useCallback((key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  }, []);

  const addToWishlist = useCallback((destination) => {
    const newItem = {
      id: Date.now().toString(),
      city: destination.city || destination.destination,
      country: destination.country || '',
      flag: destination.flag || '📍',
      lat: destination.lat || 0,
      lon: destination.lon || 0,
      when: destination.travel_window || 'No date set',
      travel_window: destination.travel_window || null,
      tag: 'Exploring',
      tagType: 'explore',
      notes: destination.notes || '',
    };
    setWishlist(prev => [...prev, newItem]);
    return newItem;
  }, []);

  const removeFromWishlist = useCallback((id) => {
    setWishlist(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateWishlistItem = useCallback((id, updates) => {
    setWishlist(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  }, []);

  const addItinerary = useCallback((itinerary) => {
    const newItin = { id: Date.now().toString(), ...itinerary };
    setItineraries(prev => [...prev, newItin]);
    return newItin;
  }, []);

  const updateItinerary = useCallback((id, updates) => {
    setItineraries(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  }, []);

  const appendChatHistory = useCallback((role, content) => {
    setChatHistory(prev => [...prev, { role, content }]);
  }, []);

  const clearChatHistory = useCallback(() => {
    setChatHistory([]);
  }, []);

  const ariaPreferences = {
    name: preferences.name,
    home_airports: preferences.home_airports,
    cabin_class: preferences.cabin_class.toLowerCase(),
    hotel_stars: preferences.min_hotel_stars,
    direct_flights_only: preferences.direct_flights_only,
    currency: preferences.currency,
    travel_style: preferences.activity_interests,
    household: preferences.travelling_as.toLowerCase(),
    wishlist: wishlist.map(w => ({ destination: w.city, travel_window: w.travel_window, notes: w.notes })),
    past_trips: [],
    budget_sensitivity: preferences.budget_sensitivity,
    preferred_airlines: preferences.preferred_airlines,
  };

  return (
    <AppContext.Provider value={{
      preferences,
      updatePreference,
      wishlist,
      addToWishlist,
      removeFromWishlist,
      updateWishlistItem,
      itineraries,
      addItinerary,
      updateItinerary,
      chatHistory,
      appendChatHistory,
      clearChatHistory,
      ariaPreferences,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}