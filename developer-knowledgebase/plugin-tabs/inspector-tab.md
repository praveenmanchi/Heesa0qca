# Inspector Tab Technical Documentation

The Inspector Tab allows designers to diagnose how tokens are applied to specific layers on the Figma canvas. It provides deep visibility into node properties and allows for manual overrides.

## 📌 Functionality Overview
- **Selection Tracking**: Automatically updates when the user selects different layers in Figma.
- **Deep Inspection**: Recursively checks child nodes for token applications.
- **Annotation**: Places visual labels on the canvas linked to specific token values.
- **Raw JSON View**: Displays the underlying data structure mapped to the selected node.

## 🛠 Technical Implementation

### Selection Change Lifecycle
The plugin subscribes to Figma's `selectionchange` event. When the selection changes, the Controller scans the nodes and sends the data back to the UI.

```typescript
// plugin/controller.ts
figma.on('selectionchange', () => {
  sendSelectionChange();
});
```

### Data Aggregation
The `Inspector` component consumes `uiState.selectionValues`, which contains an array of detected token properties for each selected layer.

```tsx
// Inspector.tsx
const uiState = useSelector(uiStateSelector, isEqual);
// selectionValues contains data like: { nodeName: 'Rectangle 1', values: { fill: 'colors.brand' } }
```

### Multi-Mode Support
The Inspector supports Figma's multi-mode variables, allowing users to inspect consistent token application across different themes (e.g., Light vs Dark modes).

```tsx
const availableModes = React.useMemo(() => {
  const modes = new Set<string>();
  uiState.selectionValues.forEach((group) => {
    if (group.modes) {
      Object.keys(group.modes).forEach(mode => modes.add(mode));
    }
  });
  return Array.from(modes);
}, [uiState.selectionValues]);
```

## 📡 API Usage

### Figma Plugin API
The Inspector relies heavily on `figma.getNodeById` and the `getSharedPluginData` methods to check if a token name is associated with a specific property (fill, stroke, etc.).

```typescript
// Logic snippet for property checking
const tokenName = node.getSharedPluginData('tokens-studio', 'fill');
```

### IPC Protocol
| Message Type | Direction | Purpose |
| --- | --- | --- |
| `SELECTION_CHANGE` | Plugin -> UI | Notifies the UI to refresh with new node data. |
| `SELECT_NODES` | UI -> Plugin | Zooms the canvas to a specific node clicked in the inspector list. |
| `CREATE_ANNOTATION` | UI -> Plugin | Triggers the creation of a physical label node next to the selected layer. |

## 💡 Key Information for Developers
- **Performance**: Scanning large selections (50+ nodes) can be expensive. The plugin uses a `defaultWorker` to throttle these updates.
- **Property Mapping**: Each property (fill, stroke, opacity, etc.) has a dedicated keyspace in the plugin data.
- **Unstyled Nodes**: Nodes without tokens are often filtered or shown as "Unstyled" in the UI.
