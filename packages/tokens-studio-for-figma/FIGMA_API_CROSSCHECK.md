# Figma Plugin API Cross-Check Report

Cross-check of plugin implementations against [Figma Developer Docs](https://developers.figma.com/docs/plugins/api/api-reference/).

**Last updated:** Based on docs as of Feb 2025

---

## 1. Manifest Compliance

**Current manifest** (`manifest.json`):
```json
{
  "name": "Bridge (Beta-V5)",
  "id": "843461159747178978",
  "api": "1.0.0",
  "main": "dist/code.js",
  "ui": "dist/index.html",
  "editorType": ["figma", "dev"],
  "permissions": ["currentuser"],
  "capabilities": ["codegen"],
  "networkAccess": {...},
  "codegenLanguages": [...]
}
```

### Issues

| Field | Status | Doc requirement |
|-------|--------|-----------------|
| `documentAccess` | **Missing** | Required for new plugins. Must be `"dynamic-page"` to avoid full-document load delays (20–30s on large files). |
| `name`, `id`, `api`, `main`, `ui` | OK | Required |
| `editorType` | OK | Valid: figma, dev |
| `networkAccess` | OK | Has `allowedDomains` and `reasoning` |

### Recommendation
Add `"documentAccess": "dynamic-page"` to the manifest. **Note:** This will require migrating deprecated sync APIs to async (see Section 2).

---

## 2. Variable API Usage

### Compliant (Async APIs)

| API | Usage | Files |
|-----|-------|-------|
| `getVariableByIdAsync(id)` | Resolves variable by ID; returns `null` if not found | searchVariableUsage, applyUxaiChanges, setValuesOnVariable, styleGuideGenerator, TokenValueRetriever, resolveVariableInfo |
| `getLocalVariablesAsync(type?)` | Returns all local variables; optional type filter | searchVariableUsage, extractVariablesToCanvas, calculateImpact, getVariablesWithoutZombies, updateVariablesFromPlugin |
| `getVariableCollectionByIdAsync(id)` | Resolves collection by ID | pullVariables, swapFigmaModes |
| `importVariableByKeyAsync(key)` | Imports variable from library by key | TokenValueRetriever, resolveVariableInfo, updateVariablesToReference |
| `createVariable(name, collection, type)` | Creates variable in collection | setValuesOnVariable, applyUxaiChanges |
| `createVariableCollection(name)` | Creates new collection | createNecessaryVariableCollections |

### Deprecated (Sync APIs – will throw with `documentAccess: "dynamic-page"`)

| Deprecated API | Replace with | Files to update |
|----------------|--------------|-----------------|
| `getVariableById(id)` | `getVariableByIdAsync(id)` | pullVariables, getAppliedVariablesFromNode, checkVariableAliasEquality, styleGuideFromVariablesGenerator |
| `getVariableCollectionById(id)` | `getVariableCollectionByIdAsync(id)` | searchVariableUsage, applyUxaiChanges, getAppliedVariablesFromNode |
| `getLocalVariables()` | `getLocalVariablesAsync()` | setValuesOnVariable, applyUxaiChanges, createLocalVariablesInPlugin, removeUnusedVariables, attachLocalVariablesToTheme |
| `getLocalVariableCollections()` | `getLocalVariableCollectionsAsync()` | createLocalVariablesInPlugin, createLocalVariablesWithoutModesInPlugin, attachLocalVariablesToTheme |

---

## 3. Node API Usage

### Compliant

| API | Usage | Notes |
|-----|-------|-------|
| `page.loadAsync()` | Called before traversing pages | searchVariableUsage, applyUxaiChanges |
| `findAll(callback?)` | `template.findAll((n) => true)` | livingDocumentation/tokenProcessingCore |
| `findAllWithCriteria(opts)` | `node.findAllWithCriteria({ types, ... })` | utils/findAll.ts |

### Deprecated (with `documentAccess: "dynamic-page"`)

| Deprecated API | Replace with | Files to update |
|----------------|--------------|-----------------|
| `figma.getNodeById(id)` | `figma.getNodeByIdAsync(id)` | NodeManager, node.ts, removeTokensByValue, setNoneValuesOnNode |

### Dynamic page loading

With `documentAccess: "dynamic-page"`, these require `figma.loadAllPagesAsync()` first when used on `figma.root`:

- `DocumentNode.findAll()`
- `DocumentNode.findAllWithCriteria()`
- `DocumentNode.findOne()`

**Current usage:** `findAll([figma.root], ...)` in NodeManager calls `findAllWithCriteria` on each node. When `figma.root` is passed, its children are pages. Each page’s `findAllWithCriteria` needs that page to be loaded. The plugin does not call `loadAllPagesAsync()` before this.

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

## 6. Migration Checklist (for `documentAccess: "dynamic-page"`)

If you add `"documentAccess": "dynamic-page"` to the manifest:

1. **Variables**
   - [ ] Replace all `getVariableById` → `getVariableByIdAsync` (await)
   - [ ] Replace all `getVariableCollectionById` → `getVariableCollectionByIdAsync` (await)
   - [ ] Replace all `getLocalVariables` → `getLocalVariablesAsync` (await)
   - [ ] Replace all `getLocalVariableCollections` → `getLocalVariableCollectionsAsync` (await)

2. **Nodes**
   - [ ] Replace all `figma.getNodeById` → `figma.getNodeByIdAsync` (await)

3. **Document traversal**
   - [ ] Call `await figma.loadAllPagesAsync()` before `findAll([figma.root], ...)` in NodeManager when scanning the full document

4. **Typings**
   - [ ] Run `npm install --save-dev @figma/plugin-typings` for latest types

5. **Linter**
   - [ ] Install [eslint-plugin-figma-plugins](https://github.com/figma/eslint-plugin-figma-plugins) to detect deprecated usage

---

## 7. Summary

| Category | Status |
|----------|--------|
| Manifest | Missing `documentAccess`; add for new-plugin compliance |
| Variable APIs | Mixed: async used where needed; sync still used in many places |
| Node APIs | Uses deprecated `getNodeById`; no `loadAllPagesAsync` before full-doc scan |
| Error handling | `page.loadAsync()` used correctly where pages are traversed |

**Current behavior:** The plugin runs in legacy mode (no `documentAccess`), so deprecated sync APIs still work. To align with current recommendations and avoid long load times on large files, add `documentAccess: "dynamic-page"` and complete the migration steps above.
