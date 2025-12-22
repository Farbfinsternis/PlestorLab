
import { PinDirection, PinType, PIN_COLORS } from '/frontend/classes/constants.js';

/**
 * Repräsentiert einen einzelnen Anschluss (Pin) an einer Node.
 */
export class BlueprintPin {
  /**
   * @param {BlueprintNode} node - Die Eltern-Node dieses Pins.
   * @param {Object} config - Konfiguration des Pins (Name, Typ).
   * @param {PinDirection} direction - Input oder Output.
   */
  constructor(node, config, direction) {
    this.id = `pin-${Math.random().toString(36).substr(2, 9)}`;
    this.node = node;
    this.name = config.name;
    this.type = config.type;
    this.direction = direction;
    this.element = this._createTemplate();
    this.handle = this.element.querySelector('.pin-handle');
  }

  /**
   * Erzeugt das DOM-Element für den Pin inkl. Event-Listenern.
   * @private
   * @returns {HTMLElement}
   */
  _createTemplate() {
    const container = document.createElement('div');
    container.className = `flex items-center gap-2 py-1 ${this.direction === PinDirection.OUTPUT ? 'flex-row-reverse text-right' : 'flex-row'}`;
    
    const color = PIN_COLORS[this.type];
    const isExec = this.type === PinType.EXEC;

    const handle = document.createElement('div');
    handle.id = this.id;
    handle.className = `pin-handle`;
    handle.style.color = color;
    
    const icon = document.createElement('div');
    icon.className = isExec ? 'exec-pin' : 'data-pin';
    handle.appendChild(icon);

    const label = document.createElement('span');
    label.className = 'text-[10px] font-bold text-zinc-400 uppercase tracking-tighter select-none pointer-events-none';
    label.innerText = this.name;

    container.appendChild(handle);
    container.appendChild(label);

    handle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.node.editor.startConnection(this);
    });

    return container;
  }

  /**
   * Setzt visuelles Feedback für Drag-and-Drop Operationen.
   * @param {'valid'|'invalid'|null} status 
   */
  setFeedback(status) {
    this.handle.classList.remove('pin-valid-target', 'pin-invalid-target');
    if (status === 'valid') {
      this.handle.classList.add('pin-valid-target');
    } else if (status === 'invalid') {
      this.handle.classList.add('pin-invalid-target');
    }
  }

  /**
   * Berechnet die exakten Welt-Koordinaten der Pin-Mitte für die SVG-Linien.
   * Berücksichtigt Pan und Zoom des Editors.
   * @returns {{x: number, y: number}}
   */
  getCenter() {
    const rect = this.handle.getBoundingClientRect();
    const containerRect = this.node.editor.container.getBoundingClientRect();
    
    return {
      x: (rect.left - containerRect.left - this.node.editor.pan.x) / this.node.editor.zoom + (rect.width / 2) / this.node.editor.zoom,
      y: (rect.top - containerRect.top - this.node.editor.pan.y) / this.node.editor.zoom + (rect.height / 2) / this.node.editor.zoom
    };
  }
}
