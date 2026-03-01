# Tokens Tab Technical Documentation

The Tokens Tab is the core interface for managing design tokens. It allows users to define, organize, and resolve token values across different sets and themes.

## 📌 Functionality Overview
- **Storage & Retrieval**: Loads tokens from Figma's `SharedPluginData`.
- **Token Resolution**: Computes the final value of alias tokens (e.g., `{colors.brand}` -> `#FF0000`).
- **Set Management**: Users can toggle "enabled" states for different token sets to control inheritance.
- **JSON Editing**: Direct manipulation of the token library via a code editor.

## 🛠 Technical Implementation

### State Management
The tab is driven by the `tokenState` Redux slice. It keeps track of `tokens` (grouped by set) and the `activeTokenSet`.

```tsx
// Tokens.tsx - Basic state selection
const tokens = useSelector(tokensSelector);
const activeTokenSet = useSelector(activeTokenSetSelector);
const usedTokenSet = useSelector(usedTokenSetSelector);
```

### Token Resolution Engine
The plugin uses a centralized `defaultTokenResolver` to handle aliases. It merges token groups based on the active selection and computes their final values.

```tsx
const resolvedTokens = React.useMemo(
  () => defaultTokenResolver.setTokens(mergeTokenGroups(tokens, usedTokenSet, {}, activeTokenSet)),
  [tokens, usedTokenSet, activeTokenSet]
);
```

### Persistence Logic
Tokens are synchronized with the Figma document whenever they are modified. This is handled via the `UPDATE` message type.

```tsx
// UI Side triggering an update
dispatch.tokenState.setStringTokens(val);

// Controller Side (plugin logic)
AsyncMessageChannel.PluginInstance.handle(AsyncMessageTypes.UPDATE, asyncHandlers.update);
```

## 📡 API Usage

### Figma Plugin API
The Controller uses the `figma.root.setSharedPluginData` API to persist the token JSON string globally within the document.

```typescript
// Example of internal persistence (Conceptual)
figma.root.setSharedPluginData('tokens-studio', 'tokens', JSON.stringify(tokens));
```

### IPC Protocol
| Message Type | Direction | Purpose |
| --- | --- | --- |
| `UPDATE` | UI -> Plugin | Pushes new token values to the Figma document. |
| `SET_NODE_DATA` | UI -> Plugin | Applies a specific token value to a selected layer. |
| `GET_FIGMA_FONTS` | UI -> Plugin | Fetches available system fonts for typography tokens. |

## 💡 Key Information for Developers
- **Alias Syntax**: Tokens use a curly-brace syntax for aliases: `{colors.primary.500}`.
- **Performance**: High token counts (1000+) can slow down resolution. Use `memoizedTokens` and `React.useMemo` to prevent UI lag.
- **Conflict Resolution**: If two token sets define the same token name, the one listed later in the "active sets" takes precedence.
