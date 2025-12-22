
/**
 * @file constants.js
 * @description Central definitions for the blueprint system.
 */

/** @type {number} Grid size for node snapping */
export const GRID_SIZE = 20;

/**
 * @enum {string}
 * Available data types for pins.
 */
export const PinType = {
  EXEC: 'EXEC',       // Execution flow (white triangle)
  STRING: 'STRING',   // Text data (pink)
  NUMBER: 'NUMBER',   // Numeric data (green)
  BOOLEAN: 'BOOLEAN',  // Boolean values (purple)
  ANY: 'ANY'        // Any data type (gray)
};

/**
 * @enum {string}
 * Direction of data or control flow.
 */
export const PinDirection = {
  INPUT: 'INPUT',
  OUTPUT: 'OUTPUT'
};

/** @type {Object<string, string>} Mapping of pin types to hex colors */
export const PIN_COLORS = {
  [PinType.EXEC]: '#ffffff',
  [PinType.STRING]: '#f43f5e',
  [PinType.NUMBER]: '#10b981',
  [PinType.BOOLEAN]: '#8b5cf6',
  [PinType.ANY]: '#9ca3af'
};
