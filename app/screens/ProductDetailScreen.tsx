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
import { getProductById, removeProductFromInventory, updateProductExpiryDate } from '../../services/inventoryService';
import { Product } from '../../types/product';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

type ProductDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProductDetail'>;
type ProductDetailScreenRouteProp = RouteProp<RootStackParamList, 'ProductDetail'>;

const ProductDetailScreen = () => {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  
  const navigation = useNavigation<ProductDetailScreenNavigationProp>();
  const route = useRoute<ProductDetailScreenRouteProp>();
  const { productId } = route.params;

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const productData = await getProductById(productId);
      setProduct(productData);
    } catch (error) {
      console.error("Error loading product:", error);
      Alert.alert(
        "Fehler",
        "Das Produkt konnte nicht geladen werden.",
        [{ text: "Zurück", onPress: () => navigation.goBack() }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveProduct = async () => {
    if (!product) return;
    
    Alert.alert(
      "Produkt entfernen",
      `Möchtest du "${product.name}" wirklich aus deinem Inventar entfernen?`,
      [
        { text: "Abbrechen", style: "cancel" },
        { 
          text: "Entfernen", 
          style: "destructive",
          onPress: async () => {
            try {
              await removeProductFromInventory(product.barcode);
              Alert.alert(
                "Erfolg",
                "Das Produkt wurde aus deinem Inventar entfernt.",
                [{ text: "OK", onPress: () => navigation.navigate('Inventory') }]
              );
            } catch (error) {
              console.error("Error removing product:", error);
              Alert.alert("Fehler", "Das Produkt konnte nicht entfernt werden.");
            }
          }
        }
      ]
    );
  };

  const handleExtendExpiryDate = async (days: number) => {
    if (!product) return;
    
    try {
      const currentExpiryDate = new Date(product.expiryDate);
      const newExpiryDate = new Date(currentExpiryDate);
      newExpiryDate.setDate(newExpiryDate.getDate() + days);
      
      const updatedProduct = await updateProductExpiryDate(
        product.id, 
        format(newExpiryDate, 'yyyy-MM-dd')
      );
      
      setProduct(updatedProduct);
      
      Alert.alert(
        "Erfolg",
        `Das Ablaufdatum wurde um ${days} Tage verlängert.`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Error extending expiry date:", error);
      Alert.alert("Fehler", "Das Ablaufdatum konnte nicht aktualisiert werden.");
    }
  };

  const getExpiryStatusStyle = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry <= 0) {
      return styles.expired;
    } else if (daysUntilExpiry <= 3) {
      return styles.expiringSoon;
    } else if (daysUntilExpiry <= 7) {
      return styles.expiringWarning;
    } else {
      return styles.notExpiring;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd. MMMM yyyy', { locale: de });
    } catch (error) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Produkt wird geladen...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Produkt nicht gefunden</Text>
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
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>{product.name.charAt(0)}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productCategory}>{product.category}</Text>
        
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Barcode:</Text>
            <Text style={styles.infoValue}>{product.barcode}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ablaufdatum:</Text>
            <Text style={[styles.infoValue, getExpiryStatusStyle(product.expiryDate)]}>
              {formatDate(product.expiryDate)}
            </Text>
          </View>
          
          {product.quantity && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Menge:</Text>
              <Text style={styles.infoValue}>{product.quantity}</Text>
            </View>
          )}
          
          {product.nutritionalInfo && (
            <View style={styles.nutritionalInfo}>
              <Text style={styles.sectionTitle}>Nährwertinformationen</Text>
              {Object.entries(product.nutritionalInfo).map(([key, value]) => (
                <View key={key} style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{key}:</Text>
                  <Text style={styles.infoValue}>{value}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Ablaufdatum anpassen</Text>
          <View style={styles.expiryActions}>
            <TouchableOpacity 
              style={styles.extendButton}
              onPress={() => handleExtendExpiryDate(1)}
            >
              <Text style={styles.extendButtonText}>+1 Tag</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.extendButton}
              onPress={() => handleExtendExpiryDate(3)}
            >
              <Text style={styles.extendButtonText}>+3 Tage</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.extendButton}
              onPress={() => handleExtendExpiryDate(7)}
            >
              <Text style={styles.extendButtonText}>+1 Woche</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.removeButton}
          onPress={handleRemoveProduct}
        >
          <Text style={styles.removeButtonText}>Produkt entfernen</Text>
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
    height: 200,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImage: {
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
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  infoSection: {
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  nutritionalInfo: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  actionsContainer: {
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
  expiryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  extendButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  extendButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  removeButton: {
    backgroundColor: '#F44336',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  expired: {
    color: '#F44336',
  },
  expiringSoon: {
    color: '#F44336',
  },
  expiringWarning: {
    color: '#FFC107',
  },
  notExpiring: {
    color: '#4CAF50',
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

export default ProductDetailScreen; 