# Figma Plugin API Cross-Check Report

Cross-check of Bridge plugin implementation against [Figma Developer Docs](https://developers.figma.com/docs/plugins/api/api-reference/).

**Last updated:** Feb 2025 (post deep inspection)

---

## 1. Manifest Compliance

**Current manifest** (`manifest.json`):
```json
{
  "name": "Bridge (Beta-V7)",
  "id": "1588064189860517649",
  "api": "1.0.0",
  "main": "dist/code.js",
  "ui": "dist/index.html",
  "editorType": ["figma", "dev"],
  "permissions": ["currentuser"],
  "capabilities": ["codegen"],
  "documentAccess": "dynamic-page",
  "networkAccess": {...},
  "codegenLanguages": [{"label": "Tokens", "value": "tokens"}]
}
```

### Status

| Field | Status | Notes |
|-------|--------|-------|
| `documentAccess` | ✅ OK | `"dynamic-page"` present – required for new plugins |
| `name`, `id`, `api`, `main`, `ui` | ✅ OK | Required fields present |
| `editorType` | ✅ OK | Valid: figma, dev |
| `networkAccess` | ✅ OK | Has `allowedDomains` and `reasoning` |
| `capabilities` | ✅ OK | `codegen` for Dev Mode |
| `codegenLanguages` | ✅ OK | Required for codegen plugins |

**Note:** With `documentAccess: "dynamic-page"`, deprecated **sync** Variable APIs will throw. See Section 2.

---

## 2. Variable API Usage

### Compliant (Async APIs)

| API | Usage | Files |
|-----|-------|-------|
| `getVariableByIdAsync(id)` | Resolves variable by ID; returns `null` if not found | selectionVisualization, searchVariableUsage, applyUxaiChanges, setValuesOnVariable, styleGuideGenerator, TokenValueRetriever, resolveVariableInfo, pullVariables, getAppliedVariablesFromNode |
| `getLocalVariablesAsync(type?)` | Returns all local variables; optional type filter | searchVariableUsage, extractVariablesToCanvas, calculateImpact, getVariablesWithoutZombies, updateVariablesFromPlugin |
| `getVariableCollectionByIdAsync(id)` | Resolves collection by ID | pullVariables, swapFigmaModes, searchVariableUsage |
| `importVariableByKeyAsync(key)` | Imports variable from library by key | TokenValueRetriever, resolveVariableInfo, updateVariablesToReference, searchVariableUsage |
| `createVariable(name, collection, type)` | Creates variable in collection (sync – allowed) | setValuesOnVariable, applyUxaiChanges |
| `createVariableCollection(name)` | Creates new collection (sync – allowed) | createNecessaryVariableCollections |

### ⚠️ Deprecated (Sync APIs – will throw with `documentAccess: "dynamic-page"`)

| Deprecated API | Replace with | Files to update |
|----------------|--------------|-----------------|
| `getVariableById(id)` | `getVariableByIdAsync(id)` | **checkVariableAliasEquality.ts** |
| `getVariableCollectionById(id)` | `getVariableCollectionByIdAsync(id)` | **applyUxaiChanges.ts** |
| `getLocalVariables()` | `getLocalVariablesAsync()` | **setValuesOnVariable.ts**, **updateVariables.ts**, **attachLocalVariablesToTheme.ts**, **applyUxaiChanges.ts** |
| `getLocalVariableCollections()` | `getLocalVariableCollectionsAsync()` | **createLocalVariablesInPlugin.ts**, **attachLocalVariablesToTheme.ts** |

### Known workaround in `updateVariables.ts`

```ts
// There seems to be a bug with getLocalVariablesAsync. It's not returning the variables in the collection - when they're being created.
// We could also get the current collection with figma.variables.getVariableCollectionByIdAsync(collection.id) and then fetch each variable,
const variablesInCollection = figma.variables.getLocalVariables()
  .filter((v) => v.variableCollectionId === collection.id);
```

**Recommendation:** Use `getVariableCollectionByIdAsync(collection.id)` and then `.variableIds` or iterate via `getVariableByIdAsync` for each variable in the collection. Or retry `getLocalVariablesAsync()` after a short delay if variables were just created.

---

## 3. Node API Usage

### Compliant

| API | Usage | Notes |
|-----|-------|-------|
| `figma.getNodeByIdAsync(id)` | NodeManager, node.ts, removeTokensByValue, setNoneValuesOnNode | ✅ All async |
| `page.loadAsync()` | searchVariableUsage, applyUxaiChanges | Called before traversing pages |
| `findAll(callback?)` | livingDocumentation/tokenProcessingCore | Called on FrameNode (template), not PageNode |
| `findAllWithCriteria(opts)` | utils/findAll.ts | Used via `node.findAllWithCriteria({ types, ... })` |

### ⚠️ Dynamic page loading – full document scan

With `documentAccess: "dynamic-page"`, when traversing `figma.root`:

- `DocumentNode.findAllWithCriteria()` iterates over page children. Pages must be loaded first.
- **Current usage:** `NodeManager.findBaseNodesWithData()` with `UpdateMode` other than `PAGE` or `SELECTION` calls `findAll([figma.root], ...)`.
- **Risk:** `findAll` → `figma.root.findAllWithCriteria` may access unloaded pages.

**Recommendation:** Call `await figma.loadAllPagesAsync()` before `findAll([figma.root], ...)` in NodeManager when scanning the full document.

---

## 4. Variable & VariableValue Types

From [Variable](https://developers.figma.com/docs/plugins/api/Variable/) docs:

- `Variable.id` – unique identifier
- `Variable.name` – editable
- `Variable.key` – for `importVariableByKeyAsync`
- `Variable.variableCollectionId` – collection ID
- `Variable.resolvedType` – COLOR, FLOAT, STRING, BOOLEAN
- `Variable.valuesByMode` – values per mode (does not resolve aliases)
- `Variable.resolveForConsumer(node)` – resolved value when bound to a node
- `Variable.setValueForMode(modeId, value)` – set value for a mode

**Implementation:** Usage of `v.id`, `v.name`, `v.variableCollectionId`, and `variable.setValueForMode` in applyUxaiChanges and setValuesOnVariable matches the docs.

---

## 5. API Errors

From [API Errors](https://developers.figma.com/docs/plugins/api/api-errors/):

- Invalid operations throw with pattern: `Error: in <operation>: Expected <prop> to have type <X> but got <Y> instead`
- Unloaded page: `Cannot access children on a page that has not been explicitly loaded. Remember to call await page.loadAsync() or await figma.loadAllPagesAsync() first`
- Deprecated API with dynamic-page: `Cannot call <X> with documentAccess: dynamic-page. Use <Y> instead`

**Implementation:** searchVariableUsage and applyUxaiChanges call `page.loadAsync()` before traversing pages, which is correct for dynamic loading.

---

## 6. Feature Verification

| Feature | Status | Notes |
|--------|--------|-------|
| **Inspect** | ✅ OK | Uses `getSelectionVisualization`; variable names via `getVariableByIdAsync` |
| **Multi Inspect** | ✅ OK | `goToNodeId` for single-node components; `selectNodes` for multi-node (filters to current page) |
| **Visualization tab** | ✅ OK | Shows variable names; `totalCount`/`componentCount` = 0 (document scan removed for performance) |
| **Variable search** | ✅ OK | `searchVariableUsage` uses async APIs; `page.loadAsync()` for all pages |
| **Pull variables** | ✅ OK | Uses `getVariableCollectionByIdAsync`, `getVariableByIdAsync` |
| **Create variables** | ⚠️ Partial | Uses `getLocalVariables()` in updateVariables, setValuesOnVariable – may throw |
| **Attach variables to theme** | ⚠️ Partial | Uses `getLocalVariableCollections()`, `getLocalVariables()` – may throw |
| **Apply UXAI changes** | ⚠️ Partial | Uses `getLocalVariables()`, `getVariableCollectionById()` – may throw |
| **Codegen** | ✅ OK | `performCodeGen`; `capabilities: ["codegen"]` |

---

## 7. Migration Checklist (for full `documentAccess: "dynamic-page"` compliance)

1. **Variables**
   - [x] Replace `getVariableById` → `getVariableByIdAsync` in **checkVariableAliasEquality.ts** (make function async)
   - [x] Replace `getVariableCollectionById` → `getVariableCollectionByIdAsync` in **applyUxaiChanges.ts**
   - [x] Replace `getLocalVariables` → `getLocalVariablesAsync` in:
     - [x] **setValuesOnVariable.ts**
     - [x] **updateVariables.ts** (uses getVariableCollectionByIdAsync + variableIds when available)
     - [x] **attachLocalVariablesToTheme.ts**
     - [x] **applyUxaiChanges.ts**
   - [x] Replace `getLocalVariableCollections` → `getLocalVariableCollectionsAsync` in:
     - [x] **createLocalVariablesInPlugin.ts**
     - [x] **createLocalVariablesWithoutModesInPlugin.ts**
     - [x] **attachLocalVariablesToTheme.ts**

2. **Nodes**
   - [x] All `figma.getNodeById` → `figma.getNodeByIdAsync` (already migrated)

3. **Document traversal**
   - [x] Call `await figma.loadAllPagesAsync()` before `findAll([figma.root], ...)` in NodeManager when scanning the full document

4. **Typings**
   - [x] `@figma/plugin-typings` in package.json (v1.96.0)

5. **Linter**
   - [ ] Install [eslint-plugin-figma-plugins](https://github.com/figma/eslint-plugin-figma-plugins) to detect deprecated usage

---

## 8. Summary

| Category | Status |
|----------|--------|
| Manifest | ✅ Compliant with `documentAccess: "dynamic-page"` |
| Variable APIs | ⚠️ Mixed: async used in most places; sync still used in 4–5 files |
| Node APIs | ✅ Uses `getNodeByIdAsync` |
| Document traversal | ⚠️ NodeManager full-doc scan may need `loadAllPagesAsync` |
| Error handling | ✅ `page.loadAsync()` used correctly where pages are traversed |

**Current behavior:** The plugin runs with `documentAccess: "dynamic-page"`. All deprecated sync Variable APIs have been migrated to async. Full compatibility achieved (V7).
