import AsyncStorage from '@react-native-async-storage/async-storage';
// Eigene UUID-Implementierung statt der uuid-Bibliothek
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};
import { Product } from '../types/product';
import { getProductByBarcode } from './productService';

const INVENTORY_STORAGE_KEY = 'wisechef_inventory';

// Hilfsfunktion zum Laden des Inventars
const loadInventory = async (): Promise<Product[]> => {
  try {
    const inventoryData = await AsyncStorage.getItem(INVENTORY_STORAGE_KEY);
    return inventoryData ? JSON.parse(inventoryData) : [];
  } catch (error) {
    console.error('Error loading inventory:', error);
    return [];
  }
};

// Hilfsfunktion zum Speichern des Inventars
const saveInventory = async (inventory: Product[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(inventory));
  } catch (error) {
    console.error('Error saving inventory:', error);
    throw new Error('Fehler beim Speichern des Inventars');
  }
};

// Alle Produkte abrufen
export const getAllProducts = async (): Promise<Product[]> => {
  return await loadInventory();
};

// Produkt anhand der ID abrufen
export const getProductById = async (productId: string): Promise<Product | null> => {
  const inventory = await loadInventory();
  return inventory.find(product => product.id === productId) || null;
};

// Produkt zum Inventar hinzufügen
export const addProductToInventory = async (product: Product): Promise<Product> => {
  const inventory = await loadInventory();
  
  // Überprüfen, ob das Produkt bereits im Inventar ist
  const existingProductIndex = inventory.findIndex(p => p.barcode === product.barcode);
  
  if (existingProductIndex >= 0) {
    // Wenn das Produkt bereits existiert, aktualisieren wir das Ablaufdatum
    inventory[existingProductIndex] = {
      ...inventory[existingProductIndex],
      expiryDate: product.expiryDate,
      addedDate: new Date().toISOString()
    };
  } else {
    // Neues Produkt hinzufügen
    const newProduct: Product = {
      ...product,
      id: generateUUID(),
      addedDate: new Date().toISOString()
    };
    inventory.push(newProduct);
  }
  
  await saveInventory(inventory);
  return existingProductIndex >= 0 ? inventory[existingProductIndex] : product;
};

// Produkt aus dem Inventar entfernen
export const removeProductFromInventory = async (barcode: string): Promise<boolean> => {
  const inventory = await loadInventory();
  const initialLength = inventory.length;
  
  const updatedInventory = inventory.filter(product => product.barcode !== barcode);
  
  if (updatedInventory.length === initialLength) {
    return false; // Kein Produkt wurde entfernt
  }
  
  await saveInventory(updatedInventory);
  return true;
};

// Ablaufdatum eines Produkts aktualisieren
export const updateProductExpiryDate = async (productId: string, newExpiryDate: string): Promise<Product> => {
  const inventory = await loadInventory();
  const productIndex = inventory.findIndex(product => product.id === productId);
  
  if (productIndex === -1) {
    throw new Error('Produkt nicht gefunden');
  }
  
  inventory[productIndex] = {
    ...inventory[productIndex],
    expiryDate: newExpiryDate
  };
  
  await saveInventory(inventory);
  return inventory[productIndex];
};

// Bald ablaufende Produkte abrufen
export const getExpiringProducts = async (days: number = 7): Promise<Product[]> => {
  const inventory = await loadInventory();
  const today = new Date();
  
  return inventory.filter(product => {
    const expiryDate = new Date(product.expiryDate);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= days && daysUntilExpiry >= 0;
  }).sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
}; 