import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  Image,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { getInventory } from '../../services/inventoryService';
import { getRecipeSuggestions } from '../../services/recipeService';
import { Product } from '../../types/Product';
import { Recipe } from '../../types/Recipe';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen = () => {
  const [inventory, setInventory] = useState<Product[]>([]);
  const [recipeSuggestions, setRecipeSuggestions] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const navigation = useNavigation<HomeScreenNavigationProp>();

  const loadData = async () => {
    setLoading(true);
    try {
      // Inventar laden
      const inventoryData = await getInventory();
      setInventory(inventoryData);
      
      // Rezeptvorschläge basierend auf dem Inventar laden
      if (inventoryData.length > 0) {
        const suggestions = await getRecipeSuggestions(inventoryData);
        setRecipeSuggestions(suggestions);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const navigateToScanner = (mode: 'add' | 'remove') => {
    navigation.navigate('Scanner', { mode });
  };

  const navigateToRecipes = () => {
    navigation.navigate('Recipes');
  };

  const navigateToInventory = () => {
    navigation.navigate('Inventory');
  };

  const navigateToRecipeDetail = (recipe: Recipe) => {
    navigation.navigate('RecipeDetail', { recipe });
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Daten werden geladen...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#4CAF50']}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>WiseChef</Text>
        <Text style={styles.subtitle}>Dein smarter Küchenhelfer</Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigateToScanner('add')}
        >
          <Text style={styles.actionButtonText}>Produkt hinzufügen</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.removeButton]}
          onPress={() => navigateToScanner('remove')}
        >
          <Text style={styles.actionButtonText}>Produkt entnehmen</Text>
        </TouchableOpacity>
      </View>

      {/* Rezeptvorschläge */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Rezeptvorschläge</Text>
          <TouchableOpacity onPress={navigateToRecipes}>
            <Text style={styles.seeAllText}>Alle anzeigen</Text>
          </TouchableOpacity>
        </View>
        
        {recipeSuggestions.length > 0 ? (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScrollView}
          >
            {recipeSuggestions.slice(0, 5).map((recipe) => (
              <TouchableOpacity 
                key={recipe.id} 
                style={styles.recipeCard}
                onPress={() => navigateToRecipeDetail(recipe)}
              >
                {recipe.imageUrl ? (
                  <Image 
                    source={{ uri: recipe.imageUrl }} 
                    style={styles.recipeImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Text style={styles.placeholderText}>Kein Bild</Text>
                  </View>
                )}
                <View style={styles.recipeInfo}>
                  <Text style={styles.recipeTitle} numberOfLines={2}>{recipe.name}</Text>
                  <Text style={styles.recipeDetail}>{recipe.duration} Min. • {recipe.difficulty}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Füge Produkte hinzu, um Rezeptvorschläge zu erhalten
            </Text>
          </View>
        )}
      </View>

      {/* Produkte im Kühlschrank */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Produkte im Kühlschrank</Text>
          <TouchableOpacity onPress={navigateToInventory}>
            <Text style={styles.seeAllText}>Alle anzeigen</Text>
          </TouchableOpacity>
        </View>
        
        {inventory.length > 0 ? (
          <View style={styles.productGrid}>
            {inventory.slice(0, 6).map((product) => (
              <View key={product.id} style={styles.productCard}>
                <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                <Text style={styles.productQuantity}>Menge: {product.quantity || 1}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Keine Produkte im Kühlschrank
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.footerButton}
          onPress={navigateToInventory}
        >
          <Text style={styles.footerButtonText}>Zum Inventar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.footerButton, styles.recipesButton]}
          onPress={navigateToRecipes}
        >
          <Text style={styles.footerButtonText}>Zu den Rezepten</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4CAF50',
  },
  header: {
    padding: 20,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  removeButton: {
    backgroundColor: '#FF9800',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAllText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
  },
  horizontalScrollView: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  recipeCard: {
    width: 200,
    backgroundColor: 'white',
    borderRadius: 8,
    marginRight: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  recipeImage: {
    width: '100%',
    height: 120,
  },
  placeholderImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#757575',
  },
  recipeInfo: {
    padding: 10,
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  recipeDetail: {
    fontSize: 12,
    color: '#757575',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  productQuantity: {
    fontSize: 12,
    color: '#757575',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 20,
  },
  emptyStateText: {
    color: '#757575',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 20,
  },
  footerButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  recipesButton: {
    backgroundColor: '#9C27B0',
  },
  footerButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default HomeScreen; 