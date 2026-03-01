# Variables Tab Technical Documentation

The Variables Tab provides a powerful search interface to find and map native Figma variable usage across the entire document.

## 📌 Functionality Overview
- **Usage Scanning**: Searches every node in the document for references to Variable IDs.
- **Hierarchical Results**: Groups results by Variable Collection and Component.
- **Node Selection**: Clicking a result selects and focuses on the associated layer on the canvas.

## 🛠 Technical Implementation

### Search Protocol
The UI sends a search query to the Controller, which iterates through the document tree.

```tsx
// VariableUsageSearch.tsx
const handleSearch = useCallback(async () => {
    const response = await AsyncMessageChannel.ReactInstance.message({
        type: AsyncMessageTypes.SEARCH_VARIABLE_USAGE,
        query: searchQuery,
    });
    setResults(response.variables);
}, [searchQuery]);
```

### Result Mapping
The Controller returns a `VariableUsageResult` object that maps Variable IDs to the component names and node IDs where they are applied.

```typescript
export interface VariableUsageResult {
    variableId: string;
    variableName: string;
    collectionName: string;
    totalCount: number;
    components: Array<{
        componentName: string;
        nodeIds: string[];
    }>;
}
```

### Canvas Interaction
The UI uses the `SELECT_NODES` IPC message to interact with the canvas when a user clicks a usage item.

```tsx
const handleSelectNodes = useCallback(async (nodeIds: string[]) => {
    await AsyncMessageChannel.ReactInstance.message({
        type: AsyncMessageTypes.SELECT_NODES,
        ids: nodeIds,
    });
}, []);
```

## 📡 API Usage

### Figma Plugin API
The backend logic utilizes the `findAll` and `getBoundVariable` APIs to locate usage.

```typescript
// Conceptual backend logic
const nodes = figma.root.findAll(node => {
    const fills = node.getBoundVariable('fills');
    return fills && fills.id === targetVariableId;
});
```

### IPC Protocol
| Message Type | Direction | Purpose |
| --- | --- | --- |
| `SEARCH_VARIABLE_USAGE` | UI -> Plugin | Triggers a full-document scan for specific variable references. |
| `SELECT_NODES` | UI -> Plugin | Highlights and scrolls to specific layer IDs on the canvas. |

## 💡 Key Information for Developers
- **Scanning Context**: The scan covers the entire document (`figma.root`), not just the current page.
- **Performance**: Document-wide scans can be slow. Results are cached and limited to the top 50 matches in the UI.
- **Ununstyled Frames**: The UI filters out internal Figma frames (like auto-layout wrappers) from the component list to keep results relevant.
