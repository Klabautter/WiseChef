import axios from 'axios';
import { Product, ProductResponse } from '../types/product';
import { addDays, format } from 'date-fns';

const OPEN_FOOD_FACTS_API = 'https://world.openfoodfacts.org/api/v0/product/';

// Mock-Produkte für Testzwecke
const MOCK_PRODUCTS: { [key: string]: Partial<Product> } = {
  '3017620422003': {
    name: 'Nutella',
    category: 'Brotaufstriche',
    imageUrl: 'https://images.openfoodfacts.org/images/products/301/762/042/2003/front_de.429.400.jpg',
    nutritionalInfo: {
      'Energie': '539 kcal',
      'Fett': '30.9g',
      'Kohlenhydrate': '57.5g',
      'Proteine': '6.3g'
    },
    quantity: '400g'
  },
  '5449000000996': {
    name: 'Coca-Cola',
    category: 'Getränke',
    imageUrl: 'https://images.openfoodfacts.org/images/products/544/900/000/0996/front_de.248.400.jpg',
    nutritionalInfo: {
      'Energie': '42 kcal',
      'Kohlenhydrate': '10.6g',
      'Zucker': '10.6g'
    },
    quantity: '1.5L'
  },
  '4000417025005': {
    name: 'Haribo Goldbären',
    category: 'Süßigkeiten',
    imageUrl: 'https://images.openfoodfacts.org/images/products/400/041/702/5005/front_de.207.400.jpg',
    nutritionalInfo: {
      'Energie': '343 kcal',
      'Fett': '0.5g',
      'Kohlenhydrate': '77g',
      'Zucker': '46g',
      'Proteine': '6.9g'
    },
    quantity: '200g'
  },
  '4008400202037': {
    name: 'Ritter Sport Schokolade',
    category: 'Süßigkeiten',
    imageUrl: 'https://images.openfoodfacts.org/images/products/400/840/020/2037/front_de.97.400.jpg',
    nutritionalInfo: {
      'Energie': '535 kcal',
      'Fett': '29.5g',
      'Kohlenhydrate': '59g',
      'Zucker': '56g',
      'Proteine': '5.9g'
    },
    quantity: '100g'
  },
  '4311501659717': {
    name: 'Müllermilch Erdbeere',
    category: 'Milchprodukte',
    imageUrl: 'https://images.openfoodfacts.org/images/products/431/150/165/9717/front_de.87.400.jpg',
    nutritionalInfo: {
      'Energie': '89 kcal',
      'Fett': '1.5g',
      'Kohlenhydrate': '13.5g',
      'Zucker': '13.5g',
      'Proteine': '3.3g'
    },
    quantity: '400ml'
  }
};

// Produkt anhand des Barcodes abrufen
export const getProductByBarcode = async (barcode: string): Promise<Product | null> => {
  try {
    // Versuche zuerst, das Produkt von der API zu holen
    const response = await axios.get<ProductResponse>(`${OPEN_FOOD_FACTS_API}${barcode}.json`);
    
    if (response.data.status !== 1 || !response.data.product) {
      // Wenn das Produkt nicht in der API gefunden wurde, versuche es mit den Mock-Daten
      return getMockProduct(barcode);
    }
    
    const { product } = response.data;
    
    // Ablaufdatum basierend auf der Produktkategorie schätzen
    const expiryDate = estimateExpiryDate(product.categories || '');
    
    // Nährwertinformationen extrahieren, falls vorhanden
    const nutritionalInfo: { [key: string]: string } = {};
    if (product.nutriments) {
      if (product.nutriments.energy) {
        nutritionalInfo['Energie'] = `${product.nutriments.energy} kcal`;
      }
      if (product.nutriments.fat) {
        nutritionalInfo['Fett'] = `${product.nutriments.fat}g`;
      }
      if (product.nutriments.carbohydrates) {
        nutritionalInfo['Kohlenhydrate'] = `${product.nutriments.carbohydrates}g`;
      }
      if (product.nutriments.proteins) {
        nutritionalInfo['Proteine'] = `${product.nutriments.proteins}g`;
      }
      if (product.nutriments.salt) {
        nutritionalInfo['Salz'] = `${product.nutriments.salt}g`;
      }
    }
    
    return {
      id: '', // Wird beim Hinzufügen zum Inventar generiert
      barcode,
      name: product.product_name || 'Unbekanntes Produkt',
      category: product.categories || 'Sonstiges',
      expiryDate,
      addedDate: format(new Date(), 'yyyy-MM-dd'),
      quantity: product.quantity,
      imageUrl: product.image_url,
      nutritionalInfo: Object.keys(nutritionalInfo).length > 0 ? nutritionalInfo : undefined
    };
  } catch (error) {
    console.error('Error fetching product data:', error);
    // Bei Fehlern versuche es mit den Mock-Daten
    return getMockProduct(barcode);
  }
};

// Hilfsfunktion zur Schätzung des Ablaufdatums basierend auf der Produktkategorie
const estimateExpiryDate = (category: string): string => {
  const today = new Date();
  let daysToAdd = 7; // Standardwert: 1 Woche
  
  const lowerCategory = category.toLowerCase();
  
  // Kategorien und geschätzte Haltbarkeit
  if (lowerCategory.includes('milch') || lowerCategory.includes('joghurt') || lowerCategory.includes('dairy')) {
    daysToAdd = 7; // Milchprodukte: ca. 1 Woche
  } else if (lowerCategory.includes('fleisch') || lowerCategory.includes('wurst') || lowerCategory.includes('meat')) {
    daysToAdd = 5; // Fleisch: ca. 5 Tage
  } else if (lowerCategory.includes('obst') || lowerCategory.includes('gemüse') || lowerCategory.includes('fruit') || lowerCategory.includes('vegetable')) {
    daysToAdd = 7; // Obst und Gemüse: ca. 1 Woche
  } else if (lowerCategory.includes('brot') || lowerCategory.includes('bread')) {
    daysToAdd = 5; // Brot: ca. 5 Tage
  } else if (lowerCategory.includes('konserve') || lowerCategory.includes('canned')) {
    daysToAdd = 365; // Konserven: ca. 1 Jahr
  } else if (lowerCategory.includes('tiefkühl') || lowerCategory.includes('frozen')) {
    daysToAdd = 90; // Tiefkühlprodukte: ca. 3 Monate
  } else if (lowerCategory.includes('getränk') || lowerCategory.includes('beverage')) {
    daysToAdd = 30; // Getränke: ca. 1 Monat
  } else if (lowerCategory.includes('snack') || lowerCategory.includes('süßigkeit') || lowerCategory.includes('sweet')) {
    daysToAdd = 60; // Snacks und Süßigkeiten: ca. 2 Monate
  }
  
  return format(addDays(today, daysToAdd), 'yyyy-MM-dd');
};

// Hilfsfunktion zum Abrufen von Mock-Produkten
const getMockProduct = (barcode: string): Product | null => {
  const mockProduct = MOCK_PRODUCTS[barcode];
  
  if (!mockProduct) {
    return null;
  }
  
  const expiryDate = estimateExpiryDate(mockProduct.category || 'Sonstiges');
  
  return {
    id: '', // Wird beim Hinzufügen zum Inventar generiert
    barcode,
    name: mockProduct.name || 'Unbekanntes Produkt',
    category: mockProduct.category || 'Sonstiges',
    expiryDate,
    addedDate: format(new Date(), 'yyyy-MM-dd'),
    quantity: mockProduct.quantity,
    imageUrl: mockProduct.imageUrl,
    nutritionalInfo: mockProduct.nutritionalInfo
  };
}; 