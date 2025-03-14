// Hinweis: Diese Datei wird nicht mehr verwendet.
// Wir verwenden jetzt die offizielle uuid-Bibliothek.
// Import: import { v4 as uuidv4 } from 'uuid';

// Einfache UUID v4 Implementierung für React Native (Fallback)
export function v4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
} 