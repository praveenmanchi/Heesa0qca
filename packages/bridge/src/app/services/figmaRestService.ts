/* eslint-disable no-console */
/**
 * Lightweight Figma REST API helper for UXAI dual-file mode.
 *
 * Runs in the UI (browser) context, using user-provided personal access tokens.
 * We only fetch and cache minimal metadata needed for cross-file variable usage analysis.
 */

export type DualFileConfig = {
  enabled: boolean;
  variablesFileId?: string;
  variablesFileApiKey?: string;
  componentsFileId?: string;
  componentsFileApiKey?: string;
};

type VariableUsageEntry = {
  variableId: string;
  variableName: string;
  totalCount: number;
  componentCounts: Record<string, number>;
};

type FigmaRestNode = {
  id: string;
  name?: string;
  type?: string;
  children?: FigmaRestNode[];
  boundVariables?: unknown;
  effects?: { boundVariables?: unknown }[];
};

type FigmaVariablesLocalResponse = {
  meta?: {
    variables?: Array<{
      id: string;
      name: string;
    }>;
  };
};

type FigmaFileResponse = {
  document?: FigmaRestNode;
};

type ComponentsFileUsageCache = {
  fileId: string;
  createdAt: number;
  entries: VariableUsageEntry[];
};

const COMPONENTS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const COMPONENTS_CACHE_KEY_PREFIX = 'uxai/componentsFileUsageCache/';

function getComponentsCacheKey(fileId: string) {
  return `${COMPONENTS_CACHE_KEY_PREFIX}${fileId}`;
}

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function storeComponentsUsageCache(fileId: string, entries: VariableUsageEntry[]) {
  try {
    const payload: ComponentsFileUsageCache = {
      fileId,
      createdAt: Date.now(),
      entries,
    };
    window.localStorage.setItem(getComponentsCacheKey(fileId), JSON.stringify(payload));
  } catch {
    // Ignore storage errors (e.g., quota exceeded or disabled storage)
  }
}

function loadComponentsUsageCache(fileId: string): VariableUsageEntry[] | null {
  try {
    const raw = window.localStorage.getItem(getComponentsCacheKey(fileId));
    const cache = safeParseJson<ComponentsFileUsageCache>(raw);
    if (!cache) return null;
    if (Date.now() - cache.createdAt > COMPONENTS_CACHE_TTL_MS) return null;
    if (cache.fileId !== fileId || !Array.isArray(cache.entries)) return null;
    return cache.entries;
  } catch {
    return null;
  }
}

function extractVariableIdsRecursive(value: unknown, acc: Set<string>) {
  if (!value) return;
  if (typeof value === 'object' && value !== null && 'id' in value && typeof (value as { id?: unknown }).id === 'string') {
    acc.add((value as { id: string }).id);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => extractVariableIdsRecursive(item, acc));
    return;
  }
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach((v) => extractVariableIdsRecursive(v, acc));
  }
}

function traverseComponentsFileDocument(
  root: FigmaRestNode,
  variableNameById: Map<string, string>,
): VariableUsageEntry[] {
  const usageMap = new Map<string, VariableUsageEntry>();

  function recordUsage(variableId: string, componentName: string | undefined) {
    const name = variableNameById.get(variableId) ?? variableId;
    const key = variableId;
    const entry = usageMap.get(key) ?? {
      variableId,
      variableName: name,
      totalCount: 0,
      componentCounts: {},
    };
    entry.totalCount += 1;
    if (componentName) {
      entry.componentCounts[componentName] = (entry.componentCounts[componentName] ?? 0) + 1;
    }
    usageMap.set(key, entry);
  }

  function walk(node: FigmaRestNode, currentComponentName?: string) {
    const isComponentLike = node.type === 'COMPONENT' || node.type === 'COMPONENT_SET' || node.type === 'INSTANCE';
    const componentName = isComponentLike ? (node.name || currentComponentName) : currentComponentName;

    try {
      const varIds = new Set<string>();
      if (node.boundVariables) {
        extractVariableIdsRecursive(node.boundVariables, varIds);
      }
      if (Array.isArray(node.effects)) {
        node.effects.forEach((effect) => {
          if (effect?.boundVariables) extractVariableIdsRecursive(effect.boundVariables, varIds);
        });
      }
      if (varIds.size > 0) {
        varIds.forEach((id) => recordUsage(id, componentName));
      }
    } catch {
      // Skip malformed nodes
    }

    if (Array.isArray(node.children)) {
      node.children.forEach((child) => walk(child, componentName));
    }
  }

  walk(root);
  return Array.from(usageMap.values());
}

async function fetchFigmaJson<T>(url: string, apiKey: string): Promise<T> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Figma-Token': apiKey,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Figma API ${res.status}: ${text || res.statusText}`);
  }

  return res.json() as Promise<T>;
}

async function fetchComponentsFileVariableUsage(
  fileId: string,
  apiKey: string,
): Promise<VariableUsageEntry[]> {
  const cached = loadComponentsUsageCache(fileId);
  if (cached) return cached;

  const [variablesRes, fileRes] = await Promise.all([
    fetchFigmaJson<FigmaVariablesLocalResponse>(`https://api.figma.com/v1/files/${encodeURIComponent(fileId)}/variables/local`, apiKey),
    fetchFigmaJson<FigmaFileResponse>(`https://api.figma.com/v1/files/${encodeURIComponent(fileId)}`, apiKey),
  ]);

  const variableNameById = new Map<string, string>();
  const variables = variablesRes.meta?.variables ?? [];
  variables.forEach((v) => {
    if (v.id && v.name) {
      variableNameById.set(v.id, v.name);
    }
  });

  if (!fileRes.document) {
    return [];
  }

  const entries = traverseComponentsFileDocument(fileRes.document, variableNameById);
  storeComponentsUsageCache(fileId, entries);
  return entries;
}

export async function getDualFileUsageSummary(
  config: DualFileConfig,
): Promise<{ summary: string; error?: string }> {
  if (!config.enabled) {
    return { summary: '' };
  }

  const fileId = config.componentsFileId?.trim();
  const apiKey = config.componentsFileApiKey?.trim();
  if (!fileId || !apiKey) {
    return { summary: '' };
  }

  try {
    const entries = await fetchComponentsFileVariableUsage(fileId, apiKey);
    if (!entries.length) {
      return {
        summary: `No variable bindings detected in Components file (${fileId}).`,
      };
    }

    const lines: string[] = [];
    lines.push(`Components file: ${fileId}`);
    lines.push('');

    const sorted = [...entries].sort((a, b) => b.totalCount - a.totalCount);
    const top = sorted.slice(0, 25);
    top.forEach((entry) => {
      const components = Object.entries(entry.componentCounts)
        .sort(([, aCount], [, bCount]) => bCount - aCount)
        .slice(0, 10)
        .map(([name, count]) => `${name} (${count})`);
      const componentsSummary = components.length > 0 ? ` → used by: [${components.join(', ')}]` : '';
      lines.push(`- ${entry.variableName} [${entry.variableId}]: ${entry.totalCount} uses${componentsSummary}`);
    });

    if (sorted.length > top.length) {
      lines.push(`…and ${sorted.length - top.length} more variables.`);
    }

    return {
      summary: lines.join('\n'),
    };
  } catch (err: any) {
    const msg = err?.message ?? String(err ?? 'Unknown error');
    console.warn('UXAI dual-file: failed to fetch components file usage', err);
    return {
      summary: '',
      error: `Dual-file analysis: could not load Components file (${fileId}). ${msg}`,
    };
  }
}
