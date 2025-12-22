
import { PIN_COLORS } from '/frontend/classes/constants.js';

/**
 * Zeichnet und verwaltet eine Verbindung (Spline) zwischen zwei Pins.
 */
export class BlueprintConnection {
  /**
   * @param {SVGElement} svgLayer - Der SVG-Container für alle Linien.
   * @param {BlueprintPin} fromPin - Startpunkt der Verbindung.
   * @param {BlueprintPin} [toPin=null] - Endpunkt (falls bereits verbunden).
   */
  constructor(svgLayer, fromPin, toPin = null) {
    this.id = `conn-${Math.random().toString(36).substr(2, 9)}`;
    this.svgLayer = svgLayer;
    this.fromPin = fromPin;
    this.toPin = toPin;
    
    this.pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.pathElement.setAttribute('fill', 'none');
    this.pathElement.setAttribute('stroke-width', toPin ? '3' : '2');
    
    const color = PIN_COLORS[fromPin.type] || '#ffffff';
    this.pathElement.setAttribute('stroke', color);
    this.pathElement.setAttribute('class', `connection-path ${!toPin ? 'draft-active' : ''}`);
    this.pathElement.style.pointerEvents = 'none';
    
    this.svgLayer.appendChild(this.pathElement);
  }

  /**
   * Aktualisiert die Bezier-Kurve basierend auf Pin-Positionen oder Mauszeiger.
   * @param {number} [mouseX=null] - Optionale Maus-X-Position für "Draft"-Linien.
   * @param {number} [mouseY=null] - Optionale Maus-Y-Position.
   */
  update(mouseX = null, mouseY = null) {
    const start = this.fromPin.getCenter();
    let end;

    if (this.toPin) {
      end = this.toPin.getCenter();
    } else if (mouseX !== null && mouseY !== null) {
      const editor = this.fromPin.node.editor;
      const containerRect = editor.container.getBoundingClientRect();
      end = {
        x: (mouseX - containerRect.left - editor.pan.x) / editor.zoom,
        y: (mouseY - containerRect.top - editor.pan.y) / editor.zoom
      };
    } else return;

    const dx = Math.abs(start.x - end.x);
    const curveIntensity = Math.min(Math.max(dx * 0.5, 50), 200);
    
    const cp1x = start.x + (this.fromPin.direction === 'OUTPUT' ? curveIntensity : -curveIntensity);
    let cp2x;
    if (this.toPin) {
      cp2x = end.x + (this.toPin.direction === 'OUTPUT' ? curveIntensity : -curveIntensity);
    } else {
      cp2x = end.x + (this.fromPin.direction === 'OUTPUT' ? -curveIntensity : curveIntensity);
    }

    const d = `M ${start.x} ${start.y} C ${cp1x} ${start.y}, ${cp2x} ${end.y}, ${end.x} ${end.y}`;
    this.pathElement.setAttribute('d', d);
  }

  /** Animiert den Datenfluss entlang der Verbindung. */
  async pulse() {
    this.pathElement.classList.add('active-flow');
    return new Promise(resolve => setTimeout(() => {
      this.pathElement.classList.remove('active-flow');
      resolve();
    }, 300));
  }

  /** Setzt visuelle Validierung während des Dragging */
  setValidity(isValid) {
    if (!this.toPin) {
       this.pathElement.setAttribute('stroke-width', isValid ? '4' : '2');
       this.pathElement.style.opacity = isValid ? '1' : '0.5';
    }
  }

  destroy() { this.pathElement.remove(); }
}
