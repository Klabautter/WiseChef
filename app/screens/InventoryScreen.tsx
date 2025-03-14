import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { getAllProducts } from '../../services/inventoryService';
import { Product } from '../../types/product';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

type InventoryScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Inventory'>;

const InventoryScreen = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'name' | 'expiry'>('expiry');
  
  const navigation = useNavigation<InventoryScreenNavigationProp>();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      loadProducts();
    }
  }, [isFocused]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const allProducts = await getAllProducts();
      setProducts(allProducts);
      applyFilters(allProducts, searchQuery, sortBy);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (productList: Product[], query: string, sort: 'name' | 'expiry') => {
    let filtered = [...productList];
    
    // Apply search filter
    if (query) {
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.category.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    // Apply sorting
    if (sort === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'expiry') {
      filtered.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    }
    
    setFilteredProducts(filtered);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    applyFilters(products, text, sortBy);
  };

  const handleSort = (sort: 'name' | 'expiry') => {
    setSortBy(sort);
    applyFilters(products, searchQuery, sort);
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

  const formatExpiryDate = (expiryDate: string) => {
    try {
      const date = new Date(expiryDate);
      return formatDistanceToNow(date, { addSuffix: true, locale: de });
    } catch (error) {
      return expiryDate;
    }
  };

  const renderItem = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      style={styles.productItem}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
    >
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productCategory}>{item.category}</Text>
      </View>
      <View style={styles.expiryContainer}>
        <Text style={[styles.expiryDate, getExpiryStatusStyle(item.expiryDate)]}>
          {formatExpiryDate(item.expiryDate)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Produkte suchen..."
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>
      
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sortieren nach:</Text>
        <TouchableOpacity 
          style={[styles.sortButton, sortBy === 'name' && styles.activeSortButton]}
          onPress={() => handleSort('name')}
        >
          <Text style={[styles.sortButtonText, sortBy === 'name' && styles.activeSortButtonText]}>Name</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.sortButton, sortBy === 'expiry' && styles.activeSortButton]}
          onPress={() => handleSort('expiry')}
        >
          <Text style={[styles.sortButtonText, sortBy === 'expiry' && styles.activeSortButtonText]}>Ablaufdatum</Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Produkte werden geladen...</Text>
        </View>
      ) : filteredProducts.length > 0 ? (
        <FlatList
          data={filteredProducts}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery 
              ? 'Keine Produkte gefunden, die deiner Suche entsprechen.' 
              : 'Dein Inventar ist leer. Scanne Produkte, um sie hinzuzufügen.'}
          </Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('Scanner', { mode: 'add' })}
          >
            <Text style={styles.addButtonText}>Produkt hinzufügen</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {filteredProducts.length > 0 && (
        <TouchableOpacity 
          style={styles.floatingButton}
          onPress={() => navigation.navigate('Scanner', { mode: 'add' })}
        >
          <Text style={styles.floatingButtonText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
  },
  searchInput: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    fontSize: 16,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sortLabel: {
    marginRight: 10,
    fontSize: 14,
    color: '#666',
  },
  sortButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginHorizontal: 5,
    backgroundColor: '#f0f0f0',
  },
  activeSortButton: {
    backgroundColor: '#4CAF50',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#666',
  },
  activeSortButtonText: {
    color: 'white',
  },
  listContainer: {
    padding: 16,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
  },
  productCategory: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  expiryContainer: {
    marginLeft: 10,
  },
  expiryDate: {
    fontSize: 14,
    fontWeight: '500',
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
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  floatingButtonText: {
    fontSize: 30,
    color: 'white',
  },
});

export default InventoryScreen; 