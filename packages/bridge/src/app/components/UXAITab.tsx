import React, { useState, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Button,
  Heading,
  Text,
  Textarea,
  Stack,
  Label,
  Spinner,
} from '@tokens-studio/ui';
import {
  LayoutLeft, LightBulb, Check, ClockRotateRight, NavArrowDown, NavArrowUp,
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
  borderBottom: '1px solid $borderSubtle',
} as const;

const SECTION_CARD = {
  padding: '$4',
  borderRadius: '$medium',
  border: '1px solid $borderSubtle',
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
  const [previewLoading, setPreviewLoading] = useState(false);

  // Load persisted history on mount
  useEffect(() => {
    AsyncMessageChannel.ReactInstance.message({ type: AsyncMessageTypes.GET_UXAI_HISTORY })
      .then((res: any) => {
        const stored = res?.history ?? [];
        if (Array.isArray(stored) && stored.length > 0) {
          setHistory(stored as HistoryEntry[]);
        }
      })
      .catch(() => {})
      .finally(() => setHistoryLoaded(true));
  }, []);

  // Persist history whenever it changes
  useEffect(() => {
    if (!historyLoaded) return;
    AsyncMessageChannel.ReactInstance.message({
      type: AsyncMessageTypes.SET_UXAI_HISTORY,
      history: history.map((h) => ({
        id: h.id, prompt: h.prompt, result: h.result, timestamp: h.timestamp,
      })),
    }).catch(() => {});
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
    try {
      const applyRes = await AsyncMessageChannel.ReactInstance.message({
        type: AsyncMessageTypes.APPLY_UXAI_CHANGES,
        updates: pendingChanges.updates ?? [],
        creates: pendingChanges.creates ?? [],
      }) as { applied?: number; errors?: string[] };

      const applied = applyRes?.applied ?? 0;
      const errs = applyRes?.errors ?? [];

      if (applied > 0) {
        setResult(null);
        setPendingChanges(null);
        setPrompt('');
        setActiveHistoryId(null);
        setError(null);
      } else if (errs.length > 0) {
        setError(`Apply errors: ${errs.join(' · ')}`);
      } else {
        setError('No changes were applied. The variables may not exist in this file or values are unchanged.');
      }
    } catch (err: any) {
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
        padding: '$4 $5',
        borderBottom: '1px solid $borderSubtle',
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
      <Box className="content scroll-container" css={{ flex: 1, padding: '$4 $5', overflowY: 'auto' }}>
        <Stack direction="column" gap={4}>

          {/* ── Input card ── */}
          <Box css={{
            padding: '$4',
            borderRadius: '$medium',
            border: '1px solid $borderSubtle',
            backgroundColor: '$bgDefault',
          }}
          >
            <Label css={{ color: '$fgDefault', fontWeight: 500, marginBottom: '$2', display: 'block' }}>
              Your request
            </Label>
            <Textarea
              value={prompt}
              onChange={(v: string) => setPrompt(v ?? '')}
              placeholder="e.g., Change the border color of the Primary Button to #0048B7 in Gap 2.0 only"
              css={{
                minHeight: '72px',
                fontSize: FONT_SIZE.sm,
                borderRadius: '$small',
                border: '1px solid $borderSubtle',
                '&:focus': { borderColor: '$accentDefault', outline: 'none' },
              }}
            />
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
                  border: '1px solid $borderSubtle',
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
                    borderBottom: '1px solid $borderSubtle',
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
                      borderTop: (pendingChanges.updates?.length ?? 0) > 0 ? '1px solid $borderSubtle' : 'none',
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
                  <Box css={{ padding: '$3 $4', borderTop: '1px solid $borderSubtle' }}>
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
                  border: '1px solid $borderSubtle',
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
              border: '1px solid $borderSubtle',
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
                  borderBottom: historyOpen ? '1px solid $borderSubtle' : 'none',
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
