import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Image,
  Alert
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { getRecipeSuggestions } from '../../services/recipeService';
import { getAllProducts } from '../../services/inventoryService';
import { Recipe } from '../../types/recipe';

type RecipesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Recipes'>;

const RecipesScreen = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  const navigation = useNavigation<RecipesScreenNavigationProp>();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      loadRecipes();
    }
  }, [isFocused]);

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const savedRecipes = await getRecipeSuggestions();
      setRecipes(savedRecipes);
    } catch (error) {
      console.error("Error loading recipes:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateNewRecipes = async () => {
    setGenerating(true);
    try {
      // Überprüfen, ob Produkte im Inventar vorhanden sind
      const products = await getAllProducts();
      
      if (products.length === 0) {
        Alert.alert(
          "Keine Zutaten vorhanden",
          "Dein Inventar ist leer. Füge zuerst Produkte hinzu, um Rezeptvorschläge zu erhalten.",
          [{ text: "OK" }]
        );
        return;
      }
      
      // Rezepte generieren
      const newRecipes = await getRecipeSuggestions(true);
      setRecipes(newRecipes);
      
      Alert.alert(
        "Rezepte generiert",
        "Neue Rezeptvorschläge wurden basierend auf deinem Inventar erstellt.",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Error generating recipes:", error);
      Alert.alert(
        "Fehler",
        "Bei der Generierung der Rezepte ist ein Fehler aufgetreten. Bitte versuche es später erneut.",
        [{ text: "OK" }]
      );
    } finally {
      setGenerating(false);
    }
  };

  const renderItem = ({ item }: { item: Recipe }) => (
    <TouchableOpacity 
      style={styles.recipeCard}
      onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })}
    >
      <View style={styles.recipeImageContainer}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.recipeImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>Kein Bild</Text>
          </View>
        )}
      </View>
      <View style={styles.recipeInfo}>
        <Text style={styles.recipeTitle}>{item.title}</Text>
        <Text style={styles.recipeDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.recipeMetaInfo}>
          <Text style={styles.recipeTime}>{item.cookingTime} Min.</Text>
          <Text style={styles.recipeDifficulty}>{item.difficulty}</Text>
        </View>
        <View style={styles.ingredientsContainer}>
          <Text style={styles.ingredientsTitle}>Hauptzutaten:</Text>
          <Text style={styles.ingredientsList} numberOfLines={1}>
            {item.ingredients.slice(0, 3).map(ing => ing.name).join(', ')}
            {item.ingredients.length > 3 ? '...' : ''}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rezeptvorschläge</Text>
        <Text style={styles.headerSubtitle}>
          Basierend auf deinen vorhandenen Zutaten
        </Text>
      </View>
      
      <TouchableOpacity 
        style={styles.generateButton}
        onPress={generateNewRecipes}
        disabled={generating}
      >
        {generating ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Text style={styles.generateButtonText}>
            Neue Rezepte generieren
          </Text>
        )}
      </TouchableOpacity>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Rezepte werden geladen...</Text>
        </View>
      ) : recipes.length > 0 ? (
        <FlatList
          data={recipes}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Keine Rezeptvorschläge vorhanden. Generiere neue Rezepte basierend auf deinem Inventar.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#4CAF50',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'white',
    marginTop: 4,
  },
  generateButton: {
    backgroundColor: '#FF9800',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
  recipeCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recipeImageContainer: {
    height: 150,
    width: '100%',
  },
  recipeImage: {
    height: '100%',
    width: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    height: '100%',
    width: '100%',
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#888',
    fontSize: 16,
  },
  recipeInfo: {
    padding: 16,
  },
  recipeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  recipeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  recipeMetaInfo: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  recipeTime: {
    fontSize: 14,
    color: '#666',
    marginRight: 16,
  },
  recipeDifficulty: {
    fontSize: 14,
    color: '#666',
  },
  ingredientsContainer: {
    marginTop: 8,
  },
  ingredientsTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  ingredientsList: {
    fontSize: 14,
    color: '#666',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default RecipesScreen; 