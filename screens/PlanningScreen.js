import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, StatusBar,
  TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { colors } from '../theme/colors';
import { useApp } from '../context/AppContext';

const BACKEND = 'https://aria-travel-production.up.railway.app';

const SUGGESTIONS = [
  "Madrid long weekend in May ✈️",
  "Add Tokyo to my wishlist",
  "4-day Rome itinerary",
  "What's Lisbon like in October?",
];

export default function PlanningScreen() {
const { ariaPreferences, addToWishlist, removeFromWishlist, wishlist } = useApp();

  const [messages, setMessages] = useState([
    {
      id: '0', role: 'aria',
      text: "Hey Marc! I'm Aria — your personal travel agent. Where are we heading? ✈️"
    }
  ]);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const scrollRef = useRef(null);

  async function send(text) {
    const msg = text || input.trim();
    if (!msg || loading) return;

    setInput('');
    setShowSuggestions(false);

    const userMsg = { id: Date.now().toString(), role: 'user', text: msg };
    const newHistory = [...history, { role: 'user', content: msg }];

    setMessages(prev => [...prev, userMsg, { id: 'typing', role: 'typing', text: '' }]);
    setHistory(newHistory);
    setLoading(true);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const res = await fetch(BACKEND + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newHistory, user_preferences: ariaPreferences })
      });
      const data = await res.json();
      const reply = data.reply || 'Something went wrong.';

      // Act on tool calls from Aria
      if (data.tool_calls && data.tool_calls.length > 0) {
        data.tool_calls.forEach(tool => {
          if (tool.name === 'wishlist_update' && tool.input.action === 'add') {
            addToWishlist({
              city: tool.input.destination,
              destination: tool.input.destination,
              travel_window: tool.input.target_travel_window || null,
              notes: tool.input.notes || '',
              flag: '📍',
              lat: 0,
              lon: 0,
            });
          }
          if (tool.name === 'wishlist_update' && tool.input.action === 'remove') {
            // removeFromWishlist by city name
            const { wishlist } = useApp();
            const item = wishlist.find(w =>
              w.city.toLowerCase() === tool.input.destination.toLowerCase()
            );
            if (item) removeFromWishlist(item.id);
          }
        });
      }

      setHistory(prev => [...prev, { role: 'assistant', content: reply }]);
      setMessages(prev => [
        ...prev.filter(m => m.id !== 'typing'),
        { id: Date.now().toString(), role: 'aria', text: reply }
      ]);
    } catch (e) {
      setMessages(prev => [
        ...prev.filter(m => m.id !== 'typing'),
        { id: Date.now().toString(), role: 'aria', text: 'Could not reach Aria. Check your connection.' }
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
        keyboardVerticalOffset={0}
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
                <View key={msg.id} style={styles.ariaRow}>
                  <View style={styles.ariaAvatar}><Text style={styles.ariaAvatarText}>A</Text></View>
                  <View style={[styles.bubble, styles.ariaBubble]}>
                    <Text style={styles.ariaText}>{msg.text}</Text>
                  </View>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderBottomWidth: 0.5, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarText: { fontSize: 16 },
  headerName: { fontSize: 15, fontWeight: '500', color: colors.text },
  headerSub: { fontSize: 11, color: colors.primary, marginTop: 1 },
  messages: { flex: 1 },
  messagesContent: { padding: 16, gap: 12 },
  ariaRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  userRow: { flexDirection: 'row-reverse' },
  ariaAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  ariaAvatarText: { fontSize: 11, fontWeight: '500', color: colors.primary },
  bubble: { maxWidth: '78%', padding: 10, paddingHorizontal: 14, borderRadius: 16 },
  ariaBubble: { backgroundColor: colors.surface, borderTopLeftRadius: 4 },
  userBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  ariaText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  userText: { fontSize: 14, color: colors.white, lineHeight: 20 },
  suggestions: { maxHeight: 48 },
  suggestionsContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  chip: {
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14,
    backgroundColor: colors.surface,
  },
  chipText: { fontSize: 12, color: colors.textMuted },
  inputArea: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: 12, borderTopWidth: 0.5, borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1, borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 20, paddingVertical: 9, paddingHorizontal: 16,
    fontSize: 14, maxHeight: 100, backgroundColor: colors.surfaceDeep,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.border },
  sendBtnText: { color: colors.white, fontSize: 18, fontWeight: '600' },
});