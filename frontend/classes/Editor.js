
import { BlueprintNode } from '/frontend/classes/Node.js';
import { BlueprintConnection } from '/frontend/classes/Connection.js';
import { PinDirection, GRID_SIZE } from '/frontend/classes/constants.js';
import { BUILTIN_NODES } from '../nodes/builtin.js';
import { CUSTOM_NODES } from '../custom-nodes/index.js';

export class BlueprintEditor {
  /**
   * Initializes the editor, references DOM elements, and sets up initial state.
   */
  constructor() {
    this.container = document.getElementById('editor-container');
    this.grid = document.getElementById('grid');
    this.nodeLayer = document.getElementById('node-layer');
    this.svgLayer = document.getElementById('svg-layer');
    
    this.nodePicker = document.getElementById('node-picker');
    this.nodePickerSearch = document.getElementById('node-picker-search');
    this.nodePickerList = document.getElementById('node-picker-list');
    this.playBtn = document.getElementById('play-button');

    this.logListEl = document.getElementById('log-list');
    this.clearLogBtn = document.getElementById('clear-log');

    this.nodes = [];
    this.connections = [];
    this.selectedNode = null;
    this.activeDraft = null;
    this.hoveredPin = null;
    
    this.pan = { x: 0, y: 0 };
    this.zoom = 1.0;
    this.isPanning = false;
    
    this.lastSpawnPos = { x: 0, y: 0 };
    this.currentContextPin = null;

    this.expandedCategories = new Set();
    this.nodeLibrary = { ...BUILTIN_NODES, ...CUSTOM_NODES };

    this._init();
  }

  /**
   * Sets up event listeners, initializes the node picker, and spawns default nodes.
   * @private
   */
  _init() {
    this._setupGlobalEvents();
    this._setupNodePicker();
    
    this.clearLogBtn.onclick = () => { this.logListEl.innerHTML = ''; };
    this.playBtn.onclick = () => this.run();

    this.log('Blueprint Engine initialized.', 'system');
    
    this.addNode(this.nodeLibrary.EVENT, 160, 160);
    this.addNode(this.nodeLibrary.PRINT, 560, 200);
    
    this._updateStats();
    this._updateTransform();
  }

  /**
   * Adds a message to the output log UI.
   * @param {string} message - The text to log.
   * @param {'info'|'warning'|'success'|'error'|'system'} [type='info'] - The style/category of the log.
   */
  log(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    const now = new Date();
    const ts = now.toTimeString().split(' ')[0] + '.' + now.getMilliseconds().toString().padStart(3, '0');
    entry.innerHTML = `<span class="log-timestamp">[${ts}]</span><span class="log-msg-${type}">${message}</span>`;
    this.logListEl.appendChild(entry);
    this.logListEl.scrollTop = this.logListEl.scrollHeight;
  }

  /**
   * Starts the simulation by executing all event nodes.
   */
  async run() {
    this.log('Starting simulation...', 'system');
    this.playBtn.disabled = true;
    this.playBtn.classList.add('opacity-50', 'cursor-not-allowed');

    const eventNodes = this.nodes.filter(n => n.template.category === 'Events');
    
    if (eventNodes.length === 0) {
      this.log('No event nodes found to start from.', 'warning');
      this.playBtn.disabled = false;
      this.playBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      return;
    }

    for (const node of eventNodes) {
      await node.execute();
    }
    
    this.log('Simulation finished.', 'system');
    this.playBtn.disabled = false;
    this.playBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  }

  /**
   * Creates a DOM element for a node in the picker list.
   * @private
   * @param {string} key - The unique key of the node type.
   * @param {Object} t - The node template configuration.
   * @returns {HTMLElement} The picker item element.
   */
  _createPickerItem(key, t) {
    const isCustom = CUSTOM_NODES.hasOwnProperty(key);
    const item = document.createElement('div');
    item.className = 'picker-item';
    item.innerHTML = `
      <div class="dot ${t.color}"></div>
      <div class="flex flex-col">
        <span class="text-[11px] font-medium leading-none mb-0.5">${t.title}</span>
        <span class="text-[9px] opacity-40 uppercase tracking-tighter">${isCustom ? 'User Node' : (t.category || 'Standard')}</span>
      </div>
    `;
    item.onclick = (e) => {
      e.stopPropagation();
      const newNode = this.addNode(t, this.lastSpawnPos.x, this.lastSpawnPos.y);
      if (this.currentContextPin) {
        const targetPin = newNode.pins.find(p => 
          p.direction !== this.currentContextPin.direction && p.type === this.currentContextPin.type
        );
        if (targetPin) this._createConnection(this.currentContextPin, targetPin);
      }
      this._hideNodePicker();
    };
    return item;
  }

  /**
   * Renders the list of available nodes in the picker, filtering by search or context.
   * @private
   */
  _setupNodePicker() {
    const renderList = (filter = '') => {
      this.nodePickerList.innerHTML = '';
      
      if (this.currentContextPin) {
        this.nodePickerSearch.placeholder = `Find actions for ${this.currentContextPin.type}...`;
      } else {
        this.nodePickerSearch.placeholder = "Search Actions...";
      }

      const filteredNodes = Object.keys(this.nodeLibrary).filter(key => {
        const t = this.nodeLibrary[key];
        
        if (this.currentContextPin) {
          const hasCompatiblePin = [...t.inputs, ...t.outputs].some(p => {
            const pDir = t.inputs.includes(p) ? PinDirection.INPUT : PinDirection.OUTPUT;
            return pDir !== this.currentContextPin.direction && p.type === this.currentContextPin.type;
          });
          if (!hasCompatiblePin) return false;
        }

        if (filter && !t.title.toLowerCase().includes(filter.toLowerCase())) return false;
        return true;
      });

      if (!filter) {
        const categories = {};
        filteredNodes.forEach(key => {
          const t = this.nodeLibrary[key];
          const cat = t.category || 'Uncategorized';
          if (!categories[cat]) categories[cat] = [];
          categories[cat].push({ key, template: t });
        });

        const sortedCategoryNames = Object.keys(categories).sort((a, b) => {
          const order = ['Events', 'Flow Control', 'Constants', 'Math', 'String', 'Utilities'];
          const idxA = order.indexOf(a);
          const idxB = order.indexOf(b);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return a.localeCompare(b);
        });

        sortedCategoryNames.forEach(catName => {
          const isExpanded = this.expandedCategories.has(catName);
          const header = document.createElement('div');
          header.className = `picker-category-header ${!isExpanded ? 'collapsed' : ''}`;
          header.innerHTML = `
            <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
            <span>${catName}</span>
          `;
          
          header.onclick = (e) => {
            e.stopPropagation();
            if (isExpanded) {
              this.expandedCategories.delete(catName);
            } else {
              this.expandedCategories.add(catName);
            }
            renderList();
          };

          this.nodePickerList.appendChild(header);

          if (isExpanded) {
            categories[catName]
              .sort((a, b) => a.template.title.localeCompare(b.template.title))
              .forEach(itemData => {
                this.nodePickerList.appendChild(this._createPickerItem(itemData.key, itemData.template));
              });
          }
        });
      } else {
        filteredNodes.forEach(key => {
          this.nodePickerList.appendChild(this._createPickerItem(key, this.nodeLibrary[key]));
        });
      }
    };

    this.nodePickerSearch.oninput = (e) => renderList(e.target.value);
    this.nodePickerSearch.onkeydown = (e) => {
      if (e.key === 'Enter') {
        const active = this.nodePickerList.querySelector('.picker-item:first-child');
        if (active) active.click();
      } else if (e.key === 'Escape') {
        this._hideNodePicker();
      }
      e.stopPropagation();
    };

    renderList();
  }

  /**
   * Displays the node picker context menu at a specific position.
   * @private
   * @param {number} clientX - Mouse X position.
   * @param {number} clientY - Mouse Y position.
   * @param {BlueprintPin} [contextPin=null] - Optional pin to filter compatible nodes for.
   */
  _showNodePicker(clientX, clientY, contextPin = null) {
    const rect = this.container.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    this.currentContextPin = contextPin;
    this.lastSpawnPos = { x: (x - this.pan.x) / this.zoom, y: (y - this.pan.y) / this.zoom };
    this.nodePicker.style.display = 'flex';
    this.nodePicker.style.left = `${Math.min(clientX, window.innerWidth - 300)}px`;
    this.nodePicker.style.top = `${Math.min(clientY, window.innerHeight - (400 + 160))}px`;
    this.nodePickerSearch.value = '';
    this._setupNodePicker(); 
    setTimeout(() => this.nodePickerSearch.focus(), 10);
  }

  /**
   * Hides the node picker.
   * @private
   */
  _hideNodePicker() {
    this.nodePicker.style.display = 'none';
    this.currentContextPin = null;
  }

  /**
   * Attaches global event listeners for interaction (pan, zoom, drag, shortcuts).
   * @private
   */
  _setupGlobalEvents() {
    this.container.addEventListener('mousedown', (e) => {
      if (this.nodePicker.style.display === 'flex' && !this.nodePicker.contains(e.target)) this._hideNodePicker();
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        this.isPanning = true;
        this.container.style.cursor = 'grabbing';
      } else if (e.target === this.container || e.target === this.grid || e.target.classList.contains('vignette')) {
        this.selectNode(null);
      }
    });

    this.container.addEventListener('dblclick', (e) => {
      if (e.target === this.container || e.target === this.grid || e.target.classList.contains('vignette')) {
        this._showNodePicker(e.clientX, e.clientY);
      }
    });

    this.container.addEventListener('wheel', (e) => {
      if (this.nodePicker.style.display === 'flex' && this.nodePicker.contains(e.target)) {
        return;
      }
      e.preventDefault();
      const delta = -e.deltaY;
      const zoomFactor = delta > 0 ? 1.1 : 1 / 1.1;
      const newZoom = Math.min(Math.max(this.zoom * zoomFactor, 0.15), 3.0);
      if (newZoom !== this.zoom) {
        const rect = this.container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        this.pan.x = mouseX - (mouseX - this.pan.x) * (newZoom / this.zoom);
        this.pan.y = mouseY - (mouseY - this.pan.y) * (newZoom / this.zoom);
        this.zoom = newZoom;
        this._updateTransform();
        this._updateStats();
      }
    }, { passive: false });

    window.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        this.pan.x += e.movementX;
        this.pan.y += e.movementY;
        this._updateTransform();
      }
      if (this.activeDraft) {
        this.activeDraft.update(e.clientX, e.clientY);
        this._handleDraftHover(e.clientX, e.clientY);
      }
    });

    window.addEventListener('mouseup', (e) => {
      this.isPanning = false;
      this.container.style.cursor = 'crosshair';
      if (this.activeDraft) {
        const sourcePin = this.activeDraft.fromPin;
        if (this.hoveredPin) {
          if (this._checkCompatibility(sourcePin, this.hoveredPin)) this.completeConnection(this.hoveredPin);
          this.hoveredPin.setFeedback(null);
          this.hoveredPin = null;
        } else {
          this._showNodePicker(e.clientX, e.clientY, sourcePin);
        }
        this.activeDraft.destroy();
        this.activeDraft = null;
      }
    });

    window.addEventListener('keydown', (e) => {
      const isInputActive = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable;
      if (!isInputActive && (e.key === 'Delete' || e.key === 'Backspace') && this.selectedNode) {
        this.deleteNode(this.selectedNode);
        e.preventDefault();
      }
      if (e.key === 'Escape') this._hideNodePicker();
    });
  }

  /**
   * Handles visual feedback when dragging a connection over potential target pins.
   * @private
   * @param {number} mx - Mouse X position.
   * @param {number} my - Mouse Y position.
   */
  _handleDraftHover(mx, my) {
    const hit = document.elementFromPoint(mx, my);
    const pinHandle = hit?.closest('.pin-handle');
    const newHoveredPin = pinHandle ? this._findPinById(pinHandle.id) : null;
    if (this.hoveredPin !== newHoveredPin) {
      if (this.hoveredPin) this.hoveredPin.setFeedback(null);
      this.hoveredPin = newHoveredPin;
      if (this.hoveredPin) {
        const isValid = this._checkCompatibility(this.activeDraft.fromPin, this.hoveredPin);
        this.hoveredPin.setFeedback(isValid ? 'valid' : 'invalid');
        this.activeDraft.setValidity(isValid);
      } else {
        this.activeDraft.setValidity(false);
      }
    }
  }

  /**
   * Checks if two pins can be connected (type matching, direction, etc.).
   * @private
   * @param {BlueprintPin} source - The starting pin.
   * @param {BlueprintPin} target - The potential target pin.
   * @returns {boolean} True if compatible.
   */
  _checkCompatibility(source, target) {
    return source.node !== target.node && source.direction !== target.direction && source.type === target.type;
  }

  /**
   * Helper to find a pin object by its DOM ID.
   * @private
   * @param {string} id - The DOM ID of the pin handle.
   * @returns {BlueprintPin|null}
   */
  _findPinById(id) {
    for (const node of this.nodes) {
      const pin = node.pins.find(p => p.id === id);
      if (pin) return pin;
    }
    return null;
  }

  /**
   * Updates the CSS transform for panning and zooming the canvas.
   * @private
   */
  _updateTransform() {
    const transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
    this.nodeLayer.style.transform = transform;
    this.svgLayer.style.transform = transform;
    this.grid.style.backgroundPosition = `${this.pan.x}px ${this.pan.y}px`;
    this.grid.style.backgroundSize = `${200 * this.zoom}px ${200 * this.zoom}px, ${200 * this.zoom}px ${200 * this.zoom}px, ${20 * this.zoom}px ${20 * this.zoom}px, ${20 * this.zoom}px ${20 * this.zoom}px`;
  }

  /**
   * Creates and adds a new node to the editor at specified coordinates.
   * @param {Object} template - The node configuration template.
   * @param {number} x - World X position.
   * @param {number} y - World Y position.
   * @returns {BlueprintNode} The created node instance.
   */
  addNode(template, x, y) {
    const snappedX = Math.round(x / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE;
    const node = new BlueprintNode(this, template, snappedX, snappedY);
    this.nodes.push(node);
    this.nodeLayer.appendChild(node.element);
    this._updateStats();
    this.selectNode(node);
    return node;
  }

  /**
   * Removes a node and its connections from the editor.
   * @param {BlueprintNode} node - The node to delete.
   */
  deleteNode(node) {
    if (!node) return;
    
    // Safety filter for connections: check if pins exist
    this.connections = this.connections.filter(c => {
      const isFromTarget = c.fromPin && c.fromPin.node === node;
      const isToTarget = c.toPin && c.toPin.node === node;
      
      if (isFromTarget || isToTarget) {
        c.destroy();
        return false;
      }
      return true;
    });

    this.nodes = this.nodes.filter(n => n !== node);
    node.destroy();
    
    if (this.selectedNode === node) {
      this.selectedNode = null;
    }
    
    this.log(`Deleted node: ${node.title}`, 'info');
    this._updateStats();
  }

  /**
   * Selects a node visually and updates internal state.
   * @param {BlueprintNode|null} node - The node to select, or null to deselect.
   */
  selectNode(node) {
    this.selectedNode = node;
    this.nodes.forEach(n => n.element.classList.toggle('selected', n === node));
  }

  /**
   * Begins the process of creating a new connection (drag start).
   * @param {BlueprintPin} pin - The source pin.
   */
  startConnection(pin) {
    this.activeDraft = new BlueprintConnection(this.svgLayer, pin);
    this.activeDraft.update();
  }

  /**
   * Finalizes a connection between the draft source and a target pin.
   * @param {BlueprintPin} targetPin - The destination pin.
   */
  completeConnection(targetPin) {
    this._createConnection(this.activeDraft.fromPin, targetPin);
  }

  /**
   * Internal method to create the actual connection object between two pins.
   * @private
   * @param {BlueprintPin} pinA - First pin.
   * @param {BlueprintPin} pinB - Second pin.
   */
  _createConnection(pinA, pinB) {
    const from = pinA.direction === PinDirection.OUTPUT ? pinA : pinB;
    const to = pinA.direction === PinDirection.INPUT ? pinA : pinB;
    this.connections = this.connections.filter(c => {
      if (c.toPin === to) {
        c.destroy();
        return false;
      }
      return true;
    });
    const conn = new BlueprintConnection(this.svgLayer, from, to);
    conn.update();
    this.connections.push(conn);
    this._updateStats();
  }

  /**
   * Redraws all connections (e.g., during panning or node dragging).
   */
  updateConnections() {
    this.connections.forEach(c => c.update());
  }

  /**
   * Updates the debug statistics overlay (node count, zoom level, etc.).
   * @private
   */
  _updateStats() {
    document.getElementById('stat-nodes').innerText = this.nodes.length;
    document.getElementById('stat-links').innerText = this.connections.length;
    document.getElementById('stat-zoom').innerText = `${Math.round(this.zoom * 100)}%`;
  }
}
