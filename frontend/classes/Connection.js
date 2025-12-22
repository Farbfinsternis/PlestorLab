
import { PIN_COLORS } from '/frontend/classes/constants.js';

/**
 * Draws and manages a connection (spline) between two pins.
 */
export class BlueprintConnection {
  /**
   * @param {SVGElement} svgLayer - The SVG container for all lines.
   * @param {BlueprintPin} fromPin - Starting point of the connection.
   * @param {BlueprintPin} [toPin=null] - Endpoint (if already connected).
   */
  constructor(svgLayer, fromPin, toPin = null) {
    this.id = `conn-${Math.random().toString(36).substr(2, 9)}`;
    this.svgLayer = svgLayer;
    this.fromPin = fromPin;
    this.toPin = toPin;
    
    // Create the SVG path element for the connection line
    this.pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.pathElement.setAttribute('id', this.id);
    this.pathElement.setAttribute('fill', 'none');
    this.pathElement.setAttribute('stroke-width', toPin ? '3' : '2');
    
    // Set color based on pin type
    const color = PIN_COLORS[fromPin.type] || '#ffffff';
    this.pathElement.setAttribute('stroke', color);
    this.pathElement.setAttribute('class', `connection-path ${!toPin ? 'draft-active' : ''}`);
    this.pathElement.style.pointerEvents = 'none';
    
    this.svgLayer.appendChild(this.pathElement);
  }

  /**
   * Updates the Bezier curve based on pin positions or mouse pointer.
   * @param {number} [mouseX=null] - Optional mouse X position for "draft" lines.
   * @param {number} [mouseY=null] - Optional mouse Y position.
   */
  update(mouseX = null, mouseY = null) {
    const start = this.fromPin.getCenter();
    let end;

    if (this.toPin) {
      // Connected to another pin
      end = this.toPin.getCenter();
    } else if (mouseX !== null && mouseY !== null) {
      // Draft connection following mouse
      const editor = this.fromPin.node.editor;
      const containerRect = editor.container.getBoundingClientRect();
      end = {
        x: (mouseX - containerRect.left - editor.pan.x) / editor.zoom,
        y: (mouseY - containerRect.top - editor.pan.y) / editor.zoom
      };
    } else return;

    const dx = Math.abs(start.x - end.x);
    const curveIntensity = Math.min(Math.max(dx * 0.5, 50), 200);
    
    // Calculate control points for the Bezier curve
    const cp1x = start.x + (this.fromPin.direction === 'OUTPUT' ? curveIntensity : -curveIntensity);
    let cp2x;
    if (this.toPin) {
      cp2x = end.x + (this.toPin.direction === 'OUTPUT' ? curveIntensity : -curveIntensity);
    } else {
      // For draft lines, assume opposite direction for smoother curve
      cp2x = end.x + (this.fromPin.direction === 'OUTPUT' ? -curveIntensity : curveIntensity);
    }

    const d = `M ${start.x} ${start.y} C ${cp1x} ${start.y}, ${cp2x} ${end.y}, ${end.x} ${end.y}`;
    this.pathElement.setAttribute('d', d);
  }

  /** Animates data flow along the connection. */
  async pulse() {
    this.pathElement.classList.add('active-flow');
    return new Promise(resolve => setTimeout(() => {
      this.pathElement.classList.remove('active-flow');
      resolve();
    }, 300));
  }

  /** Sets visual validation during dragging */
  setValidity(isValid) {
    if (!this.toPin) {
       this.pathElement.setAttribute('stroke-width', isValid ? '4' : '2');
       this.pathElement.style.opacity = isValid ? '1' : '0.5';
    }
  }

  destroy() { this.pathElement.remove(); }
}
