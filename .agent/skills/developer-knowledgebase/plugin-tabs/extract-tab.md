# Extract Tab Technical Documentation

The Extract Tab is a migration and synchronization tool that bridge Figma's native variables with the Tokens Studio environment. It also handles direct deployment of tokens to GitHub.

## 📌 Functionality Overview
- **Extraction**: Serializes Figma Variables into the Tokens Studio JSON format.
- **GitHub Sync**: Fetch, compare, and push changes to GitHub repositories.
- **Diffing**: Visual side-by-side comparison of local changes vs GitHub remote.
- **Impact Analysis**: Scans the document to see how many component instances will change if variables are updated.

## 🛠 Technical Implementation

### Extraction Flow
The extraction process triggers a Controller action that iterates through all `VariableCollections` in the document.

```tsx
// ExtractTab.tsx
const handleExtract = useCallback(async () => {
    const response = await AsyncMessageChannel.ReactInstance.message({
        type: AsyncMessageTypes.EXTRACT_VARIABLES_TO_CANVAS,
    });
    setJsonResult(response.jsonString || '');
}, []);
```

### GitHub Diffing Logic
The tab uses a `compareVariables` utility function to identify changes. It compares IDs, names, and values-by-mode.

```typescript
// Conceptual diffing implementation
const diffResult = compareVariables(oldVars, newVars);
// Returns: { added: [], removed: [], changed: [] }
```

### Variable Impact Calculation
Before pushing, the UI requests an impact calculation to warn the user about the scope of their changes.

```tsx
const impactRes = await AsyncMessageChannel.ReactInstance.message({
    type: AsyncMessageTypes.CALCULATE_VARIABLES_IMPACT,
    variableIds: variableIdsToImpactCheck,
});
```

## 📡 API Usage

### External APIs
- **GitHub REST API**: Used via `githubPrHandler.ts` to fetch file content and create pull requests.
- **Microsoft Teams Webhook**: Triggered on successful PR creation to notify stakeholders.

### IPC Protocol
| Message Type | Direction | Purpose |
| --- | --- | --- |
| `EXTRACT_VARIABLES_TO_CANVAS` | UI -> Plugin | Triggers the serialization of all document variables. |
| `CALCULATE_VARIABLES_IMPACT` | UI -> Plugin | Scans all nodes for usage of specific Variable IDs. |

## 💡 Key Information for Developers
- **Credentials**: Pulling and pushing to GitHub requires a Personal Access Token (PAT) configured in Settings.
- **Conflict Handling**: The diffing logic identifies variables by ID, allowing for name changes to be tracked as "Modifications" rather than "Add/Remove" pairs.
- **Pagination**: Large variable lists in the analysis summary are truncated to ensure UI performance.
