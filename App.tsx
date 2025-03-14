import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';

// Screens
import HomeScreen from './app/screens/HomeScreen';
import ScannerScreen from './app/screens/ScannerScreen';
import InventoryScreen from './app/screens/InventoryScreen';
import RecipesScreen from './app/screens/RecipesScreen';
import ProductDetailScreen from './app/screens/ProductDetailScreen';
import RecipeDetailScreen from './app/screens/RecipeDetailScreen';

// Types
export type RootStackParamList = {
  Home: undefined;
  Scanner: { mode: 'add' | 'remove' };
  Inventory: undefined;
  Recipes: undefined;
  ProductDetail: { productId: string };
  RecipeDetail: { recipeId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Fallback-Komponente für den Fall, dass ein Screen nicht geladen werden kann
const FallbackScreen = ({ name }: { name: string }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Fehler beim Laden von {name}</Text>
  </View>
);

export default function App() {
  // Screens mit Error Boundary umgeben
  const renderScreen = (Component: React.ComponentType<any>, name: string) => {
    try {
      return <Component />;
    } catch (error) {
      console.error(`Error rendering ${name}:`, error);
      return <FallbackScreen name={name} />;
    }
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#4CAF50',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ title: 'WiseChef' }} 
          />
          <Stack.Screen 
            name="Scanner" 
            component={ScannerScreen} 
            options={({ route }) => ({ 
              title: route.params.mode === 'add' ? 'Produkt hinzufügen' : 'Produkt entfernen' 
            })} 
          />
          <Stack.Screen 
            name="Inventory" 
            component={InventoryScreen} 
            options={{ title: 'Mein Inventar' }} 
          />
          <Stack.Screen 
            name="Recipes" 
            component={RecipesScreen} 
            options={{ title: 'Rezeptvorschläge' }} 
          />
          <Stack.Screen 
            name="ProductDetail" 
            component={ProductDetailScreen} 
            options={{ title: 'Produktdetails' }} 
          />
          <Stack.Screen 
            name="RecipeDetail" 
            component={RecipeDetailScreen} 
            options={{ title: 'Rezeptdetails' }} 
          />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
} 