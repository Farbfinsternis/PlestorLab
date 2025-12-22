# ANLEITUNG: ERSTELLUNG VON BUILTIN NODES

In diesem Projekt werden Nodes als JavaScript-Objekte innerhalb der Konstante `BUILTIN_NODES` (in `frontend/nodes/builtin.js`) definiert. Jede Node besteht aus visuellen Eigenschaften, Definitionen für Ein-/Ausgänge und Logik-Funktionen.

## 1. GRUNDSTRUKTUR

Jede Node ist ein Eintrag im `BUILTIN_NODES` Objekt. Der Key (z.B. "MY_NODE") dient als interne ID.

```javascript
MY_NODE: {
  title: 'Mein Node Name',      // Der angezeigte Titel im Header
  category: 'My Category',      // Kategorie im Suchmenü (Rechtsklick)
  color: 'bg-blue-600',         // Tailwind-Klasse für die Header-Farbe
  glowColor: 'rgba(...)',       // CSS-Farbe für den Leuchteffekt
  glowRGB: 'R, G, B',           // RGB-Werte für dynamische Effekte
  inputs: [ ... ],              // Liste der Eingänge (Pins links)
  outputs: [ ... ],             // Liste der Ausgänge (Pins rechts)
  defaultValues: { ... },       // Standardwerte für Inputs
  onExecute: async (node) => { ... },          // Ausführungslogik (Flow)
  getOutputValue: async (node, pin) => { ... }, // Datenlogik (Data Pull)
  onInit: (node) => { ... }     // Initialisierung (z.B. Event Listener)
}
```

## 2. PINS (INPUTS & OUTPUTS)

Pins definieren die Anschlüsse. Jeder Pin ist ein Objekt mit `name` und `type`.
Die Typen sind in `constants.js` definiert:

*   `PinType.EXEC`: Weißer Pfeil. Steuert den Programmfluss.
*   `PinType.STRING`: Textdaten (Rosa).
*   `PinType.NUMBER`: Zahlen (Grün).
*   `PinType.BOOLEAN`: Wahrheitswerte (Violett).
*   `PinType.ANY`: Beliebige Daten (Grau).

## 3. LOGIK: DAS PULL-PRINZIP & EXECUTION FLOW

Das System unterscheidet strikt zwischen Ausführungsfluss (Execution) und Datenfluss.

### A) onExecute(node)
Diese Methode wird **NUR** aufgerufen, wenn ein Signal in einen EXEC-Input fließt.
Hier passiert die eigentliche Arbeit (z.B. Loggen, Berechnen, Warten).
**WICHTIG:** Damit der Fluss weitergeht, muss explizit `node.triggerOutput('PinName')` aufgerufen werden.

### B) getOutputValue(node, pinName)
Diese Methode wird aufgerufen, wenn eine *andere* Node an einem Kabel zieht ("Pull-Prinzip").
Sie muss den Wert für den angefragten `pinName` zurückgeben.

## 4. CUSTOM BODY (BENUTZEROBERFLÄCHE)

Mit der Eigenschaft `customBody` kann HTML-Code in den Körper der Node eingefügt werden.
Das Attribut `data-bind="InputName"` verknüpft ein HTML-Input-Feld automatisch mit dem `defaultValues`-Speicher.

## 5. BEISPIEL: LOAD IMAGE NODE

Hier ist ein Beispiel für eine Node, die ein Bild lädt, ein Thumbnail anzeigt und die Bilddaten bereitstellt.

```javascript
LOAD_IMAGE: {
  title: 'Load Image',
  category: 'Input',
  color: 'bg-amber-600',
  glowColor: 'rgba(217, 119, 6, 0.4)',
  glowRGB: '217, 119, 6',
  inputs: [],
  outputs: [
    { name: 'Image', type: PinType.ANY },
    { name: 'Mask', type: PinType.ANY },
    { name: 'Width', type: PinType.NUMBER },
    { name: 'Height', type: PinType.NUMBER }
  ],
  customBody: `
    <div class="flex flex-col gap-2 mt-2">
      <input type="file" accept="image/*" class="text-[10px] text-zinc-400 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"/>
      <div class="relative w-full h-24 bg-black/50 rounded border border-zinc-700 flex items-center justify-center overflow-hidden">
        <img id="preview-img" class="w-full h-full object-contain hidden" />
        <span class="text-[9px] text-zinc-600 placeholder-text">No Image</span>
      </div>
    </div>
  `,
  onInit: (node) => {
    const input = node.element.querySelector('input[type="file"]');
    const img = node.element.querySelector('#preview-img');
    const placeholder = node.element.querySelector('.placeholder-text');

    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const imgObj = new Image();
          imgObj.onload = () => {
            node.state = { image: imgObj, width: imgObj.width, height: imgObj.height };
            img.src = evt.target.result;
            img.classList.remove('hidden');
            placeholder.classList.add('hidden');
          };
          imgObj.src = evt.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  },
  getOutputValue: async (node, pinName) => {
    const state = node.state || {};
    if (pinName === 'Image') return state.image || null;
    if (pinName === 'Mask') return null;
    if (pinName === 'Width') return state.width || 0;
    if (pinName === 'Height') return state.height || 0;
    return null;
  }
}
```