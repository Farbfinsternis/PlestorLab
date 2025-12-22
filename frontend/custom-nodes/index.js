
// Diese Datei verwaltet Nodes, die vom Benutzer zur Laufzeit definiert werden.
// Initial leer, kann aber persistierte Daten laden.

export const CUSTOM_NODES = {
  // Beispiel für eine user-generierte Node
  MY_MACRO: {
    title: 'My Custom Function',
    category: 'Custom',
    color: 'bg-violet-600',
    glowColor: 'rgba(139, 92, 246, 0.4)',
    glowRGB: '139, 92, 246',
    inputs: [
      { name: 'Input A', type: 'STRING' }
    ],
    outputs: [
      { name: 'Output', type: 'STRING' }
    ]
  }
};
