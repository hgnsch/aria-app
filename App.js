import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { colors } from './theme/colors';
import { AppProvider } from './context/AppContext';

import HomeScreen from './screens/HomeScreen';
import PlanningScreen from './screens/PlanningScreen';
import ItinerariesScreen from './screens/ItinerariesScreen';
import IdeasScreen from './screens/IdeasScreen';
import PreferencesScreen from './screens/PreferencesScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
          paddingBottom: 16,
          paddingTop: 8,
          height: 72,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelStyle: {
          fontSize: 9,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🌍</Text> }}
      />
      <Tab.Screen
        name="Planning"
        component={PlanningScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>✈️</Text> }}
      />
      <Tab.Screen
        name="Itineraries"
        component={ItinerariesScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📋</Text> }}
      />
      <Tab.Screen
        name="Ideas"
        component={IdeasScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>💡</Text> }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <AppProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen
            name="Preferences"
            component={PreferencesScreen}
            options={{ presentation: 'modal' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </AppProvider>
  );
}