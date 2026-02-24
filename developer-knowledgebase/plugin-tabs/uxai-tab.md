# UXAI Tab Technical Documentation

The UXAI (AI-Powered Variable Changes) tab uses Claude or Gemini to analyze design system change requests and propose variable updates. It supports both analysis-only workflows and applying changes directly to Figma variables and components.

## 📌 Functionality Overview

- **AI Analysis**: Sends the user's prompt plus design system context (variables, collections, usage) to Claude or Gemini.
- **Change Summary**: Parses the AI response into three sections—Component Impact Analysis, Suggestions, and Proposed Changes.
- **Confirm & Apply**: Makes a second AI call for structured JSON changes, then applies them to Figma variables and optionally remaps component bindings.
- **History & Undo**: Persists the last 10 analyses in `figma.clientStorage` and supports undo/restore.

## 🛠 Technical Implementation

### Analyze Flow

When the user clicks **Analyze**, the UI:

1. **Extracts variables** via `EXTRACT_VARIABLES_TO_CANVAS` (plugin returns all local variables as JSON).
2. **Gets collections** (names and modes) from the same response.
3. **Gets variable usage** via `SEARCH_VARIABLE_USAGE` (which components use which variables).
4. **Calls `getAiAnalysis()`** in `aiService.ts` with the prompt and context.

```tsx
// UXAITab.tsx - handleAnalyze
const extractRes = await AsyncMessageChannel.ReactInstance.message({
  type: AsyncMessageTypes.EXTRACT_VARIABLES_TO_CANVAS,
});
const analysis = await getAiAnalysis(provider, apiKey, prompt.trim(), {
  variablesSummary,
  collectionsSummary,
  usageSummary: usageSummary || undefined,
});
```

### AI Context Sent

The user message includes:

- **User request**: The raw prompt (e.g., "Change the border color of Primary Button to #0048B7 in Gap 2.0 only").
- **Collections & Modes**: Collection names and their modes.
- **Variables (sample)**: First 20 variables with id, name, type, valuesByMode, collectionId.
- **Variable Usage**: Up to 15 variables with usage counts and component names.

### System Prompt

The AI is instructed to respond with three markdown sections:

- `## Component Impact Analysis` — Which components are affected, which modes/brands.
- `## Suggestions` — Whether to create new variables, how to remap, multi-brand isolation.
- `## Proposed Changes` — Step-by-step plan (create variable X, remap Y, etc.).

### Response Parsing

`getAiAnalysis()` in `aiService.ts` parses the raw markdown:

1. Splits on `## ` headings.
2. Extracts content for each section with flexible key matching.
3. Returns `AiAnalysisResult` with `componentImpact`, `suggestions`, `proposedChanges`, `rawResponse`.

```typescript
// aiService.ts
export interface AiAnalysisResult {
  summary: string;
  componentImpact: string;
  suggestions: string;
  proposedChanges?: string;
  rawResponse?: string;
}
```

### Confirm & Apply Flow

When the user clicks **Confirm & Apply**:

1. **Re-extracts variables** (fresh state).
2. **Calls `getAiStructuredChanges()`** — Second AI call that returns JSON with `updates` and `creates`.
3. **Sends `APPLY_UXAI_CHANGES`** to the plugin with the structured changes.
4. **Plugin applies** variable updates, creates new variables, and optionally remaps component bindings.

### Structured Changes Format

The AI returns JSON in this shape:

```json
{
  "updates": [
    {
      "variableId": "<from variables list>",
      "variableName": "<optional fallback>",
      "modeId": "<from collection modes>",
      "value": "#0048B7",
      "type": "COLOR"
    }
  ],
  "creates": [
    {
      "collectionId": "<collection id>",
      "variableName": "color.border.button.primary",
      "modeId": "<modeId>",
      "value": "#0048B7",
      "type": "COLOR",
      "remapFromVariableId": "<optional - rebind components from old to new>"
    }
  ]
}
```

### Apply Handler

`applyUxaiChanges.ts` in the plugin:

- **Updates**: Finds variable by ID (or name), converts value by type (COLOR/FLOAT/STRING/BOOLEAN), calls `variable.setValueForMode(modeId, figmaValue)`.
- **Creates**: Creates variable in collection, sets value for mode.
- **Remaps**: If `remapFromVariableId` is set, traverses the document and rebinds nodes (fills, strokes, component properties) from the old variable to the new one.
- **Refresh**: Calls `sendSelectionChange()` to update the inspector.

## 📡 IPC Protocol

| Message Type | Direction | Purpose |
| --- | --- | --- |
| `EXTRACT_VARIABLES_TO_CANVAS` | UI → Plugin | Get all local variables as JSON plus collections info. |
| `SEARCH_VARIABLE_USAGE` | UI → Plugin | Get which components use which variables. |
| `APPLY_UXAI_CHANGES` | UI → Plugin | Apply structured variable updates/creates and optional remaps. |
| `GET_UXAI_HISTORY` | UI → Plugin | Load persisted analysis history from `figma.clientStorage`. |
| `SET_UXAI_HISTORY` | UI → Plugin | Save analysis history. |

## 📂 Key Files

| File | Purpose |
| --- | --- |
| `src/app/components/UXAITab.tsx` | Main tab UI, analyze/confirm handlers, history. |
| `src/app/services/aiService.ts` | `getAiAnalysis()`, `getAiStructuredChanges()`, Claude/Gemini API calls. |
| `src/app/components/uxai/AnalysisContent.tsx` | Renders markdown (bold, italic, code, lists). |
| `src/plugin/asyncMessageHandlers/applyUxaiChanges.ts` | Applies variable updates, creates, remaps. |
| `src/plugin/asyncMessageHandlers/extractVariablesToCanvas.ts` | Extracts variables from Figma. |
| `src/plugin/asyncMessageHandlers/uxaiHistory.ts` | Persists/loads history in `figma.clientStorage`. |

## 💡 Key Information for Developers

- **AI Providers**: Claude (Anthropic) and Gemini (Google). API keys are configured in Settings.
- **Variable Types**: COLOR, FLOAT, STRING, BOOLEAN. Colors use hex or rgba; converted via `convertToFigmaColor()`.
- **Remapping**: When creating a new variable for brand isolation, set `remapFromVariableId` so components switch from the old variable to the new one.
- **History**: Stored under `uxai-history` in `figma.clientStorage`. Max 10 entries.
- **Network**: Figma plugins may need a proxy for external API calls; CORS can block direct fetch to Anthropic/Google.
