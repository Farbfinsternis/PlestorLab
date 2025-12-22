
import { BlueprintPin } from '/frontend/classes/Pin.js';
import { PinDirection, GRID_SIZE, PinType } from '/frontend/classes/constants.js';

/**
 * Die Basisklasse für alle grafischen Nodes im System.
 */
export class BlueprintNode {
  /**
   * @param {BlueprintEditor} editor - Referenz zum Editor.
   * @param {Object} config - Das Template für die Node (Titel, Pins, Logik).
   * @param {number} x - Initiale X-Position im Weltraum.
   * @param {number} y - Initiale Y-Position im Weltraum.
   */
  constructor(editor, config, x, y) {
    this.id = `node-${Math.random().toString(36).substr(2, 9)}`;
    this.editor = editor;
    this.template = JSON.parse(JSON.stringify(config)); 
    this.template.onExecute = config.onExecute; 
    this.template.getOutputValue = config.getOutputValue;
    this.template.onInit = config.onInit;
    
    this.title = config.title;
    this.color = config.color;
    this.glowColor = config.glowColor || 'rgba(255, 255, 255, 0.2)';
    this.glowRGB = config.glowRGB || '255, 255, 255';
    
    this.x = x;
    this.y = y;
    this.width = 200;
    this.height = 0;
    
    this.pins = [];
    this.element = this._createTemplate(this.template);
    
    if (this.template.onInit) {
      this.template.onInit(this);
    }

    this._initDragging();
    this._initResizing();
  }

  /**
   * Erstellt das DOM-Konstrukt der Node.
   * @private
   */
  _createTemplate(config) {
    const nodeEl = document.createElement('div');
    nodeEl.className = `blueprint-node absolute min-w-[200px] bg-[#1a1a1c] border border-zinc-800 rounded-lg overflow-hidden`;
    nodeEl.style.left = `${this.x}px`;
    nodeEl.style.top = `${this.y}px`;
    nodeEl.style.width = `${this.width}px`;
    
    nodeEl.style.setProperty('--node-glow-color', this.glowColor);
    nodeEl.style.setProperty('--node-glow-rgb', this.glowRGB);

    const header = document.createElement('div');
    header.className = `node-header ${this.color} px-4 py-2 flex items-center gap-2 cursor-grab active:cursor-grabbing border-b border-white/10`;
    header.innerHTML = `
      <div class="w-2.5 h-2.5 rounded-full bg-white/40 shadow-inner z-10"></div>
      <span class="text-[11px] font-black text-white uppercase tracking-wider drop-shadow-md z-10 flex-grow pointer-events-none">${this.title}</span>
      <button class="node-delete-btn p-1 hover:bg-white/20 rounded transition-colors text-white/50 hover:text-white z-20">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

    const deleteBtn = header.querySelector('.node-delete-btn');
    deleteBtn.onclick = (e) => { e.stopPropagation(); this.editor.deleteNode(this); };

    const body = document.createElement('div');
    body.className = 'node-body p-3 flex flex-col bg-zinc-900/40 backdrop-blur-sm';
    
    const pinContainer = document.createElement('div');
    pinContainer.className = 'flex justify-between gap-6';

    const inputCol = document.createElement('div');
    inputCol.className = 'flex flex-col gap-1';
    
    const outputCol = document.createElement('div');
    outputCol.className = 'flex flex-col gap-1 items-end';

    config.inputs.forEach(p => {
      const pin = new BlueprintPin(this, p, PinDirection.INPUT);
      this.pins.push(pin);
      inputCol.appendChild(pin.element);
    });

    config.outputs.forEach(p => {
      const pin = new BlueprintPin(this, p, PinDirection.OUTPUT);
      this.pins.push(pin);
      outputCol.appendChild(pin.element);
    });

    pinContainer.appendChild(inputCol);
    pinContainer.appendChild(outputCol);
    body.appendChild(pinContainer);

    if (config.customBody) {
      const customWrapper = document.createElement('div');
      customWrapper.className = 'flex-grow flex flex-col min-h-0';
      customWrapper.innerHTML = config.customBody;
      
      customWrapper.querySelectorAll('[data-bind]').forEach(el => {
        const prop = el.getAttribute('data-bind');
        if (config.defaultValues && config.defaultValues[prop] !== undefined) {
          el.value = config.defaultValues[prop];
        }
        el.addEventListener('input', (e) => {
          if (!config.defaultValues) config.defaultValues = {};
          config.defaultValues[prop] = e.target.value;
        });
      });

      customWrapper.querySelectorAll('textarea, input').forEach(el => {
        el.addEventListener('mousedown', (e) => e.stopPropagation());
        el.addEventListener('keydown', (e) => e.stopPropagation());
      });

      body.appendChild(customWrapper);
    }

    nodeEl.appendChild(header);
    nodeEl.appendChild(body);

    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    nodeEl.appendChild(resizeHandle);

    nodeEl.addEventListener('mousedown', (e) => {
      this.editor.selectNode(this);
      e.stopPropagation();
    });

    return nodeEl;
  }

  /** Visuelles Highlight beim Ausführen */
  async highlight() {
    this.element.classList.add('node-executing');
    await new Promise(r => setTimeout(r, 150));
    this.element.classList.remove('node-executing');
  }

  /**
   * Führt die Logik der Node aus.
   * @param {BlueprintPin} [inputPin] - Der Pin, über den die Ausführung kam.
   */
  async execute(inputPin = null) {
    await this.highlight();
    if (this.template.onExecute) {
      await this.template.onExecute(this, inputPin);
    } else {
      await this.triggerOutput('');
    }
  }

  /**
   * Aktiviert den nächsten Schritt im Exec-Flow.
   * @param {string} pinName - Name des Output-Exec-Pins.
   */
  async triggerOutput(pinName) {
    const outputPin = this.pins.find(p => p.direction === PinDirection.OUTPUT && p.type === PinType.EXEC && p.name === pinName);
    if (!outputPin) return;

    const connection = this.editor.connections.find(c => c.fromPin === outputPin);
    if (connection && connection.toPin) {
      await connection.pulse();
      await connection.toPin.node.execute(connection.toPin);
    }
  }

  /**
   * Holt einen Wert von einem Eingangs-Pin (rekursiv über Verbindungen).
   * @param {string} pinName 
   */
  async getInputValue(pinName) {
    const inputPin = this.pins.find(p => p.direction === PinDirection.INPUT && p.name === pinName);
    if (!inputPin) return null;

    const connection = this.editor.connections.find(c => c.toPin === inputPin);
    if (connection && connection.fromPin) {
      await connection.pulse();
      return await connection.fromPin.node.getOutputValue(connection.fromPin.name);
    }

    return this.template.defaultValues?.[pinName] ?? 0;
  }

  /**
   * Berechnet oder liefert den Wert eines Ausgangs-Pins.
   * @param {string} pinName 
   */
  async getOutputValue(pinName) {
    await this.highlight();
    if (this.template.getOutputValue) {
      return await this.template.getOutputValue(this, pinName);
    }
    return null;
  }

  /** @private Dragging-Logik */
  _initDragging() {
    const header = this.element.querySelector('.node-header');
    let isDragging = false;
    let dragStartX, dragStartY;

    header.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || e.target.closest('.node-delete-btn')) return;
      this.editor.selectNode(this);
      isDragging = true;
      dragStartX = (e.clientX - this.editor.pan.x) / this.editor.zoom - this.x;
      dragStartY = (e.clientY - this.editor.pan.y) / this.editor.zoom - this.y;
      this.element.style.zIndex = '5000';
      e.stopPropagation();
      e.preventDefault();

      const onMouseMove = (ev) => {
        if (!isDragging) return;
        const worldX = (ev.clientX - this.editor.pan.x) / this.editor.zoom - dragStartX;
        const worldY = (ev.clientY - this.editor.pan.y) / this.editor.zoom - dragStartY;
        this.x = Math.round(worldX / GRID_SIZE) * GRID_SIZE;
        this.y = Math.round(worldY / GRID_SIZE) * GRID_SIZE;
        this.element.style.left = `${this.x}px`;
        this.element.style.top = `${this.y}px`;
        this.editor.updateConnections();
      };

      const onMouseUp = () => {
        isDragging = false;
        this.element.style.zIndex = this.element.classList.contains('selected') ? '1000' : '20';
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  }

  _initResizing() {
    const handle = this.element.querySelector('.resize-handle');
    handle.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      let isResizing = true;
      let startWidth = this.element.offsetWidth;
      let startHeight = this.element.offsetHeight;
      let startMouseX = e.clientX;
      let startMouseY = e.clientY;
      e.stopPropagation();

      const onMouseMove = (ev) => {
        if (!isResizing) return;
        const deltaX = (ev.clientX - startMouseX) / this.editor.zoom;
        const deltaY = (ev.clientY - startMouseY) / this.editor.zoom;
        this.width = Math.round(Math.max(200, startWidth + deltaX) / GRID_SIZE) * GRID_SIZE;
        this.height = Math.round(Math.max(50, startHeight + deltaY) / GRID_SIZE) * GRID_SIZE;
        this.element.style.width = `${this.width}px`;
        this.element.style.height = `${this.height}px`;
        this.editor.updateConnections();
      };

      const onMouseUp = () => { isResizing = false; window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  }

  destroy() { this.element.remove(); }
}
