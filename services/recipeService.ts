import AsyncStorage from '@react-native-async-storage/async-storage';
// Eigene UUID-Implementierung statt der uuid-Bibliothek
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};
import { Recipe, Ingredient } from '../types/recipe';
import { Product } from '../types/product';
import { getAllProducts, getExpiringProducts } from './inventoryService';
import OpenAI from 'openai';

const RECIPES_STORAGE_KEY = 'wisechef_recipes';
const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY'; // Hier Ihren API-Schlüssel eintragen

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Nur für Entwicklungszwecke
});

// Hilfsfunktion zum Laden der Rezepte
const loadRecipes = async (): Promise<Recipe[]> => {
  try {
    const recipesData = await AsyncStorage.getItem(RECIPES_STORAGE_KEY);
    return recipesData ? JSON.parse(recipesData) : [];
  } catch (error) {
    console.error('Error loading recipes:', error);
    return [];
  }
};

// Hilfsfunktion zum Speichern der Rezepte
const saveRecipes = async (recipes: Recipe[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(recipes));
  } catch (error) {
    console.error('Error saving recipes:', error);
    throw new Error('Fehler beim Speichern der Rezepte');
  }
};

// Alle Rezepte abrufen
export const getRecipeSuggestions = async (forceGenerate: boolean = false): Promise<Recipe[]> => {
  const recipes = await loadRecipes();
  
  // Wenn bereits Rezepte vorhanden sind und keine Neugenerierung erzwungen wird
  if (recipes.length > 0 && !forceGenerate) {
    return recipes;
  }
  
  // Andernfalls neue Rezepte generieren
  return await generateRecipes();
};

// Rezept anhand der ID abrufen
export const getRecipeById = async (recipeId: string): Promise<Recipe | null> => {
  const recipes = await loadRecipes();
  return recipes.find(recipe => recipe.id === recipeId) || null;
};

// Rezept löschen
export const deleteRecipe = async (recipeId: string): Promise<boolean> => {
  const recipes = await loadRecipes();
  const updatedRecipes = recipes.filter(recipe => recipe.id !== recipeId);
  
  if (updatedRecipes.length === recipes.length) {
    return false; // Kein Rezept wurde gelöscht
  }
  
  await saveRecipes(updatedRecipes);
  return true;
};

// Neue Rezepte basierend auf dem Inventar generieren
const generateRecipes = async (): Promise<Recipe[]> => {
  try {
    // Alle Produkte und bald ablaufende Produkte abrufen
    const [allProducts, expiringProducts] = await Promise.all([
      getAllProducts(),
      getExpiringProducts(7)
    ]);
    
    if (allProducts.length === 0) {
      return []; // Keine Produkte im Inventar
    }
    
    // Zutaten für die Rezeptgenerierung vorbereiten
    const ingredients = allProducts.map(product => product.name);
    const expiringIngredients = expiringProducts.map(product => product.name);
    
    // Wenn keine OpenAI API verfügbar ist, Beispielrezepte zurückgeben
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY') {
      console.log('Using sample recipes (no OpenAI API key provided)');
      return generateSampleRecipes(allProducts, expiringProducts);
    }
    
    // Prompt für die OpenAI API vorbereiten
    const prompt = `
      Generiere 3 Rezepte basierend auf folgenden Zutaten:
      ${ingredients.join(', ')}
      
      Folgende Zutaten laufen bald ab und sollten bevorzugt verwendet werden:
      ${expiringIngredients.length > 0 ? expiringIngredients.join(', ') : 'Keine'}
      
      Jedes Rezept sollte folgendes Format haben:
      {
        "title": "Rezepttitel",
        "description": "Kurze Beschreibung",
        "ingredients": [
          {"name": "Zutat 1", "amount": "Menge"},
          {"name": "Zutat 2", "amount": "Menge"}
        ],
        "instructions": ["Schritt 1", "Schritt 2", "Schritt 3"],
        "cookingTime": Zubereitungszeit in Minuten,
        "difficulty": "Einfach/Mittel/Schwer",
        "servings": Anzahl der Portionen,
        "tips": ["Tipp 1", "Tipp 2"]
      }
      
      Gib die Rezepte als JSON-Array zurück.
    `;
    
    // OpenAI API aufrufen
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Du bist ein Kochexperte, der kreative und leckere Rezepte basierend auf vorhandenen Zutaten erstellt."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    });
    
    // Antwort parsen
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Keine Antwort von der OpenAI API erhalten');
    }
    
    // JSON aus der Antwort extrahieren
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Konnte kein JSON in der Antwort finden');
    }
    
    const recipesData = JSON.parse(jsonMatch[0]);
    
    // Rezepte formatieren und speichern
    const formattedRecipes: Recipe[] = recipesData.map((recipe: any) => ({
      id: generateUUID(),
      title: recipe.title,
      description: recipe.description,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      cookingTime: recipe.cookingTime,
      difficulty: recipe.difficulty,
      servings: recipe.servings,
      tips: recipe.tips,
      createdAt: new Date().toISOString()
    }));
    
    await saveRecipes(formattedRecipes);
    return formattedRecipes;
  } catch (error) {
    console.error('Error generating recipes:', error);
    // Bei Fehlern Beispielrezepte zurückgeben
    const [allProducts, expiringProducts] = await Promise.all([
      getAllProducts(),
      getExpiringProducts(7)
    ]);
    return generateSampleRecipes(allProducts, expiringProducts);
  }
};

// Beispielrezepte generieren (falls keine OpenAI API verfügbar ist)
const generateSampleRecipes = (products: Product[], expiringProducts: Product[]): Recipe[] => {
  const recipes: Recipe[] = [];
  
  // Kategorisierung der Produkte
  const categories: { [key: string]: string[] } = {};
  products.forEach(product => {
    const category = product.category.split(',')[0].trim();
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(product.name);
  });
  
  // Ablaufende Produkte markieren
  const expiringNames = expiringProducts.map(p => p.name);
  
  // Beispielrezept 1: Pasta-Gericht
  if (categories['Nudeln'] || categories['Pasta']) {
    const pastaIngredients: Ingredient[] = [];
    
    // Grundzutaten
    pastaIngredients.push({ name: 'Pasta', amount: '250g' });
    
    // Gemüse hinzufügen
    if (categories['Gemüse']) {
      categories['Gemüse'].slice(0, 3).forEach(veg => {
        pastaIngredients.push({ 
          name: veg, 
          amount: '100g',
          isExpiringSoon: expiringNames.includes(veg)
        });
      });
    }
    
    // Gewürze
    pastaIngredients.push({ name: 'Salz', amount: 'nach Geschmack' });
    pastaIngredients.push({ name: 'Pfeffer', amount: 'nach Geschmack' });
    pastaIngredients.push({ name: 'Olivenöl', amount: '2 EL' });
    
    recipes.push({
      id: generateUUID(),
      title: 'Schnelle Gemüsepasta',
      description: 'Ein einfaches und schnelles Pastagericht mit frischem Gemüse.',
      ingredients: pastaIngredients,
      instructions: [
        'Wasser in einem großen Topf zum Kochen bringen und salzen.',
        'Pasta nach Packungsanweisung kochen.',
        'In der Zwischenzeit das Gemüse waschen und in kleine Stücke schneiden.',
        'Olivenöl in einer Pfanne erhitzen und das Gemüse darin anbraten.',
        'Mit Salz und Pfeffer würzen.',
        'Die gekochte Pasta abgießen und zum Gemüse geben.',
        'Alles gut vermischen und servieren.'
      ],
      cookingTime: 20,
      difficulty: 'Einfach',
      servings: 2,
      tips: [
        'Für eine cremigere Sauce kannst du etwas Sahne hinzufügen.',
        'Frischer Parmesan passt hervorragend zu diesem Gericht.'
      ],
      createdAt: new Date().toISOString()
    });
  }
  
  // Beispielrezept 2: Salat
  if (categories['Gemüse'] || categories['Obst']) {
    const saladIngredients: Ingredient[] = [];
    
    // Gemüse für den Salat
    if (categories['Gemüse']) {
      categories['Gemüse'].slice(0, 4).forEach(veg => {
        saladIngredients.push({ 
          name: veg, 
          amount: '100g',
          isExpiringSoon: expiringNames.includes(veg)
        });
      });
    }
    
    // Obst für den Salat
    if (categories['Obst']) {
      categories['Obst'].slice(0, 2).forEach(fruit => {
        saladIngredients.push({ 
          name: fruit, 
          amount: '1 Stück',
          isExpiringSoon: expiringNames.includes(fruit)
        });
      });
    }
    
    // Dressing
    saladIngredients.push({ name: 'Olivenöl', amount: '3 EL' });
    saladIngredients.push({ name: 'Balsamico-Essig', amount: '1 EL' });
    saladIngredients.push({ name: 'Honig', amount: '1 TL' });
    saladIngredients.push({ name: 'Salz', amount: 'nach Geschmack' });
    saladIngredients.push({ name: 'Pfeffer', amount: 'nach Geschmack' });
    
    recipes.push({
      id: generateUUID(),
      title: 'Bunter Gartensalat',
      description: 'Ein frischer und gesunder Salat mit saisonalem Gemüse und Obst.',
      ingredients: saladIngredients,
      instructions: [
        'Alle Gemüse- und Obstsorten waschen und in mundgerechte Stücke schneiden.',
        'In einer großen Schüssel vermischen.',
        'Für das Dressing Olivenöl, Balsamico-Essig und Honig verrühren.',
        'Mit Salz und Pfeffer abschmecken.',
        'Das Dressing über den Salat geben und vorsichtig vermischen.',
        'Vor dem Servieren kurz ziehen lassen.'
      ],
      cookingTime: 15,
      difficulty: 'Einfach',
      servings: 2,
      tips: [
        'Geröstete Nüsse oder Kerne geben dem Salat einen zusätzlichen Crunch.',
        'Für eine sättigendere Mahlzeit kannst du gekochtes Quinoa oder Couscous hinzufügen.'
      ],
      createdAt: new Date().toISOString()
    });
  }
  
  // Beispielrezept 3: Smoothie
  if (categories['Obst'] || categories['Milchprodukte']) {
    const smoothieIngredients: Ingredient[] = [];
    
    // Obst für den Smoothie
    if (categories['Obst']) {
      categories['Obst'].slice(0, 3).forEach(fruit => {
        smoothieIngredients.push({ 
          name: fruit, 
          amount: '1 Stück',
          isExpiringSoon: expiringNames.includes(fruit)
        });
      });
    }
    
    // Milchprodukte
    if (categories['Milchprodukte']) {
      const dairy = categories['Milchprodukte'][0];
      smoothieIngredients.push({ 
        name: dairy, 
        amount: '200ml',
        isExpiringSoon: expiringNames.includes(dairy)
      });
    } else {
      smoothieIngredients.push({ name: 'Milch oder Joghurt', amount: '200ml' });
    }
    
    // Zusätzliche Zutaten
    smoothieIngredients.push({ name: 'Honig', amount: '1 EL' });
    smoothieIngredients.push({ name: 'Eiswürfel', amount: 'nach Belieben' });
    
    recipes.push({
      id: generateUUID(),
      title: 'Erfrischender Frucht-Smoothie',
      description: 'Ein gesunder und erfrischender Smoothie, perfekt für den Start in den Tag.',
      ingredients: smoothieIngredients,
      instructions: [
        'Alle Früchte waschen, schälen und in Stücke schneiden.',
        'Früchte, Milchprodukt und Honig in einen Mixer geben.',
        'Bei Bedarf Eiswürfel hinzufügen.',
        'Alles cremig pürieren.',
        'In Gläser füllen und sofort servieren.'
      ],
      cookingTime: 5,
      difficulty: 'Einfach',
      servings: 2,
      tips: [
        'Für zusätzliche Nährstoffe kannst du einen Teelöffel Chiasamen oder Leinsamen hinzufügen.',
        'Gefrorene Früchte machen den Smoothie besonders cremig.'
      ],
      createdAt: new Date().toISOString()
    });
  }
  
  // Wenn keine passenden Rezepte erstellt werden konnten, ein Standardrezept hinzufügen
  if (recipes.length === 0) {
    recipes.push({
      id: generateUUID(),
      title: 'Kreative Resteverwertung',
      description: 'Ein flexibles Rezept zur Verwertung deiner vorhandenen Zutaten.',
      ingredients: products.slice(0, 5).map(p => ({ 
        name: p.name, 
        amount: 'nach Bedarf',
        isExpiringSoon: expiringNames.includes(p.name)
      })),
      instructions: [
        'Alle Zutaten vorbereiten und in geeignete Stücke schneiden.',
        'In einer Pfanne oder einem Topf die Zutaten nach Garzeit sortiert hinzufügen.',
        'Mit deinen Lieblingsgewürzen abschmecken.',
        'Bei mittlerer Hitze garen, bis alles die gewünschte Konsistenz hat.',
        'Auf Tellern anrichten und servieren.'
      ],
      cookingTime: 30,
      difficulty: 'Mittel',
      servings: 2,
      tips: [
        'Experimentiere mit verschiedenen Gewürzen, um den Geschmack zu variieren.',
        'Reste können am nächsten Tag als Füllung für Wraps oder als Topping für Salate verwendet werden.'
      ],
      createdAt: new Date().toISOString()
    });
  }
  
  return recipes;
}; 