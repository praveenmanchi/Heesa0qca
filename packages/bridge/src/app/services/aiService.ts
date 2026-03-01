/**
 * AI service for Claude and Gemini APIs.
 * Used by UXAI tab for variable/component change analysis.
 */

export type AiProvider = 'claude' | 'gemini';

export interface AiAnalysisResult {
  summary: string;
  componentImpact: string;
  suggestions: string;
  proposedChanges?: string;
  rawResponse?: string; // Fallback when parsing fails
}

async function callClaude(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error('No response from Claude');
  return text;
}

// Per https://ai.google.dev/gemini-api/docs/models: gemini-2.5-flash (stable), gemini-flash-latest (alias)
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3-flash-preview'] as const;

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
  const body = JSON.stringify({
    contents: [{ parts: [{ text: fullPrompt }] }],
    generationConfig: {
      maxOutputTokens: 4096,
      temperature: 0.2,
    },
  });

  let lastError: string | null = null;
  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (response.ok) {
      const data = await response.json();
      const candidate = data.candidates?.[0];
      const finishReason = candidate?.finishReason;
      if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
        throw new Error(`Gemini blocked the response (${finishReason}). Try rephrasing your request.`);
      }
      const parts = candidate?.content?.parts ?? [];
      const text = parts.map((p: { text?: string }) => p?.text ?? '').join('');
      if (text) return text;
    } else if (response.status === 404) {
      lastError = await response.text();
      continue; // Try next model
    } else {
      const err = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${err}`);
    }
  }
  throw new Error(`Gemini API: No model available. Last error: ${lastError}`);
}

const UXAI_SYSTEM_PROMPT = `You are an expert design system and Figma variables consultant. You help teams manage design tokens, variables, and component bindings across multiple brands/modes (e.g., Gap, Old Navy, Banana Republic, Athleta, Gap Factory).

Context you will receive:
- Variable collections (primitives, component-specific groups)
- Modes per collection (e.g., Gap 1.0, Gap 2.0, Old Navy 1.0)
- Variables with their types, values per mode
- Variable usage: which components use which variables (component names are listed)

When the user asks for a change (e.g., "add border color #000000 for full keyboard component"):
1. Provide a detailed COMPONENT IMPACT ANALYSIS: Search the usage data for the mentioned component. Which components use the affected variables? Which modes/brands will be impacted? If the component is not found in the usage data, explain that it may not yet have variable bindings and outline what that means.
2. Provide detailed SUGGESTIONS: Should we create new variables? Which collection and mode? How to remap? Consider multi-brand isolation.
3. Provide a detailed PROPOSED CHANGES roadmap: Step-by-step plan with concrete actions—e.g., "1. Create variable color.border.keyboard in Primitives collection with value #000000 for mode X. 2. Bind the stroke property of the full keyboard component to this variable. 3. ..." Be specific and actionable.

Format your response in clear sections: "## Component Impact Analysis", "## Suggestions", "## Proposed Changes".
Be thorough and provide a complete roadmap. If the component or variable is not in the data, still give a full step-by-step plan for how to implement the change.`;

export async function getAiAnalysis(
  provider: AiProvider,
  apiKey: string,
  userPrompt: string,
  context: { variablesSummary: string; collectionsSummary: string; usageSummary?: string },
): Promise<AiAnalysisResult> {
  const userMessage = `User request: ${userPrompt}

Current design system context:

### Collections & Modes
${context.collectionsSummary}

### Variables (sample/summary)
${context.variablesSummary}

${context.usageSummary ? `### Variable Usage (which components use which variables)\n${context.usageSummary}` : ''}

Analyze the request and provide your response.`;

  let rawResponse: string;
  if (provider === 'claude') {
    rawResponse = await callClaude(apiKey, UXAI_SYSTEM_PROMPT, userMessage);
  } else {
    rawResponse = await callGemini(apiKey, UXAI_SYSTEM_PROMPT, userMessage);
  }

  if (!rawResponse?.trim()) {
    throw new Error('AI returned an empty response. Try rephrasing your request or check your API key.');
  }

  // Parse markdown sections (flexible: ## Component Impact Analysis, ## Suggestions, etc.)
  const sections: Record<string, string> = {};
  const normalized = rawResponse.replace(/\r\n/g, '\n');
  const parts = normalized.split(/(?=^## )/m);
  for (const part of parts) {
    const match = part.match(/^## (.+?)\n([\s\S]*?)(?=^## |$)/m);
    if (match) {
      const [, title, content] = match;
      const key = title.trim().toLowerCase().replace(/\s+/g, ' ');
      sections[key] = content.trim();
    }
  }

  // Match section keys flexibly (e.g. "component impact analysis", "component impact")
  const getSection = (...keys: string[]) => {
    for (const k of keys) {
      const v = sections[k];
      if (v) return v;
      const partial = Object.keys(sections).find((s) => s.includes(k) || k.includes(s));
      if (partial) return sections[partial];
    }
    return '';
  };

  const componentImpact = getSection('component impact analysis', 'component impact', 'impact analysis') || rawResponse;
  let suggestions = getSection('suggestions', 'suggestion');
  let proposedChanges = getSection('proposed changes', 'proposed change', 'changes');

  // Fallback: direct regex extraction when section keys don't match
  if (!suggestions && /##\s*Suggestions/i.test(normalized)) {
    const m = normalized.match(/##\s*Suggestions\s*[\r\n]+([\s\S]*?)(?=[\r\n]+##\s|$)/im);
    if (m) suggestions = m[1].trim();
  }
  if (!proposedChanges && /##\s*Proposed\s*Changes/i.test(normalized)) {
    const m = normalized.match(/##\s*Proposed\s*Changes\s*[\r\n]+([\s\S]*?)(?=[\r\n]+##\s|$)/im);
    if (m) proposedChanges = m[1].trim();
  }

  return {
    summary: rawResponse.slice(0, 500),
    componentImpact: componentImpact.trim() || rawResponse,
    suggestions: suggestions.trim(),
    proposedChanges: proposedChanges.trim() || undefined,
    rawResponse,
  };
}

/** Structured changes the AI proposes for applying to Figma variables */
export interface UxaiVariableUpdate {
  variableId: string;
  variableName?: string;
  modeId: string;
  value: string | number | boolean;
  type: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
}

export interface UxaiVariableCreate {
  collectionId: string;
  variableName: string;
  modeId: string;
  value: string | number | boolean;
  type: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  /** If set, rebind all components using this variable to the newly created variable */
  remapFromVariableId?: string;
}

export interface UxaiStructuredChanges {
  updates?: UxaiVariableUpdate[];
  creates?: UxaiVariableCreate[];
}

const UXAI_STRUCTURED_SYSTEM_PROMPT = `You are an expert at converting design system change requests into exact Figma variable operations.

You will receive:
1. The user's original request
2. Your previous analysis (component impact, suggestions, proposed changes)
3. The full list of Figma variables (id, name, type, collectionId, valuesByMode)
4. Collections with their modes (collectionId, modeId, mode name)

Your task: Output a JSON object with the exact variable changes to apply. Use ONLY the format below. No other text.

Format:
{
  "updates": [
    {
      "variableId": "<variable id from the variables list - use the 'id' field>",
      "variableName": "<optional - variable name for fallback lookup>",
      "modeId": "<modeId from the collection modes>",
      "value": "<new value - hex for colors e.g. #0048B7, number for FLOAT, string for STRING, true/false for BOOLEAN>",
      "type": "COLOR" | "FLOAT" | "STRING" | "BOOLEAN"
    }
  ],
  "creates": [
    {
      "collectionId": "<collection id>",
      "variableName": "<dotted path e.g. color.border.button.primary>",
      "modeId": "<modeId>",
      "value": "<value>",
      "type": "COLOR" | "FLOAT" | "STRING" | "BOOLEAN",
      "remapFromVariableId": "<optional - variable id to rebind from; components using it will switch to the new variable>"
    }
  ]
}

Rules:
- Use variableId from the variables list for updates. Match by variable name if id is unclear.
- For colors use hex format: "#0048B7" or "rgba(0,72,183,1)"
- For creates, pick the appropriate collectionId and modeId from the collections info
- When creating a NEW variable to replace an existing one (e.g. for brand isolation), set remapFromVariableId to the OLD variable's id so components get rebinded to the new variable
- Only include changes that directly implement the user's request
- If no variable changes are needed, return { "updates": [], "creates": [] }
- Output ONLY valid JSON, no markdown code blocks or extra text`;

export async function getAiStructuredChanges(
  provider: AiProvider,
  apiKey: string,
  userPrompt: string,
  analysisResult: AiAnalysisResult,
  variablesJson: any[],
  collectionsInfo: { id: string; name: string; modes: { modeId: string; name: string }[] }[],
): Promise<UxaiStructuredChanges> {
  const collectionsStr = collectionsInfo.map((c) => `- ${c.name} (id: ${c.id}): modes ${c.modes.map((m) => `${m.name} (modeId: ${m.modeId})`).join(', ')}`).join('\n');

  const userMessage = `User request: ${userPrompt}

Previous analysis:
- Component Impact: ${analysisResult.componentImpact?.slice(0, 500) || 'N/A'}
- Proposed Changes: ${analysisResult.proposedChanges?.slice(0, 500) || analysisResult.suggestions?.slice(0, 500) || 'N/A'}

Collections & Modes:
${collectionsStr}

Variables (use these ids and types):
${JSON.stringify(variablesJson.slice(0, 100), null, 2)}

Output the JSON object with updates and creates to apply these changes.`;

  let rawResponse: string;
  if (provider === 'claude') {
    rawResponse = await callClaude(apiKey, UXAI_STRUCTURED_SYSTEM_PROMPT, userMessage);
  } else {
    rawResponse = await callGemini(apiKey, UXAI_STRUCTURED_SYSTEM_PROMPT, userMessage);
  }

  if (!rawResponse?.trim()) {
    throw new Error('AI returned no structured changes.');
  }

  // Extract JSON from response (handle ```json ... ``` blocks)
  let jsonStr = rawResponse.trim();
  const jsonBlock = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlock) {
    jsonStr = jsonBlock[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonStr) as UxaiStructuredChanges;
    return {
      updates: Array.isArray(parsed.updates) ? parsed.updates : [],
      creates: Array.isArray(parsed.creates) ? parsed.creates : [],
    };
  } catch {
    throw new Error('Could not parse AI response as JSON. The AI may need to be more precise.');
  }
}
