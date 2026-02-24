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
  LayoutLeft, LightBulb, Check, Undo, ClockRotateRight, NavArrowDown, NavArrowUp,
} from 'iconoir-react';
import Box from './Box';
import AnalysisContent from './uxai/AnalysisContent';
import UXAIRecommendations from './uxai/UXAIRecommendations';
import { AsyncMessageChannel } from '@/AsyncMessageChannel';
import { AsyncMessageTypes } from '@/types/AsyncMessages';
import { settingsStateSelector } from '@/selectors';
import { getAiAnalysis, getAiStructuredChanges, type AiAnalysisResult } from '@/app/services/aiService';
import { FONT_SIZE, ICON_SIZE } from '@/constants/UIConstants';

const MAX_HISTORY = 10;

export interface HistoryEntry {
  id: string;
  prompt: string;
  result: AiAnalysisResult;
  timestamp: number;
}

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
  icon,
  title,
  accentColor,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  accentColor?: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      css={{
        ...SECTION_CARD,
        '&:hover': { borderColor: '$borderMuted' },
      }}
    >
      <Box css={{ ...SECTION_HEADER }}>
        <Box css={{ color: accentColor ?? '$accentDefault', fontSize: ICON_SIZE.lg }}>
          {icon}
        </Box>
        <Heading size="small" css={{ margin: 0, color: '$fgDefault', fontWeight: 600 }}>
          {title}
        </Heading>
      </Box>
      {children}
    </Box>
  );
}

function formatHistoryTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString();
}

export default function UXAITab() {
  const settings = useSelector(settingsStateSelector);
  const aiEnabled = settings?.aiAssistanceEnabled ?? false;
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiAnalysisResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);

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

  // Persist history when it changes
  useEffect(() => {
    if (!historyLoaded) return;
    const toStore = history.map((h) => ({
      id: h.id,
      prompt: h.prompt,
      result: h.result,
      timestamp: h.timestamp,
    }));
    AsyncMessageChannel.ReactInstance.message({
      type: AsyncMessageTypes.SET_UXAI_HISTORY,
      history: toStore,
    }).catch(() => {});
  }, [history, historyLoaded]);

  const provider = settings?.aiProvider ?? 'claude';
  const apiKey = provider === 'claude'
    ? (settings?.aiClaudeApiKey ?? '')
    : (settings?.aiGeminiApiKey ?? '');

  const handleAnalyze = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt.');
      return;
    }
    if (!apiKey) {
      setError(`Please add your ${provider === 'claude' ? 'Claude' : 'Gemini'} API key in Settings.`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      await new Promise((r) => setTimeout(r, 0));
      const extractRes = await AsyncMessageChannel.ReactInstance.message({
        type: AsyncMessageTypes.EXTRACT_VARIABLES_TO_CANVAS,
      });
      const jsonString = extractRes?.jsonString ?? '[]';
      const collectionsInfo = (extractRes as any)?.collectionsInfo ?? [];

      const variables = JSON.parse(jsonString);
      const variablesSummary = variables.length > 0
        ? `Total: ${variables.length} variables. Sample (first 25):\n${JSON.stringify(variables.slice(0, 25), null, 2)}`
        : 'No variables found.';

      const collectionsSummary = collectionsInfo.length > 0
        ? collectionsInfo.map((c: any) => `- ${c.name}: modes [${c.modes?.map((m: any) => m.name).join(', ') ?? 'N/A'}]`).join('\n')
        : 'No collections.';

      let usageSummary = '';
      try {
        const searchRes = await AsyncMessageChannel.ReactInstance.message({
          type: AsyncMessageTypes.SEARCH_VARIABLE_USAGE,
          query: '',
          allPages: false,
        });
        const vars = (searchRes as any)?.variables ?? [];
        if (vars.length > 0) {
          usageSummary = vars.slice(0, 15).map((v: any) => {
            const componentNames = (v.components ?? []).map((c: any) => c.componentName).filter(Boolean);
            const compList = componentNames.length > 0 ? ` → used by: [${componentNames.join(', ')}]` : '';
            return `- ${v.variableName} (${v.collectionName}): ${v.totalCount} uses${compList}`;
          }).join('\n');
        }
      } catch {
        // Ignore search errors
      }

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
    } catch (err: any) {
      const msg = err?.message ?? 'Analysis failed.';
      const isNetwork = /failed to fetch|networkerror|cors/i.test(String(msg));
      setError(isNetwork
        ? `${msg} Figma plugins may need a proxy for external APIs—check Settings for API key and network access.`
        : msg);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, provider, apiKey]);

  const handleUndoEntry = useCallback((entry: HistoryEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = history.filter((h) => h.id !== entry.id);
    if (filtered.length === 0) {
      setResult(null);
      setPrompt('');
      setHistory([]);
      setActiveHistoryId(null);
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
    setActiveHistoryId(entry.id);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!result || !apiKey) return;
    setConfirming(true);
    setError(null);
    try {
      const extractRes = await AsyncMessageChannel.ReactInstance.message({
        type: AsyncMessageTypes.EXTRACT_VARIABLES_TO_CANVAS,
      });
      const jsonString = extractRes?.jsonString ?? '[]';
      const collectionsInfo = (extractRes as any)?.collectionsInfo ?? [];
      const variables = JSON.parse(jsonString);

      const changes = await getAiStructuredChanges(
        provider,
        apiKey,
        prompt.trim(),
        result,
        variables,
        collectionsInfo,
      );

      const totalUpdates = (changes.updates?.length ?? 0) + (changes.creates?.length ?? 0);
      if (totalUpdates === 0) {
        setError('No variable changes to apply. The AI did not propose any updates or creates.');
        return;
      }

      const applyRes = await AsyncMessageChannel.ReactInstance.message({
        type: AsyncMessageTypes.APPLY_UXAI_CHANGES,
        updates: changes.updates ?? [],
        creates: changes.creates ?? [],
      }) as { applied?: number; errors?: string[] };

      const applied = applyRes?.applied ?? 0;
      const errs = applyRes?.errors ?? [];
      if (applied > 0) {
        setError(null);
        setResult(null);
        setPrompt('');
        setActiveHistoryId(null);
      } else if (errs.length > 0) {
        setError(`Apply failed: ${errs.join('; ')}`);
      } else {
        setError('No changes were applied.');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Apply failed.');
    } finally {
      setConfirming(false);
    }
  }, [result, prompt, provider, apiKey]);

  const componentImpactContent = result?.componentImpact || result?.rawResponse || 'No analysis received.';
  const suggestionsContent = result?.suggestions || (!result?.componentImpact ? result?.rawResponse : null) || 'No suggestions parsed.';

  if (!aiEnabled) {
    return (
      <Box css={{
        display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', padding: '$6',
      }}
      >
        <Heading size="medium" css={{ marginBottom: '$2' }}>UXAI</Heading>
        <Text css={{ color: '$fgMuted', textAlign: 'center', marginBottom: '$4' }}>
          Enable AI assistance in Settings to use this tab.
        </Text>
      </Box>
    );
  }

  return (
    <Box css={{
      display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden',
    }}
    >
      {/* Header */}
      <Box css={{
        padding: '$4 $5',
        borderBottom: '1px solid $borderSubtle',
        flexShrink: 0,
        backgroundColor: '$bgDefault',
      }}
      >
        <Heading size="small" css={{ marginBottom: '$2', color: '$fgDefault', fontWeight: 600 }}>
          UXAI — AI-Powered Variable Changes
        </Heading>
        <Text css={{ color: '$fgMuted', fontSize: FONT_SIZE.sm, lineHeight: 1.5 }}>
          Describe the change you need. AI will analyze impact, suggest variables, and propose changes.
        </Text>
      </Box>

      {/* Main content */}
      <Box className="content scroll-container" css={{ flex: 1, padding: '$4 $5', overflowY: 'auto' }}>
        <Stack direction="column" gap={4}>
          {/* Input */}
          <Box css={{
            padding: '$4',
            borderRadius: '$medium',
            border: '1px solid $borderSubtle',
            backgroundColor: '$bgDefault',
          }}
          >
            <Label css={{
              color: '$fgDefault', fontWeight: 500, marginBottom: '$2', display: 'block',
            }}
            >
              Your request
            </Label>
            <Textarea
              value={prompt}
              onChange={(v: string) => setPrompt(v ?? '')}
              placeholder="e.g., Change the border color of the Primary Button component to #0048B7 in Gap 2.0 only"
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
              disabled={isLoading}
              css={{ fontWeight: 600, marginTop: '$3', width: '100%' }}
            >
              {isLoading ? 'Analyzing…' : 'Analyze'}
            </Button>
          </Box>

          {error && (
            <Box css={{
              padding: '$3 $4',
              backgroundColor: '$dangerBg',
              color: '$dangerFg',
              borderRadius: '$small',
              border: '1px solid rgba(255,100,100,0.3)',
              fontSize: FONT_SIZE.sm,
              lineHeight: 1.5,
            }}
            >
              {error}
            </Box>
          )}

          {/* Results */}
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

              <Box css={{
                padding: '$3 $4',
                borderRadius: '$medium',
                border: '1px solid $borderSubtle',
                backgroundColor: '$bgDefault',
              }}
              >
                <Text css={{
                  fontSize: FONT_SIZE.sm, color: '$fgMuted', marginBottom: '$3', lineHeight: 1.5,
                }}
                >
                  Please check for mistakes before proceeding.
                </Text>
                <Button
                  variant="primary"
                  onClick={handleConfirm}
                  disabled={confirming}
                  css={{ fontWeight: 600, width: '100%' }}
                >
                  {confirming ? 'Applying…' : 'Confirm & Apply'}
                </Button>
              </Box>
            </Stack>
          )}

          {/* History panel */}
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
                    History (
                    {history.length}
                    )
                  </Heading>
                </Box>
                {historyOpen ? (
                  <NavArrowUp width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
                ) : (
                  <NavArrowDown width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
                )}
              </Box>
              {historyOpen && (
                <Box css={{ padding: '$2', maxHeight: 180, overflowY: 'auto' }}>
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
                          <Text
                            css={{
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
                          <Text css={{ fontSize: FONT_SIZE.xxs, opacity: 0.8, marginTop: '2px' }}>
                            {formatHistoryTime(entry.timestamp)}
                          </Text>
                        </Box>
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={(e) => handleUndoEntry(entry, e)}
                          disabled={isLoading}
                          css={{
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '$1',
                            padding: '$1 $2',
                            minHeight: 'auto',
                          }}
                        >
                          <Undo width={ICON_SIZE.xs} height={ICON_SIZE.xs} />
                          Undo
                        </Button>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>
          )}

          {/* Recommendations */}
          <UXAIRecommendations />
        </Stack>
      </Box>
    </Box>
  );
}
