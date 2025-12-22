
import { BlueprintEditor } from '/frontend/classes/Editor.js';

window.addEventListener('DOMContentLoaded', () => {
  const engine = new BlueprintEditor();
  window.editor = engine; // For debugging
});
