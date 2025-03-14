import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { getRecipeById, deleteRecipe } from '../../services/recipeService';
import { Recipe, Ingredient } from '../../types/recipe';
import { getAllProducts } from '../../services/inventoryService';
import { Product } from '../../types/product';

type RecipeDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'RecipeDetail'>;
type RecipeDetailScreenRouteProp = RouteProp<RootStackParamList, 'RecipeDetail'>;

const RecipeDetailScreen = () => {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [inventory, setInventory] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const navigation = useNavigation<RecipeDetailScreenNavigationProp>();
  const route = useRoute<RecipeDetailScreenRouteProp>();
  const { recipeId } = route.params;

  useEffect(() => {
    loadData();
  }, [recipeId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [recipeData, inventoryData] = await Promise.all([
        getRecipeById(recipeId),
        getAllProducts()
      ]);
      
      setRecipe(recipeData);
      setInventory(inventoryData);
    } catch (error) {
      console.error("Error loading recipe:", error);
      Alert.alert(
        "Fehler",
        "Das Rezept konnte nicht geladen werden.",
        [{ text: "Zurück", onPress: () => navigation.goBack() }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecipe = async () => {
    if (!recipe) return;
    
    Alert.alert(
      "Rezept löschen",
      `Möchtest du "${recipe.title}" wirklich löschen?`,
      [
        { text: "Abbrechen", style: "cancel" },
        { 
          text: "Löschen", 
          style: "destructive",
          onPress: async () => {
            try {
              await deleteRecipe(recipe.id);
              Alert.alert(
                "Erfolg",
                "Das Rezept wurde gelöscht.",
                [{ text: "OK", onPress: () => navigation.navigate('Recipes') }]
              );
            } catch (error) {
              console.error("Error deleting recipe:", error);
              Alert.alert("Fehler", "Das Rezept konnte nicht gelöscht werden.");
            }
          }
        }
      ]
    );
  };

  const checkIngredientAvailability = (ingredient: Ingredient) => {
    // Überprüfen, ob die Zutat im Inventar vorhanden ist
    const found = inventory.some(product => 
      product.name.toLowerCase().includes(ingredient.name.toLowerCase()) ||
      (product.category && ingredient.name.toLowerCase().includes(product.category.toLowerCase()))
    );
    
    return found;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Rezept wird geladen...</Text>
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Rezept nicht gefunden</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Zurück</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {recipe.imageUrl ? (
          <Image source={{ uri: recipe.imageUrl }} style={styles.recipeImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>{recipe.title.charAt(0)}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={styles.recipeTitle}>{recipe.title}</Text>
        
        <View style={styles.metaInfoContainer}>
          <View style={styles.metaInfoItem}>
            <Text style={styles.metaInfoLabel}>Zubereitungszeit</Text>
            <Text style={styles.metaInfoValue}>{recipe.cookingTime} Min.</Text>
          </View>
          <View style={styles.metaInfoItem}>
            <Text style={styles.metaInfoLabel}>Schwierigkeit</Text>
            <Text style={styles.metaInfoValue}>{recipe.difficulty}</Text>
          </View>
          <View style={styles.metaInfoItem}>
            <Text style={styles.metaInfoLabel}>Portionen</Text>
            <Text style={styles.metaInfoValue}>{recipe.servings}</Text>
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Beschreibung</Text>
          <Text style={styles.description}>{recipe.description}</Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Zutaten</Text>
          {recipe.ingredients.map((ingredient, index) => {
            const isAvailable = checkIngredientAvailability(ingredient);
            return (
              <View key={index} style={styles.ingredientItem}>
                <Text style={[
                  styles.ingredientName,
                  isAvailable ? styles.availableIngredient : styles.unavailableIngredient
                ]}>
                  {ingredient.name}
                </Text>
                {ingredient.amount && (
                  <Text style={styles.ingredientAmount}>{ingredient.amount}</Text>
                )}
              </View>
            );
          })}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Zubereitung</Text>
          {recipe.instructions.map((step, index) => (
            <View key={index} style={styles.instructionStep}>
              <View style={styles.stepNumberContainer}>
                <Text style={styles.stepNumber}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
        
        {recipe.tips && recipe.tips.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tipps</Text>
            {recipe.tips.map((tip, index) => (
              <Text key={index} style={styles.tipText}>• {tip}</Text>
            ))}
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={handleDeleteRecipe}
        >
          <Text style={styles.deleteButtonText}>Rezept löschen</Text>
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
  header: {
    height: 250,
    backgroundColor: '#e0e0e0',
  },
  recipeImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: 'white',
  },
  contentContainer: {
    padding: 16,
  },
  recipeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  metaInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  metaInfoItem: {
    alignItems: 'center',
  },
  metaInfoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  metaInfoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  ingredientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  ingredientName: {
    fontSize: 16,
  },
  ingredientAmount: {
    fontSize: 16,
    color: '#666',
  },
  availableIngredient: {
    color: '#4CAF50',
  },
  unavailableIngredient: {
    color: '#F44336',
  },
  instructionStep: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumberContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumber: {
    color: 'white',
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  tipText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  deleteButton: {
    backgroundColor: '#F44336',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#F44336',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RecipeDetailScreen; 