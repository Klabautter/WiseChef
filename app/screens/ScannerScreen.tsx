import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  TextInput,
  ScrollView,
  ToastAndroid,
  Platform
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { getProductByBarcode } from '../../services/productService';
import { addProductToInventory, removeProductFromInventory } from '../../services/inventoryService';

type ScannerScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Scanner'>;
type ScannerScreenRouteProp = RouteProp<RootStackParamList, 'Scanner'>;

// Mock-Barcodes für Testzwecke (als Fallback)
const MOCK_BARCODES = [
  { code: '3017620422003', name: 'Nutella' },
  { code: '5449000000996', name: 'Coca-Cola' },
  { code: '4000417025005', name: 'Haribo Goldbären' },
  { code: '4008400202037', name: 'Ritter Sport Schokolade' },
  { code: '4311501659717', name: 'Müllermilch Erdbeere' }
];

const ScannerScreen = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [useCameraScanner, setUseCameraScanner] = useState(true);
  const [lastScannedProduct, setLastScannedProduct] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  
  const navigation = useNavigation<ScannerScreenNavigationProp>();
  const route = useRoute<ScannerScreenRouteProp>();
  const { mode } = route.params;

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
        if (status !== 'granted') {
          // Wenn keine Kamera-Berechtigung, auf manuelle Eingabe umschalten
          setUseCameraScanner(false);
        }
      } catch (error) {
        console.error('Error requesting camera permission:', error);
        setHasPermission(false);
        setUseCameraScanner(false);
      }
    })();
  }, []);

  // Wenn eine Benachrichtigung gesetzt wird, automatisch nach 1,5 Sekunden entfernen
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleBarCodeScanned = ({ data }: { type: string, data: string }) => {
    // Prüfen, ob wir gerade laden oder ob der gleiche Barcode kürzlich gescannt wurde
    if (loading) return;
    
    const now = Date.now();
    // Verhindern, dass der gleiche Barcode innerhalb von 2 Sekunden mehrfach gescannt wird
    if (data === lastScannedBarcode && now - lastScanTimeRef.current < 2000) {
      return;
    }
    
    // Aktualisiere den letzten gescannten Barcode und die Zeit
    setLastScannedBarcode(data);
    lastScanTimeRef.current = now;
    
    // Starte die Verarbeitung des Barcodes
    processBarcode(data);
  };

  const handleManualScan = async () => {
    if (!barcodeInput || loading) return;
    processBarcode(barcodeInput);
  };

  // Hilfsfunktion für Benachrichtigungen
  const showNotification = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      // Für iOS und andere Plattformen verwenden wir unsere eigene Benachrichtigung
      setNotification(message);
    }
  };

  const processBarcode = async (barcode: string) => {
    setLoading(true);
    
    try {
      if (mode === 'add') {
        // Produkt zur Datenbank hinzufügen
        const product = await getProductByBarcode(barcode);
        
        if (product) {
          await addProductToInventory(product);
          
          // Kürze den Produktnamen, wenn er zu lang ist
          const truncatedName = product.name.length > 25 
            ? product.name.substring(0, 22) + '...' 
            : product.name;
          
          setLastScannedProduct(truncatedName);
          
          // Zeige Benachrichtigung
          showNotification(`${truncatedName} wurde hinzugefügt`);
        } else {
          showNotification("Produkt nicht gefunden");
          setBarcodeInput('');
        }
      } else if (mode === 'remove') {
        // Produkt aus dem Inventar entfernen
        const removed = await removeProductFromInventory(barcode);
        
        if (removed) {
          showNotification("Produkt wurde entfernt");
        } else {
          showNotification("Produkt nicht im Inventar gefunden");
          setBarcodeInput('');
        }
      }
    } catch (error) {
      console.error("Scanning error:", error);
      showNotification("Fehler beim Scannen");
      setBarcodeInput('');
    } finally {
      setLoading(false);
    }
  };

  const toggleScanMode = () => {
    setUseCameraScanner(!useCameraScanner);
    setBarcodeInput('');
  };

  const useMockBarcode = (index: number) => {
    setBarcodeInput(MOCK_BARCODES[index].code);
  };

  const goToRecipes = () => {
    navigation.navigate('Recipes');
  };

  // Wenn keine Kamera-Berechtigung und Kamera-Modus aktiv
  if (hasPermission === false && useCameraScanner) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Kein Zugriff auf die Kamera</Text>
        <TouchableOpacity 
          style={styles.permissionButton}
          onPress={async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
          }}
        >
          <Text style={styles.permissionButtonText}>Zugriff erneut anfordern</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.toggleButton}
          onPress={toggleScanMode}
        >
          <Text style={styles.toggleButtonText}>Zur manuellen Eingabe wechseln</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Zurück</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Kamera-Scanner-Ansicht
  if (useCameraScanner) {
    return (
      <View style={styles.container}>
        {hasPermission === null ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Kamerazugriff wird angefordert...</Text>
          </View>
        ) : (
          <>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ["ean13", "ean8", "upc_e", "upc_a"]
              }}
              onBarcodeScanned={handleBarCodeScanned}
              onMountError={(error) => {
                console.error("Camera mount error:", error);
                setUseCameraScanner(false);
              }}
            >
              {/* Status-Leiste für zuletzt gescanntes Produkt */}
              {lastScannedProduct && (
                <View style={styles.statusBar}>
                  <Text style={styles.statusText}>
                    Zuletzt: {lastScannedProduct}
                  </Text>
                </View>
              )}
              
              {/* Benachrichtigung */}
              {notification && (
                <View style={styles.notificationContainer}>
                  <Text style={styles.notificationText}>{notification}</Text>
                </View>
              )}
              
              <View style={styles.overlay}>
                <View style={styles.scanFrame} />
                <Text style={styles.instructionText}>
                  {mode === 'add' 
                    ? 'Scanne den Barcode eines Produkts, um es hinzuzufügen' 
                    : 'Scanne den Barcode eines Produkts, um es zu entfernen'}
                </Text>
                
                {loading && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Text style={styles.loadingText}>Produkt wird verarbeitet...</Text>
                  </View>
                )}
                
                <View style={styles.buttonContainer}>
                  <TouchableOpacity 
                    style={styles.toggleButton}
                    onPress={toggleScanMode}
                  >
                    <Text style={styles.toggleButtonText}>Zur manuellen Eingabe</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.recipeButton}
                    onPress={goToRecipes}
                  >
                    <Text style={styles.recipeButtonText}>Zu den Rezepten</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => navigation.goBack()}
                  >
                    <Text style={styles.cancelText}>Zurück</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </CameraView>
          </>
        )}
      </View>
    );
  }

  // Manuelle Eingabe-Ansicht
  return (
    <ScrollView style={styles.manualContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {mode === 'add' ? 'Produkt hinzufügen' : 'Produkt entfernen'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {mode === 'add' 
            ? 'Gib einen Barcode ein, um ein Produkt hinzuzufügen' 
            : 'Gib einen Barcode ein, um ein Produkt zu entfernen'}
        </Text>
      </View>

      {lastScannedProduct && (
        <View style={styles.statusBarManual}>
          <Text style={styles.statusTextManual}>
            Zuletzt: {lastScannedProduct}
          </Text>
        </View>
      )}

      {/* Benachrichtigung */}
      {notification && (
        <View style={styles.notificationContainerManual}>
          <Text style={styles.notificationText}>{notification}</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Barcode eingeben (z.B. 3017620422003)"
          value={barcodeInput}
          onChangeText={setBarcodeInput}
          keyboardType="numeric"
        />
        <TouchableOpacity 
          style={[
            styles.scanButton,
            (!barcodeInput || loading) && styles.disabledButton
          ]}
          onPress={handleManualScan}
          disabled={loading || !barcodeInput}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.scanButtonText}>Scannen</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.mockContainer}>
        <Text style={styles.mockTitle}>Test-Barcodes:</Text>
        {MOCK_BARCODES.map((item, index) => (
          <TouchableOpacity 
            key={item.code}
            style={styles.mockItem}
            onPress={() => useMockBarcode(index)}
          >
            <Text style={styles.mockItemText}>{item.name}: {item.code}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.buttonContainerManual}>
        <TouchableOpacity 
          style={styles.toggleButton}
          onPress={toggleScanMode}
        >
          <Text style={styles.toggleButtonText}>Zur Kamera wechseln</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.recipeButton}
          onPress={goToRecipes}
        >
          <Text style={styles.recipeButtonText}>Zu den Rezepten</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Zurück</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  manualContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#4CAF50',
    backgroundColor: 'transparent',
    marginBottom: 30,
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  // Status-Leiste für zuletzt gescanntes Produkt
  statusBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
    padding: 8,
    zIndex: 100,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  statusBarManual: {
    backgroundColor: '#4CAF50',
    padding: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  statusTextManual: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  // Benachrichtigungen
  notificationContainer: {
    position: 'absolute',
    top: 40, // Unter der Status-Leiste
    left: 20,
    right: 20,
    backgroundColor: 'rgba(33, 150, 243, 0.9)',
    padding: 10,
    borderRadius: 8,
    zIndex: 100,
  },
  notificationContainerManual: {
    backgroundColor: 'rgba(33, 150, 243, 0.9)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  notificationText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'column',
    alignItems: 'center',
    padding: 10,
  },
  buttonContainerManual: {
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#FF9800',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
    width: '100%',
  },
  cancelText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  recipeButton: {
    backgroundColor: '#9C27B0',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
    width: '100%',
  },
  recipeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 10,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 10,
  },
  permissionText: {
    color: 'white',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
    width: '100%',
  },
  toggleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  input: {
    flex: 1,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    fontSize: 16,
  },
  scanButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  disabledButton: {
    backgroundColor: '#A5D6A7',
  },
  scanButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  mockContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  mockTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  mockItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  mockItemText: {
    fontSize: 16,
  }
});

export default ScannerScreen; 