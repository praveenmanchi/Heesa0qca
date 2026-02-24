# Core Architecture Documentation

This document describes the foundational systems that power the The Bridge plugin, specifically the communication bridge and the token resolution engine.

---

## 🏗 The Split Architecture

The plugin is architected into two distinct environments to comply with Figma's security and performance constraints:

1.  **UI Process (React)**:
    *   Runs in an iframe.
    *   Handles the user interface, complex logic (like GitHub sync), and Redux state.
    *   Cannot directly access the Figma Canvas.

2.  **Plugin Controller (Figma Sandbox)**:
    *   Runs in the main Figma process.
    *   Has direct access to the `figma` API (nodes, styles, variables).
    *   Should handle minimal logic to keep the UI responsive.

---

## 📡 Messaging Bridge: `AsyncMessageChannel`

The `AsyncMessageChannel` is a type-safe, asynchronous wrapper around the native `postMessage` API. It allows the UI to request data from the Controller and wait for a response using Promises.

### Key Components:
- **`ReactInstance`**: Used in the UI to send messages to the Plugin.
- **`PluginInstance`**: Used in the Controller to handle incoming requests and send responses back.

### Usage Example:
```typescript
// UI Side: Sending a request
const result = await AsyncMessageChannel.ReactInstance.message({
  type: AsyncMessageTypes.SEARCH_VARIABLE_USAGE,
  query: 'brand.primary',
});

// Controller Side: Handling the request
AsyncMessageChannel.PluginInstance.handle(
  AsyncMessageTypes.SEARCH_VARIABLE_USAGE,
  async (msg) => {
    const results = await performScan(msg.query);
    return { variables: results }; // The result is automatically sent back to the UI
  }
);
```

---

## 🧠 Token Resolution: `TokenResolver`

The `TokenResolver` is the core computational engine. It is responsible for resolving aliases and computing final values from raw token data.

### Resolution Steps:
1.  **Map Initialization**: Converts the token list into a `Map` for O(1) lookups by name.
2.  **Alias Detection**: Uses `AliasRegex` to find strings like `{colors.brand}`.
3.  **Recursive Resolution**: If an alias is found, it recursively looks up the referenced token.
4.  **Value Calculation**: Handles math (`checkAndEvaluateMath`) and color modifications.
5.  **Memoization**: Caches resolved values in a `memo` map to avoid redundant calculations.

### Circular Reference Detection:
The resolver tracks `resolvedReferences` in a `Set` during the recursive loop. If it encounters a key already in the set, it marks the token as `failedToResolve: true` to prevent infinite loops.

### Technical Example:
```typescript
// Manually resolving a single token
const resolved = defaultTokenResolver.resolveReferences({
  name: 'button-bg',
  value: '{colors.primary.500}'
});

console.log(resolved.value); // Outputs: "#0055FF" (if colors.primary.500 resolves to that)
```

---

## ⚡️ Performance: Responsive Scanning

To prevent UI freezes on large Figma documents, the plugin uses a **Time-Based Reserving** (Yielding) strategy during deep node scans (e.g., in `SEARCH_VARIABLE_USAGE`).

- **Chunked Processing**: The scanner checks the current execution time every 10 nodes.
- **Micro-Yields**: If a block of execution exceeds ~12ms, it triggers a `setTimeout(resolve, 5)` to yield back to the Figma main thread.

```typescript
// searchVariableUsage.ts - Yielding logic
if (processedCount % 10 === 0) {
  if (Date.now() - lastYieldTime > 12) {
    await new Promise((resolve) => setTimeout(resolve, 5));
    lastYieldTime = Date.now();
  }
}
```

---

## 🎨 UX: Onboarding & Empty States

The plugin manages the initial user experience through a combination of empty states and proactive explainers.

- **`EmptyState` Component**: Standardized UI for when no layers are selected or no tokens are found.
- **`OnboardingExplainer`**: A contextual popover that appears for first-time users to explain complex tabs like the Inspector.
- **Translation**: All onboarding copy is localized via `i18next`.

---

## ⚠️ Developer Best Practices

1.  **Always use `AsyncMessageChannel`**: Never use native `parent.postMessage` directly to ensure type safety and proper promise handling.
2.  **Keep the Controller Light**: Long-running operations in the Controller will freeze the Figma UI. Offload heavy lifting to the UI process where possible.
3.  **Respect Memoization**: When bulk-updating tokens, use `setTokens` to clear the cache and re-populate the resolver efficiently.
4.  **Yield on Scans**: When writing new document traversal logic, always use the yielding pattern to keep the app responsive.
