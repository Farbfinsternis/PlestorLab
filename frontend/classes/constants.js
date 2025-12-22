
/**
 * @file constants.js
 * @description Zentrale Definitionen für das Blueprint-System.
 */

/** @type {number} Rastergröße für das Snapping der Nodes */
export const GRID_SIZE = 20;

/**
 * @enum {string}
 * Verfügbare Datentypen für Pins.
 */
export const PinType = {
  EXEC: 'EXEC',       // Ausführungsfluss (weißes Dreieck)
  STRING: 'STRING',   // Textdaten (rosa)
  NUMBER: 'NUMBER',   // Numerische Daten (grün)
  BOOLEAN: 'BOOLEAN'  // Wahrheitswerte (violett)
};

/**
 * @enum {string}
 * Richtung des Daten- oder Kontrollflusses.
 */
export const PinDirection = {
  INPUT: 'INPUT',
  OUTPUT: 'OUTPUT'
};

/** @type {Object<string, string>} Mapping von Pin-Typen zu Hex-Farben */
export const PIN_COLORS = {
  [PinType.EXEC]: '#ffffff',
  [PinType.STRING]: '#f43f5e',
  [PinType.NUMBER]: '#10b981',
  [PinType.BOOLEAN]: '#8b5cf6'
};
