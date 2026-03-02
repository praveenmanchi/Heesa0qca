import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  Button,
  Heading,
  Text,
  Stack,
  Label,
  Spinner,
} from '@tokens-studio/ui';
import {
  LayoutLeft, LightBulb, Check, ClockRotateRight, NavArrowDown, NavArrowUp, Component,
} from 'iconoir-react';
import Box from './Box';
import AnalysisContent from './uxai/AnalysisContent';
import UXAIRecommendations from './uxai/UXAIRecommendations';
import { AsyncMessageChannel } from '@/AsyncMessageChannel';
import { AsyncMessageTypes } from '@/types/AsyncMessages';
import { settingsStateSelector } from '@/selectors';
import {
  getAiAnalysis,
  getAiStructuredChanges,
  type AiAnalysisResult,
  type UxaiStructuredChanges,
} from '@/app/services/aiService';
import { getDualFileUsageSummary } from '@/app/services/figmaRestService';
import { TabRoot } from '@/app/components/ui';
import { FONT_SIZE, ICON_SIZE } from '@/constants/UIConstants';

const MAX_HISTORY = 10;

export interface HistoryEntry {
  id: string;
  prompt: string;
  result: AiAnalysisResult;
  timestamp: number;
}

// ─── Pure helpers ──────────────────────────────────────────────────────────

/** Score variables by keyword relevance to the prompt, return top-N */
function getRelevantVariables(variables: any[], prompt: string, max = 60): any[] {
  if (variables.length <= max) return variables;
  const words = prompt.toLowerCase().match(/\b[a-z][a-z0-9_.-]*\b/g) ?? [];
  const keywords = words.filter((w) => w.length > 2);
  if (keywords.length === 0) return variables.slice(0, max);
  const scored = variables.map((v) => ({
    v,
    score: keywords.filter((kw) => (v.name ?? '').toLowerCase().includes(kw)).length,
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, max).map((s) => s.v);
}

function getModeName(modeId: string, collections: any[]): string {
  for (const coll of collections) {
    const mode = (coll.modes ?? []).find((m: any) => m.modeId === modeId);
    if (mode) return mode.name ?? modeId;
  }
  return modeId;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.trim().replace(/^#/, '');
  if (clean.length === 6) {
    return {
      r: parseInt(clean.slice(0, 2), 16) / 255,
      g: parseInt(clean.slice(2, 4), 16) / 255,
      b: parseInt(clean.slice(4, 6), 16) / 255,
    };
  }
  return null;
}

function formatDisplayValue(value: any, type: string): string {
  if (value === undefined || value === null) return '—';
  if (type === 'COLOR' && typeof value === 'object' && value !== null && 'r' in value) {
    const toHex = (n: number) => Math.round((n ?? 0) * 255).toString(16).padStart(2, '0');
    return `#${toHex(value.r)}${toHex(value.g)}${toHex(value.b)}`;
  }
  return String(value);
}

// ─── Mini color swatch ─────────────────────────────────────────────────────
function MiniSwatch({ value, type }: { value: any; type: string }) {
  if (type !== 'COLOR') return null;
  let rgb: { r: number; g: number; b: number } | null = null;
  if (typeof value === 'object' && value && 'r' in value) {
    rgb = { r: value.r ?? 0, g: value.g ?? 0, b: value.b ?? 0 };
  } else if (typeof value === 'string') {
    rgb = hexToRgb(value);
  }
  if (!rgb) return null;
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
  const hex = `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  return (
    <Box
      css={{
        width: 10,
        height: 10,
        borderRadius: '2px',
        background: hex,
        border: '1px solid rgba(0,0,0,0.2)',
        flexShrink: 0,
        display: 'inline-block',
      }}
    />
  );
}

// ─── Diff row: variable update ─────────────────────────────────────────────
function DiffUpdateRow({ update, collections, varsCache }: {
  update: any; collections: any[]; varsCache: any[];
}) {
  const varData = varsCache.find((v: any) => v.id === update.variableId || v.name === update.variableName);
  const oldValue = varData?.valuesByMode?.[update.modeId];
  const modeName = getModeName(update.modeId, collections);
  const displayName = varData?.name ?? update.variableName ?? update.variableId;

  return (
    <Box css={{
      display: 'flex',
      alignItems: 'center',
      gap: '$2',
      padding: '$1 $2',
      background: '$bgCanvas',
      borderRadius: '$small',
      fontSize: FONT_SIZE.xs,
      minWidth: 0,
      overflow: 'hidden',
    }}
    >
      <Box css={{
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        color: '$fgDefault',
        fontFamily: 'monospace',
        fontSize: FONT_SIZE.xs,
      }}
      >
        {displayName}
      </Box>
      <Box css={{
        color: '$fgSubtle',
        fontSize: FONT_SIZE.xxs,
        flexShrink: 0,
        padding: '0 3px',
        background: '$bgSubtle',
        borderRadius: '3px',
        border: '1px solid $borderMuted',
      }}
      >
        {modeName}
      </Box>
      {/* Old value */}
      <Box css={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
        <MiniSwatch value={oldValue} type={update.type} />
        <Box css={{
          color: '$fgMuted',
          textDecoration: 'line-through',
          fontFamily: 'monospace',
          fontSize: FONT_SIZE.xxs,
        }}
        >
          {formatDisplayValue(oldValue, update.type)}
        </Box>
      </Box>
      <Box css={{ color: '$fgMuted', flexShrink: 0, fontSize: FONT_SIZE.xs }}>→</Box>
      {/* New value */}
      <Box css={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
        <MiniSwatch value={update.value} type={update.type} />
        <Box css={{
          color: '$accentDefault',
          fontFamily: 'monospace',
          fontWeight: 600,
          fontSize: FONT_SIZE.xxs,
        }}
        >
          {String(update.value)}
        </Box>
      </Box>
    </Box>
  );
}

// ─── Diff row: variable create ─────────────────────────────────────────────
function DiffCreateRow({ create, collections }: {
  create: any; collections: any[];
}) {
  const modeName = getModeName(create.modeId, collections);
  const collName = collections.find((c: any) => c.id === create.collectionId)?.name ?? '—';

  return (
    <Box css={{
      display: 'flex',
      alignItems: 'center',
      gap: '$2',
      padding: '$1 $2',
      background: '$bgCanvas',
      borderRadius: '$small',
      fontSize: FONT_SIZE.xs,
      minWidth: 0,
      overflow: 'hidden',
    }}
    >
      <Box css={{ color: '$successFg', fontWeight: 700, flexShrink: 0, fontSize: FONT_SIZE.sm }}>+</Box>
      <Box css={{
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        color: '$fgDefault',
        fontFamily: 'monospace',
        fontSize: FONT_SIZE.xs,
      }}
      >
        {create.variableName}
      </Box>
      <Box css={{
        color: '$fgSubtle',
        fontSize: FONT_SIZE.xxs,
        flexShrink: 0,
        padding: '0 3px',
        background: '$bgSubtle',
        borderRadius: '3px',
        border: '1px solid $borderMuted',
      }}
      >
        {collName}
      </Box>
      <Box css={{
        color: '$fgSubtle',
        fontSize: FONT_SIZE.xxs,
        flexShrink: 0,
        padding: '0 3px',
        background: '$bgSubtle',
        borderRadius: '3px',
        border: '1px solid $borderMuted',
      }}
      >
        {modeName}
      </Box>
      <Box css={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
        <MiniSwatch value={create.value} type={create.type} />
        <Box css={{
          color: '$successFg',
          fontFamily: 'monospace',
          fontWeight: 600,
          fontSize: FONT_SIZE.xxs,
        }}
        >
          {String(create.value)}
        </Box>
      </Box>
    </Box>
  );
}

// ─── Section card ──────────────────────────────────────────────────────────
const SECTION_HEADER = {
  display: 'flex',
  alignItems: 'center',
  gap: '$2',
  marginBottom: '$3',
  paddingBottom: '$2',
  borderBottom: '1px solid $borderMuted',
} as const;

const SECTION_CARD = {
  padding: '$4',
  borderRadius: '$medium',
  border: '1px solid $borderMuted',
  backgroundColor: '$bgSubtle',
  transition: 'border-color 0.15s ease',
} as const;

function SectionCard({
  icon, title, accentColor, children,
}: {
  icon: React.ReactNode; title: string; accentColor?: string; children: React.ReactNode;
}) {
  return (
    <Box css={{ ...SECTION_CARD, '&:hover': { borderColor: '$borderMuted' } }}>
      <Box css={{ ...SECTION_HEADER }}>
        <Box css={{ color: accentColor ?? '$accentDefault', fontSize: ICON_SIZE.lg }}>{icon}</Box>
        <Heading size="small" css={{ margin: 0, color: '$fgDefault', fontWeight: 600 }}>{title}</Heading>
      </Box>
      {children}
    </Box>
  );
}

function formatHistoryTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

// ─── Autocomplete option type ──────────────────────────────────────────────
interface SlashOption {
  key: string;
  label: string;
  category: 'component' | 'color' | 'number' | 'string' | 'boolean';
  colorValue?: any;
}

// ─── Main component ────────────────────────────────────────────────────────
export default function UXAITab() {
  const settings = useSelector(settingsStateSelector);
  const aiEnabled = settings?.aiAssistanceEnabled ?? false;

  // Core state
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiAnalysisResult | null>(null);
  const [confirming, setConfirming] = useState(false);

  // History
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Diff preview state
  const [pendingChanges, setPendingChanges] = useState<UxaiStructuredChanges | null>(null);
  const [varsCache, setVarsCache] = useState<any[]>([]);
  const [collectionsCache, setCollectionsCache] = useState<any[]>([]);
  const [componentsList, setComponentsList] = useState<{ id: string; name: string }[]>([]);
  const [componentsLoading, setComponentsLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);

  // ── Slash-command autocomplete state ──
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [slashCursorPos, setSlashCursorPos] = useState(0);
  const [slashHighlight, setSlashHighlight] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Track inserted tokens for rich text rendering
  const [insertedTokens, setInsertedTokens] = useState<{ label: string; category: string }[]>([]);

  // Load persisted history on mount
  useEffect(() => {
    AsyncMessageChannel.ReactInstance.message({ type: AsyncMessageTypes.GET_UXAI_HISTORY })
      .then((res: any) => {
        const stored = res?.history ?? [];
        if (Array.isArray(stored) && stored.length > 0) {
          setHistory(stored as HistoryEntry[]);
        }
      })
      .catch(() => { })
      .finally(() => setHistoryLoaded(true));

    // Defer component + variable fetch so the textarea is interactive immediately
    setComponentsLoading(true);
    const timer = setTimeout(() => {
      // Fetch components
      AsyncMessageChannel.ReactInstance.message({ type: AsyncMessageTypes.GET_COMPONENTS })
        .then((res: any) => {
          if (Array.isArray(res?.components)) {
            setComponentsList(res.components);
          }
        })
        .catch(() => { })
        .finally(() => setComponentsLoading(false));

      // Pre-fetch variables for overlay auto-detection
      AsyncMessageChannel.ReactInstance.message({
        type: AsyncMessageTypes.EXTRACT_VARIABLES_TO_CANVAS,
      })
        .then((extractRes: any) => {
          const vars = JSON.parse(extractRes?.jsonString ?? '[]');
          const cols = (extractRes as any)?.collectionsInfo ?? [];
          if (vars.length) setVarsCache(vars);
          if (cols.length) setCollectionsCache(cols);
        })
        .catch(() => { });
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Persist history whenever it changes
  useEffect(() => {
    if (!historyLoaded) return;
    AsyncMessageChannel.ReactInstance.message({
      type: AsyncMessageTypes.SET_UXAI_HISTORY,
      history: history.map((h) => ({
        id: h.id, prompt: h.prompt, result: h.result, timestamp: h.timestamp,
      })),
    }).catch(() => { });
  }, [history, historyLoaded]);

  const provider = settings?.aiProvider ?? 'claude';
  const apiKey = provider === 'claude'
    ? (settings?.aiClaudeApiKey ?? '')
    : (settings?.aiGeminiApiKey ?? '');

  // ── Step 1: Analyze ────────────────────────────────────────────────────
  const handleAnalyze = useCallback(async () => {
    if (!prompt.trim()) { setError('Please enter a prompt.'); return; }
    if (!apiKey) {
      setError(`Please add your ${provider === 'claude' ? 'Claude' : 'Gemini'} API key in Settings.`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setPendingChanges(null);

    try {
      // Step 1/4 — Extract variables
      setProgressMsg('Extracting variables… (1/4)');
      await new Promise((r) => setTimeout(r, 0));
      const extractRes = await AsyncMessageChannel.ReactInstance.message({
        type: AsyncMessageTypes.EXTRACT_VARIABLES_TO_CANVAS,
      });
      const jsonString = extractRes?.jsonString ?? '[]';
      const collectionsInfo = (extractRes as any)?.collectionsInfo ?? [];
      const variables = JSON.parse(jsonString);

      // Cache for diff preview
      setVarsCache(variables);
      setCollectionsCache(collectionsInfo);

      // Smart sampling — keyword-ranked variables (up to 60, vs old hard 25)
      const relevantVars = getRelevantVariables(variables, prompt.trim(), 60);
      const variablesSummary = variables.length > 0
        ? `Total: ${variables.length} variables. Relevant sample (${relevantVars.length} keyword-matched):\n${JSON.stringify(relevantVars, null, 2)}`
        : 'No variables found.';

      const collectionsSummary = collectionsInfo.length > 0
        ? collectionsInfo.map((c: any) => `- ${c.name}: modes [${(c.modes ?? []).map((m: any) => m.name).join(', ')}]`).join('\n')
        : 'No collections found.';

      // Step 2/4 — Scan usage
      setProgressMsg('Scanning variable usage… (2/4)');
      let usageSummary = '';
      let dualFileError: string | undefined;
      try {
        const searchRes = await AsyncMessageChannel.ReactInstance.message({
          type: AsyncMessageTypes.SEARCH_VARIABLE_USAGE,
          query: '',
          allPages: false,
        });
        const vars = (searchRes as any)?.variables ?? [];
        if (vars.length > 0) {
          // Increased from 15 → 50 for richer context
          usageSummary = vars.slice(0, 50).map((v: any) => {
            const names = (v.components ?? []).map((c: any) => c.componentName).filter(Boolean);
            const compStr = names.length > 0 ? ` → [${names.join(', ')}]` : '';
            return `- ${v.variableName} (${v.collectionName}): ${v.totalCount} uses${compStr}`;
          }).join('\n');
        }
      } catch {
        // Non-fatal — usage data is supplementary context
      }

      // Step 3/4 — Cross-file (optional)
      if (settings?.uxaiDualFileEnabled) {
        setProgressMsg('Cross-file analysis… (3/4)');
        const dualRes = await getDualFileUsageSummary({
          enabled: true,
          variablesFileId: settings.uxaiVariablesFileId,
          variablesFileApiKey: settings.uxaiVariablesFileApiKey,
          componentsFileId: settings.uxaiComponentsFileId,
          componentsFileApiKey: settings.uxaiComponentsFileApiKey,
        });
        if (dualRes.summary) {
          usageSummary = `${usageSummary}\n\n### Cross-file Variable Usage\n${dualRes.summary}`.trim();
        }
        if (dualRes.error) dualFileError = dualRes.error;
      }

      // Step 4/4 — AI analysis
      setProgressMsg('AI analyzing your request… (4/4)');
      const analysis = await getAiAnalysis(provider, apiKey, prompt.trim(), {
        variablesSummary,
        collectionsSummary,
        usageSummary: usageSummary || undefined,
      });

      const entry: HistoryEntry = {
        id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        prompt: prompt.trim(),
        result: analysis,
        timestamp: Date.now(),
      };
      setResult(analysis);
      setActiveHistoryId(entry.id);
      setHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY));
      if (dualFileError) setError(dualFileError);
    } catch (err: any) {
      const msg = String(err?.message ?? 'Analysis failed.');
      setError(
        /failed to fetch|networkerror|cors/i.test(msg)
          ? 'Network error — verify your API key is valid and that Figma can reach the AI API.'
          : msg,
      );
    } finally {
      setIsLoading(false);
      setProgressMsg(null);
    }
  }, [prompt, provider, apiKey, settings]);

  // ── Step 2: Preview changes ────────────────────────────────────────────
  const handlePreviewChanges = useCallback(async () => {
    if (!result || !apiKey) return;
    setPreviewLoading(true);
    setProgressMsg('Generating change preview…');
    setError(null);
    try {
      // Re-extract if cache is stale
      let vars = varsCache;
      let cols = collectionsCache;
      if (!vars.length) {
        const extractRes = await AsyncMessageChannel.ReactInstance.message({
          type: AsyncMessageTypes.EXTRACT_VARIABLES_TO_CANVAS,
        });
        vars = JSON.parse(extractRes?.jsonString ?? '[]');
        cols = (extractRes as any)?.collectionsInfo ?? [];
        setVarsCache(vars);
        setCollectionsCache(cols);
      }

      const changes = await getAiStructuredChanges(
        provider, apiKey, prompt.trim(), result, vars, cols,
      );
      const total = (changes.updates?.length ?? 0) + (changes.creates?.length ?? 0);

      if (total === 0) {
        setError('No variable changes were proposed. Try rephrasing with more specific variable names or values.');
        return;
      }
      setPendingChanges(changes);
    } catch (err: any) {
      setError(err?.message ?? 'Could not generate a change preview. Try again.');
    } finally {
      setPreviewLoading(false);
      setProgressMsg(null);
    }
  }, [result, prompt, provider, apiKey, varsCache, collectionsCache]);

  // ── Step 3: Apply changes ──────────────────────────────────────────────
  const handleApplyChanges = useCallback(async () => {
    if (!pendingChanges) return;
    setConfirming(true);
    setProgressMsg('Applying changes to Figma…');
    setError(null);

    const updatesCount = pendingChanges.updates?.length ?? 0;
    const createsCount = pendingChanges.creates?.length ?? 0;
    console.log('[UXAI] Applying changes:', {
      updates: updatesCount,
      creates: createsCount,
      data: pendingChanges,
    });

    try {
      const applyRes = await AsyncMessageChannel.ReactInstance.message({
        type: AsyncMessageTypes.APPLY_UXAI_CHANGES,
        updates: pendingChanges.updates ?? [],
        creates: pendingChanges.creates ?? [],
      }) as { applied?: number; remapped?: number; errors?: string[] };

      console.log('[UXAI] Apply result:', applyRes);

      const applied = applyRes?.applied ?? 0;
      const remappedCount = applyRes?.remapped ?? 0;
      const errs = applyRes?.errors ?? [];

      if (errs.length > 0) {
        console.warn('[UXAI] Apply errors:', errs);
      }

      if (applied > 0) {
        const successParts = [`✅ Successfully applied ${applied} change${applied > 1 ? 's' : ''}`];
        if (remappedCount > 0) successParts.push(`and remapped ${remappedCount} binding${remappedCount > 1 ? 's' : ''}`);
        successParts.push('to Figma variables.');
        if (errs.length > 0) successParts.push(`\n⚠️ Warnings: ${errs.join(' · ')}`);

        // Show success message — keep result visible but clear pending
        setPendingChanges(null);
        setError(successParts.join(' '));
      } else if (errs.length > 0) {
        setError(`❌ Apply errors: ${errs.join(' · ')}`);
      } else {
        setError('⚠️ No changes were applied. The variable IDs from the AI may not match existing variables in this file. Try running the analysis again.');
      }
    } catch (err: any) {
      console.error('[UXAI] Apply failed:', err);
      setError(err?.message ?? 'Apply failed.');
    } finally {
      setConfirming(false);
      setProgressMsg(null);
    }
  }, [pendingChanges]);

  // ── History handlers ────────────────────────────────────────────────────
  const handleRemoveEntry = useCallback((entry: HistoryEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = history.filter((h) => h.id !== entry.id);
    if (filtered.length === 0) {
      setResult(null); setPrompt(''); setHistory([]); setActiveHistoryId(null);
      return;
    }
    setHistory(filtered);
    if (activeHistoryId === entry.id) {
      setResult(filtered[0].result);
      setPrompt(filtered[0].prompt);
      setActiveHistoryId(filtered[0].id);
    }
  }, [history, activeHistoryId]);

  const handleRestoreFromHistory = useCallback((entry: HistoryEntry) => {
    setResult(entry.result);
    setPrompt(entry.prompt);
    setError(null);
    setPendingChanges(null);
    setActiveHistoryId(entry.id);
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────
  const componentImpactContent = result?.componentImpact || result?.rawResponse || 'No analysis received.';
  const suggestionsContent = result?.suggestions || (!result?.componentImpact ? result?.rawResponse : null) || 'No suggestions received.';
  const totalPending = (pendingChanges?.updates?.length ?? 0) + (pendingChanges?.creates?.length ?? 0);
  const isBusy = isLoading || previewLoading || confirming;

  // ── Slash command helpers ────────────────────────────────────────────────
  const buildSlashOptions = useCallback((): SlashOption[] => {
    const opts: SlashOption[] = [];
    componentsList.forEach((c) => {
      opts.push({ key: `comp-${c.id}`, label: c.name, category: 'component' });
    });
    varsCache.forEach((v: any) => {
      const cat = v.type === 'COLOR' ? 'color' : v.type === 'FLOAT' ? 'number' : 'string';
      opts.push({
        key: `var-${v.id}`,
        label: v.name,
        category: cat as SlashOption['category'],
        colorValue: v.type === 'COLOR' && v.valuesByMode ? Object.values(v.valuesByMode)[0] : undefined,
      });
    });
    return opts;
  }, [componentsList, varsCache]);

  const filteredSlashOptions = useMemo(() => {
    const all = buildSlashOptions();
    if (!slashFilter) return all;
    const lc = slashFilter.toLowerCase();
    return all.filter((o) => o.label.toLowerCase().includes(lc));
  }, [buildSlashOptions, slashFilter]);

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setPrompt(val);

    // Detect slash trigger — find the last "/" before cursor
    const curPos = e.target.selectionStart ?? val.length;
    const textBefore = val.slice(0, curPos);
    const slashIdx = textBefore.lastIndexOf('/');
    if (slashIdx >= 0) {
      const filterText = textBefore.slice(slashIdx + 1);
      // Show menu if filter text has no spaces (user is still typing the token name)
      if (!/\s/.test(filterText)) {
        setShowSlashMenu(true);
        setSlashFilter(filterText);
        setSlashCursorPos(slashIdx);
        setSlashHighlight(0);
        return;
      }
    }
    setShowSlashMenu(false);
    setSlashFilter('');
  }, []);

  const handleSlashSelect = useCallback((opt: SlashOption) => {
    const before = prompt.slice(0, slashCursorPos);
    const afterSlash = prompt.slice(slashCursorPos);
    const rest = afterSlash.replace(/^\/[^\s]*/, '');
    const newVal = `${before}${opt.label} ${rest.startsWith(' ') ? rest.slice(1) : rest}`;
    setPrompt(newVal);
    setShowSlashMenu(false);
    setSlashFilter('');
    // Track this token for rich rendering
    setInsertedTokens((prev) => {
      if (prev.some((t) => t.label === opt.label)) return prev;
      return [...prev, { label: opt.label, category: opt.category }];
    });
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [prompt, slashCursorPos]);

  const handleTextareaKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSlashMenu || filteredSlashOptions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSlashHighlight((h) => Math.min(h + 1, filteredSlashOptions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSlashHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      handleSlashSelect(filteredSlashOptions[slashHighlight]);
    } else if (e.key === 'Escape') {
      setShowSlashMenu(false);
    }
  }, [showSlashMenu, filteredSlashOptions, slashHighlight, handleSlashSelect]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
        && textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        setShowSlashMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Build overlay HTML with highlighted tokens
  const buildOverlayContent = useMemo(() => {
    if (!prompt) return null;

    // Collect all known tokens: inserted ones + known components + known variables
    const allTokens: { label: string; category: string }[] = [...insertedTokens];

    // Auto-detect component names in the prompt
    componentsList.forEach((c) => {
      if (!allTokens.some((t) => t.label === c.name) && prompt.includes(c.name)) {
        allTokens.push({ label: c.name, category: 'component' });
      }
    });

    // Auto-detect variable names in the prompt
    varsCache.forEach((v: any) => {
      const cat = v.type === 'COLOR' ? 'color' : v.type === 'FLOAT' ? 'number' : 'string';
      if (!allTokens.some((t) => t.label === v.name) && prompt.includes(v.name)) {
        allTokens.push({ label: v.name, category: cat });
      }
    });

    // If no known tokens match the prompt, don't overlay
    if (allTokens.length === 0) return null;

    // Sort by label length descending so longer matches take priority
    const sorted = [...allTokens].sort((a, b) => b.label.length - a.label.length);

    // Build segments
    type Seg = { text: string; token?: { label: string; category: string } };
    const segments: Seg[] = [];
    let remaining = prompt;

    while (remaining.length > 0) {
      let found = false;
      for (const tok of sorted) {
        const idx = remaining.indexOf(tok.label);
        if (idx === 0) {
          segments.push({ text: tok.label, token: tok });
          remaining = remaining.slice(tok.label.length);
          found = true;
          break;
        } else if (idx > 0) {
          segments.push({ text: remaining.slice(0, idx) });
          segments.push({ text: tok.label, token: tok });
          remaining = remaining.slice(idx + tok.label.length);
          found = true;
          break;
        }
      }
      if (!found) {
        segments.push({ text: remaining });
        remaining = '';
      }
    }

    // Only return segments if at least one token was matched
    if (!segments.some((s) => s.token)) return null;
    return segments;
  }, [prompt, insertedTokens, componentsList, varsCache]);

  // Sync overlay scroll with textarea scroll
  const handleTextareaScroll = useCallback(() => {
    if (overlayRef.current && textareaRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  // ── Not enabled gate ───────────────────────────────────────────────────
  if (!aiEnabled) {
    return (
      <Box css={{
        display: 'flex', flexDirection: 'column', height: '100%',
        alignItems: 'center', justifyContent: 'center', padding: '$6',
      }}
      >
        <Heading size="medium" css={{ marginBottom: '$2' }}>UXAI</Heading>
        <Text css={{ color: '$fgMuted', textAlign: 'center', marginBottom: '$4' }}>
          Enable AI assistance in Settings to use this tab.
        </Text>
      </Box>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <TabRoot css={{ overflow: 'hidden' }}>
      {/* Header */}
      <Box css={{
        padding: '$3 $4',
        borderBottom: '1px solid $borderMuted',
        flexShrink: 0,
        backgroundColor: '$bgDefault',
      }}
      >
        <Heading size="small" css={{ marginBottom: '$1', color: '$fgDefault', fontWeight: 600 }}>
          UXAI — AI-Powered Variable Changes
        </Heading>
        <Text css={{ color: '$fgMuted', fontSize: FONT_SIZE.sm, lineHeight: 1.5 }}>
          Describe the change you need. AI analyzes impact, suggests variables, and previews changes before applying.
        </Text>
      </Box>

      {/* Scrollable body */}
      <Box className="content scroll-container" css={{ flex: 1, padding: '$4', overflowY: 'auto' }}>
        <Stack direction="column" gap={4}>

          {/* ── Input card ── */}
          <Box css={{
            padding: '$4',
            borderRadius: '$medium',
            border: '1px solid $borderMuted',
            backgroundColor: '$bgDefault',
          }}
          >
            <Box css={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '$2' }}>
              <Label css={{ color: '$fgDefault', fontWeight: 500, display: 'block', margin: 0 }}>
                Your request
              </Label>
              {componentsLoading && (
                <Box css={{ display: 'flex', alignItems: 'center', gap: '$1' }}>
                  <Spinner />
                  <Text css={{ fontSize: '10px', color: '$fgMuted' }}>Loading components…</Text>
                </Box>
              )}
            </Box>
            <Box css={{ position: 'relative' }}>
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={handleTextareaChange}
                onKeyDown={handleTextareaKeyDown}
                onScroll={handleTextareaScroll}
                placeholder={buildOverlayContent ? '' : "e.g., Change the border color of the Primary Button to #0048B7 in Gap 2.0 only. Type '/' to insert variables and components."}
                style={{
                  width: '100%',
                  minHeight: '72px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: '1px solid var(--colors-borderMuted, #3c3c3c)',
                  background: 'var(--colors-bgSubtle, #1e1e21)',
                  color: buildOverlayContent ? 'transparent' : 'var(--colors-fgDefault, #fff)',
                  caretColor: 'var(--colors-fgDefault, #fff)',
                  padding: '8px',
                  fontFamily: 'inherit',
                  lineHeight: '1.5',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--colors-accentDefault, #0048B7)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--colors-borderMuted, #3c3c3c)'; }}
              />
              {/* Styled overlay for token highlighting - rendered ON TOP with pointer-events:none */}
              {buildOverlayContent && (
                <div
                  ref={overlayRef}
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    padding: '8px',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    overflow: 'hidden',
                    pointerEvents: 'none',
                    boxSizing: 'border-box',
                    border: '1px solid transparent',
                    zIndex: 2,
                  }}
                >
                  {buildOverlayContent.map((seg, i) => {
                    if (!seg.token) {
                      return (
                        <span key={i} style={{ color: 'var(--colors-fgDefault, #fff)' }}>
                          {seg.text}
                        </span>
                      );
                    }
                    const isComp = seg.token.category === 'component';
                    const bgColor = isComp
                      ? 'rgba(139, 92, 246, 0.2)'
                      : seg.token.category === 'color'
                        ? 'rgba(59, 130, 246, 0.2)'
                        : seg.token.category === 'number'
                          ? 'rgba(245, 158, 11, 0.2)'
                          : 'rgba(16, 185, 129, 0.2)';
                    const fgColor = isComp
                      ? '#c4b5fd'
                      : seg.token.category === 'color'
                        ? '#93c5fd'
                        : seg.token.category === 'number'
                          ? '#fcd34d'
                          : '#6ee7b7';
                    return (
                      <span
                        key={i}
                        style={{
                          background: bgColor,
                          color: fgColor,
                          padding: '1px 4px',
                          borderRadius: '3px',
                          fontWeight: 600,
                          border: `1px solid ${fgColor}44`,
                        }}
                      >
                        {isComp ? (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={fgColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '3px', flexShrink: 0 }}>
                            <path d="M12 2L17 7L12 12L7 7Z" />
                            <path d="M12 12L17 17L12 22L7 17Z" />
                          </svg>
                        ) : (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill={fgColor} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '3px', flexShrink: 0 }}>
                            <circle cx="12" cy="12" r="5" />
                          </svg>
                        )}
                        {seg.text}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Slash-command dropdown */}
              {showSlashMenu && filteredSlashOptions.length > 0 && (
                <div
                  ref={dropdownRef}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: '100%',
                    marginTop: '4px',
                    maxHeight: '240px',
                    overflowY: 'auto',
                    background: 'var(--colors-bgCanvas, #1a1a1d)',
                    border: '1px solid var(--colors-borderSubtle, #3c3c3c)',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.3)',
                    zIndex: 10000,
                    padding: '6px',
                  }}
                >
                  {/* Components section */}
                  {filteredSlashOptions.some((o) => o.category === 'component') && (
                    <>
                      <div style={{
                        padding: '6px 10px 4px',
                        fontSize: '10px',
                        fontWeight: 700,
                        color: '#8b8b8b',
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.08em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        <Component width={10} height={10} strokeWidth={2} />
                        Components
                      </div>
                      {filteredSlashOptions.filter((o) => o.category === 'component').map((opt) => {
                        const globalIdx = filteredSlashOptions.indexOf(opt);
                        const isActive = slashHighlight === globalIdx;
                        return (
                          <div
                            key={opt.key}
                            onMouseDown={(e) => { e.preventDefault(); handleSlashSelect(opt); }}
                            onMouseEnter={() => setSlashHighlight(globalIdx)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '6px 10px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              borderRadius: '5px',
                              color: isActive ? '#fff' : 'var(--colors-fgDefault, #e0e0e0)',
                              background: isActive ? 'var(--colors-accentDefault, #0048B7)' : 'transparent',
                              transition: 'background 0.1s ease',
                            }}
                          >
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 20,
                              height: 20,
                              borderRadius: '4px',
                              background: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(139,92,246,0.15)',
                              color: isActive ? '#fff' : '#a78bfa',
                              flexShrink: 0,
                            }}>
                              <Component width={12} height={12} strokeWidth={1.5} />
                            </span>
                            <span style={{ fontWeight: 500 }}>{opt.label}</span>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* Variables section */}
                  {filteredSlashOptions.some((o) => o.category !== 'component') && (
                    <>
                      {filteredSlashOptions.some((o) => o.category === 'component') && (
                        <div style={{ height: 1, background: 'var(--colors-borderSubtle, #333)', margin: '4px 10px' }} />
                      )}
                      <div style={{
                        padding: '6px 10px 4px',
                        fontSize: '10px',
                        fontWeight: 700,
                        color: '#8b8b8b',
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.08em',
                      }}>
                        Variables
                      </div>
                      {filteredSlashOptions.filter((o) => o.category !== 'component').map((opt) => {
                        const globalIdx = filteredSlashOptions.indexOf(opt);
                        const isActive = slashHighlight === globalIdx;
                        const iconBg = opt.category === 'color'
                          ? (isActive ? 'rgba(255,255,255,0.15)' : 'rgba(59,130,246,0.15)')
                          : opt.category === 'number'
                            ? (isActive ? 'rgba(255,255,255,0.15)' : 'rgba(245,158,11,0.15)')
                            : (isActive ? 'rgba(255,255,255,0.15)' : 'rgba(16,185,129,0.15)');
                        const iconColor = opt.category === 'color'
                          ? (isActive ? '#fff' : '#60a5fa')
                          : opt.category === 'number'
                            ? (isActive ? '#fff' : '#fbbf24')
                            : (isActive ? '#fff' : '#34d399');
                        return (
                          <div
                            key={opt.key}
                            onMouseDown={(e) => { e.preventDefault(); handleSlashSelect(opt); }}
                            onMouseEnter={() => setSlashHighlight(globalIdx)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '6px 10px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              borderRadius: '5px',
                              color: isActive ? '#fff' : 'var(--colors-fgDefault, #e0e0e0)',
                              background: isActive ? 'var(--colors-accentDefault, #0048B7)' : 'transparent',
                              transition: 'background 0.1s ease',
                            }}
                          >
                            {opt.category === 'color' ? (
                              opt.colorValue ? (
                                <MiniSwatch value={opt.colorValue} type="COLOR" />
                              ) : (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: 20,
                                  height: 20,
                                  borderRadius: '4px',
                                  background: iconBg,
                                  color: iconColor,
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  flexShrink: 0,
                                }}>🎨</span>
                              )
                            ) : (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 20,
                                height: 20,
                                borderRadius: '4px',
                                background: iconBg,
                                color: iconColor,
                                fontSize: '11px',
                                fontWeight: 700,
                                flexShrink: 0,
                              }}>{opt.category === 'number' ? '#' : 'T'}</span>
                            )}
                            <span style={{ fontWeight: 500 }}>{opt.label}</span>
                            <span style={{
                              marginLeft: 'auto',
                              fontSize: '9px',
                              fontWeight: 600,
                              padding: '1px 5px',
                              borderRadius: '3px',
                              background: isActive ? 'rgba(255,255,255,0.15)' : iconBg,
                              color: isActive ? 'rgba(255,255,255,0.7)' : iconColor,
                              textTransform: 'uppercase' as const,
                              letterSpacing: '0.04em',
                            }}>
                              {opt.category}
                            </span>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </Box>
            <Button
              variant="primary"
              onClick={handleAnalyze}
              disabled={isBusy}
              css={{ fontWeight: 600, marginTop: '$3', width: '100%' }}
            >
              {isLoading ? 'Analyzing…' : 'Analyze'}
            </Button>
          </Box>

          {/* ── Progress indicator ── */}
          {isBusy && progressMsg && (
            <Box css={{
              display: 'flex',
              alignItems: 'center',
              gap: '$2',
              padding: '$2 $3',
              background: '$bgSubtle',
              borderRadius: '$small',
              border: '1px solid $borderMuted',
            }}
            >
              <Spinner />
              <Text css={{ fontSize: FONT_SIZE.xs, color: '$fgMuted' }}>{progressMsg}</Text>
            </Box>
          )}

          {/* ── Error ── */}
          {error && (
            <Box css={{
              padding: '$3 $4',
              backgroundColor: '$dangerBg',
              color: '$dangerFg',
              borderRadius: '$small',
              border: '1px solid rgba(220,38,38,0.3)',
              fontSize: FONT_SIZE.sm,
              lineHeight: 1.5,
            }}
            >
              {error}
            </Box>
          )}

          {/* ── Analysis results ── */}
          {result && (
            <Stack direction="column" gap={4}>
              <SectionCard
                icon={<LayoutLeft width={ICON_SIZE.lg} height={ICON_SIZE.lg} strokeWidth={1.5} />}
                title="Component Impact Analysis"
                accentColor="$accentDefault"
              >
                <AnalysisContent content={componentImpactContent} />
              </SectionCard>

              <SectionCard
                icon={<LightBulb width={ICON_SIZE.lg} height={ICON_SIZE.lg} strokeWidth={1.5} />}
                title="Suggestions"
                accentColor="#E6A800"
              >
                <AnalysisContent content={suggestionsContent} />
              </SectionCard>

              {result.proposedChanges && (
                <SectionCard
                  icon={<Check width={ICON_SIZE.lg} height={ICON_SIZE.lg} strokeWidth={1.5} />}
                  title="Proposed Changes"
                  accentColor="$successFg"
                >
                  <AnalysisContent content={result.proposedChanges} />
                </SectionCard>
              )}

              {/* ── Diff preview or Preview button ── */}
              {pendingChanges ? (
                /* Diff preview panel */
                <Box css={{
                  border: '1px solid $borderMuted',
                  borderRadius: '$medium',
                  overflow: 'hidden',
                  backgroundColor: '$bgSubtle',
                }}
                >
                  {/* Panel header */}
                  <Box css={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '$3 $4',
                    borderBottom: '1px solid $borderMuted',
                    background: '$bgDefault',
                  }}
                  >
                    <Box css={{ display: 'flex', alignItems: 'center', gap: '$2' }}>
                      <Box css={{ color: '$successFg' }}>
                        <Check width={ICON_SIZE.md} height={ICON_SIZE.md} strokeWidth={2} />
                      </Box>
                      <Heading size="small" css={{ margin: 0, fontWeight: 600 }}>
                        {`${totalPending} change${totalPending !== 1 ? 's' : ''} ready to apply`}
                      </Heading>
                    </Box>
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => setPendingChanges(null)}
                      css={{ fontSize: FONT_SIZE.xs, padding: '$1 $2' }}
                    >
                      Discard
                    </Button>
                  </Box>

                  {/* Updates section */}
                  {(pendingChanges.updates?.length ?? 0) > 0 && (
                    <Box css={{ padding: '$3 $4' }}>
                      <Text css={{
                        fontSize: FONT_SIZE.xxs,
                        fontWeight: 600,
                        color: '$fgSubtle',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        marginBottom: '$2',
                        display: 'block',
                      }}
                      >
                        {`Update existing (${pendingChanges.updates!.length})`}
                      </Text>
                      <Stack direction="column" gap={1}>
                        {pendingChanges.updates!.map((upd, i) => (
                          <DiffUpdateRow
                            key={`upd-${i}`}
                            update={upd}
                            collections={collectionsCache}
                            varsCache={varsCache}
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {/* Creates section */}
                  {(pendingChanges.creates?.length ?? 0) > 0 && (
                    <Box css={{
                      padding: '$3 $4',
                      borderTop: (pendingChanges.updates?.length ?? 0) > 0 ? '1px solid $borderMuted' : 'none',
                    }}
                    >
                      <Text css={{
                        fontSize: FONT_SIZE.xxs,
                        fontWeight: 600,
                        color: '$fgSubtle',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        marginBottom: '$2',
                        display: 'block',
                      }}
                      >
                        {`New variables (${pendingChanges.creates!.length})`}
                      </Text>
                      <Stack direction="column" gap={1}>
                        {pendingChanges.creates!.map((cre, i) => (
                          <DiffCreateRow
                            key={`cre-${i}`}
                            create={cre}
                            collections={collectionsCache}
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {/* Apply button */}
                  <Box css={{ padding: '$3 $4', borderTop: '1px solid $borderMuted' }}>
                    <Text css={{
                      fontSize: FONT_SIZE.xs,
                      color: '$fgMuted',
                      marginBottom: '$3',
                      lineHeight: 1.5,
                      display: 'block',
                    }}
                    >
                      Review the diff above. Applying will modify your Figma variables directly.
                    </Text>
                    <Button
                      variant="primary"
                      onClick={handleApplyChanges}
                      disabled={confirming}
                      css={{ fontWeight: 600, width: '100%' }}
                    >
                      {confirming
                        ? 'Applying…'
                        : `Apply ${totalPending} change${totalPending !== 1 ? 's' : ''}`}
                    </Button>
                  </Box>
                </Box>
              ) : (
                /* Preview Changes CTA */
                <Box css={{
                  padding: '$3 $4',
                  borderRadius: '$medium',
                  border: '1px solid $borderMuted',
                  backgroundColor: '$bgDefault',
                }}
                >
                  <Text css={{
                    fontSize: FONT_SIZE.sm,
                    color: '$fgMuted',
                    marginBottom: '$3',
                    lineHeight: 1.5,
                    display: 'block',
                  }}
                  >
                    Happy with the analysis? Generate a diff preview to see exactly which variables will change before applying.
                  </Text>
                  <Button
                    variant="primary"
                    onClick={handlePreviewChanges}
                    disabled={isBusy}
                    css={{ fontWeight: 600, width: '100%' }}
                  >
                    {previewLoading ? 'Generating preview…' : 'Preview Changes'}
                  </Button>
                </Box>
              )}
            </Stack>
          )}

          {/* ── History panel ── */}
          {history.length > 0 && (
            <Box css={{
              border: '1px solid $borderMuted',
              borderRadius: '$medium',
              overflow: 'hidden',
              backgroundColor: '$bgSubtle',
            }}
            >
              <Box
                css={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '$3 $4',
                  borderBottom: historyOpen ? '1px solid $borderMuted' : 'none',
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: '$bgDefault' },
                }}
                onClick={() => setHistoryOpen((o) => !o)}
              >
                <Box css={{ display: 'flex', alignItems: 'center', gap: '$2' }}>
                  <ClockRotateRight width={ICON_SIZE.md} height={ICON_SIZE.md} strokeWidth={1.5} />
                  <Heading size="small" css={{ margin: 0, fontWeight: 600, color: '$fgDefault' }}>
                    {`History (${history.length})`}
                  </Heading>
                </Box>
                {historyOpen
                  ? <NavArrowUp width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
                  : <NavArrowDown width={ICON_SIZE.sm} height={ICON_SIZE.sm} />}
              </Box>

              {historyOpen && (
                <Box css={{ padding: '$2', maxHeight: 200, overflowY: 'auto' }}>
                  <Stack direction="column" gap={1}>
                    {history.map((entry) => (
                      <Box
                        key={entry.id}
                        onClick={() => handleRestoreFromHistory(entry)}
                        css={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '$2',
                          padding: '$2 $3',
                          borderRadius: '$small',
                          cursor: 'pointer',
                          backgroundColor: activeHistoryId === entry.id ? '$accentDefault' : 'transparent',
                          color: activeHistoryId === entry.id ? 'white' : '$fgDefault',
                          '&:hover': {
                            backgroundColor: activeHistoryId === entry.id ? '$accentDefault' : '$bgDefault',
                          },
                        }}
                      >
                        <Box css={{ flex: 1, minWidth: 0 }}>
                          <Text css={{
                            fontSize: FONT_SIZE.xs,
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'block',
                          }}
                          >
                            {entry.prompt}
                          </Text>
                          <Text css={{ fontSize: FONT_SIZE.xxs, opacity: 0.7, marginTop: '2px', display: 'block' }}>
                            {formatHistoryTime(entry.timestamp)}
                          </Text>
                        </Box>
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={(e) => handleRemoveEntry(entry, e)}
                          disabled={isBusy}
                          css={{
                            flexShrink: 0,
                            fontSize: FONT_SIZE.xxs,
                            padding: '$1 $2',
                            minHeight: 'auto',
                          }}
                        >
                          Remove
                        </Button>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>
          )}

          {/* ── Best practices ── */}
          <UXAIRecommendations />
        </Stack>
      </Box>
    </TabRoot>
  );
}
