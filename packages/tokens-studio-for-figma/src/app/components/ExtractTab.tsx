import React, { useCallback, useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Button,
  Box,
  Heading,
  TextInput,
  Label,
  DropdownMenu,
  IconButton,
} from '@tokens-studio/ui';
import {
  MoreHoriz,
  Check,
  InfoCircle,
  NavArrowDown,
  Download,
  RefreshDouble,
  Telegram,
  BellNotification,
  Settings,
  Code,
  GitPullRequest,
  Link,
  Xmark,
  Component,
  NavArrowUp,
  Copy,
  DownloadDataWindow,
  Search,
} from 'iconoir-react';
import Text from './Text';
import Stack from './Stack';
import { AsyncMessageChannel } from '@/AsyncMessageChannel';
import { AsyncMessageTypes, type VariableUsageResult } from '@/types/AsyncMessages';
import { track } from '@/utils/analytics';
import { compareVariables, type VariableDiff, type VariableExport } from '@/utils/compareVariables';
import {
  getGitHubBranches,
  createGitHubPullRequest,
  getGitHubFileContent,
} from '@/app/store/providers/github/githubPrHandler';
import { settingsStateSelector } from '@/selectors';
import type { Dispatch } from '@/app/store';
import { triggerTeamsWebhook } from '@/utils/teamsWebhookHandler';
import { styled } from '@/stitches.config';

// ─── Styled components ───────────────────────────────────────────────────────

const TabRoot = styled(Box, {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflowY: 'auto',
  backgroundColor: '$bgDefault',
  color: '$fgDefault',
});

const Section = styled(Box, {
  padding: '$4',
  borderBottom: '1px solid $borderMuted',
});

const SectionHeader = styled(Stack, {
  marginBottom: '$3',
  defaultProps: { direction: 'row', align: 'center', justify: 'between' },
});

const StatChip = styled(Box, {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '2px 8px',
  borderRadius: '20px',
  fontSize: '10px',
  fontWeight: '$bold',
  letterSpacing: '0.05em',
  variants: {
    type: {
      added: { backgroundColor: 'rgba(46,125,50,0.25)', color: '#81C784', border: '1px solid #2E7D32' },
      removed: { backgroundColor: 'rgba(198,40,40,0.2)', color: '#EF9A9A', border: '1px solid #C62828' },
      modified: { backgroundColor: 'rgba(21,101,192,0.2)', color: '#90CAF9', border: '1px solid #1565C0' },
    },
  },
});

const VarRow = styled(Box, {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '$2 $4',
  borderBottom: '1px solid $borderMuted',
  transition: 'background 0.12s',
  '&:hover': { backgroundColor: '$bgSubtle' },
  '&:last-child': { borderBottom: 'none' },
});

const Badge = styled(Box, {
  padding: '1px 6px',
  borderRadius: '3px',
  fontSize: '9px',
  fontWeight: '$bold',
  letterSpacing: '0.08em',
  variants: {
    type: {
      added: { backgroundColor: '#1B5E20', color: '#A5D6A7' },
      removed: { backgroundColor: '#7F0000', color: '#FFCDD2' },
      modified: { backgroundColor: '#0D47A1', color: '#BBDEFB' },
    },
  },
});

const StyledTextarea = styled('textarea', {
  backgroundColor: '$bgSubtle',
  border: '1px solid $borderMuted',
  color: '$fgMuted',
  fontFamily: '$mono',
  fontSize: '9px',
  height: '120px',
  padding: '$2 $3',
  width: '100%',
  boxSizing: 'border-box',
  borderRadius: '4px',
  resize: 'none',
  outline: 'none',
  lineHeight: 1.6,
  '&:focus': { borderColor: '$blue500' },
});

const ToggleRow = styled(Box, {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '$3 $4',
  borderRadius: '6px',
  backgroundColor: '$bgSubtle',
  border: '1px solid $borderMuted',
  marginBottom: '$2',
  '&:last-child': { marginBottom: 0 },
});

const Toggle = styled(Box, {
  width: '32px',
  height: '18px',
  borderRadius: '9px',
  cursor: 'pointer',
  position: 'relative',
  transition: 'background 0.2s',
  flexShrink: 0,
  '&::after': {
    content: '""',
    position: 'absolute',
    top: '2px',
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    backgroundColor: '$fgOnEmphasis',
    transition: 'left 0.2s',
  },
  variants: {
    active: {
      true: { backgroundColor: '$accentDefault', '&::after': { left: '16px' } },
      false: { backgroundColor: '$fgSubtle', '&::after': { left: '2px' } },
    },
  },
});

const BranchOption = styled(DropdownMenu.Item, {
  cursor: 'pointer',
  padding: '$2 $3',
  fontSize: '$small',
  color: '$fgDefault',
  '&:hover': { backgroundColor: '$bgSubtle' },
});

// ─── Main component ──────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  let lastErr: any;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < retries) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
  throw lastErr;
}

function safeParseJson<T>(json: string, fallback: T): { data: T; error?: string } {
  try {
    const parsed = JSON.parse(json);
    return { data: parsed };
  } catch (e) {
    return { data: fallback, error: e instanceof Error ? e.message : 'Invalid JSON' };
  }
}

/** Format variable value for UX designer readability (colors, fonts, sizes, etc.) */
function formatValueForDesigner(
  val: any,
  varType?: string,
  variableIdToName?: Map<string, string>,
): string {
  if (val === undefined || val === null) return '—';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null) {
    if ('id' in val && typeof val.id === 'string') {
      const aliasId = val.id;
      const resolvedName = variableIdToName?.get(aliasId) ?? variableIdToName?.get(aliasId.replace(/^VariableID:/, ''));
      return resolvedName ? `{${resolvedName}}` : `{alias: ${aliasId}}`;
    }
    if ('r' in val && 'g' in val && 'b' in val) {
      const { r, g, b, a = 1 } = val;
      const hex = `#${[r, g, b].map((c) => Math.round((c ?? 0) * 255).toString(16).padStart(2, '0')).join('')}`;
      return a < 1 ? `${hex} ${Math.round((a ?? 1) * 100)}%` : hex;
    }
    if (Array.isArray(val)) {
      if (val.length >= 2 && typeof val[0] === 'string') return val.join(', ');
      return JSON.stringify(val);
    }
    if ('fontFamily' in val || 'fontSize' in val) {
      const parts: string[] = [];
      if (val.fontFamily) parts.push(typeof val.fontFamily === 'string' ? val.fontFamily : (val.fontFamily as string[]).join(', '));
      if (val.fontSize != null) parts.push(`${val.fontSize}px`);
      if (val.fontWeight != null) parts.push(val.fontWeight);
      if (val.lineHeightPx != null) parts.push(`line-height: ${val.lineHeightPx}px`);
      if (val.letterSpacing != null) parts.push(`letter-spacing: ${val.letterSpacing}`);
      return parts.length ? parts.join(' · ') : JSON.stringify(val);
    }
    return JSON.stringify(val);
  }
  return String(val);
}

type ChangeCategory = 'color' | 'typography' | 'spacing' | 'other';

type ComponentImpactChange = {
  variableName: string;
  collectionName: string;
  changeType: 'modified' | 'removed';
  varType: string;
  changeCategory: ChangeCategory;
  oldValue: string;
  newValue?: string;
  oldRawValue?: any;
  newRawValue?: any;
  valuesByMode?: Record<string, any>;
  description?: string;
};

type ComponentImpact = {
  componentName: string;
  nodeCount: number;
  nodeIds: string[];
  changes: ComponentImpactChange[];
};

function rgbToHex(r: number, g: number, b: number, a = 1): string {
  const hex = `#${[r, g, b].map((c) => Math.round((c ?? 0) * 255).toString(16).padStart(2, '0')).join('')}`;
  return a < 1 ? `${hex}${Math.round(a * 255).toString(16).padStart(2, '0')}` : hex;
}

function isColorValue(val: any): boolean {
  return val && typeof val === 'object' && 'r' in val && 'g' in val && 'b' in val;
}

function getDesignerFriendlyType(varType: string, collectionName: string): string {
  const col = (collectionName || '').toLowerCase();
  if (varType === 'COLOR') return 'Color';
  if (varType === 'FLOAT') {
    if (col.includes('font') || col.includes('size') || col.includes('typography')) return 'Font size';
    if (col.includes('spacing') || col.includes('gap') || col.includes('padding') || col.includes('margin')) return 'Spacing';
    if (col.includes('radius') || col.includes('border')) return 'Border radius';
    return 'Number';
  }
  if (varType === 'STRING') return col.includes('font') ? 'Font family' : 'Text';
  if (varType === 'BOOLEAN') return 'Toggle';
  return varType || 'Unknown';
}

function getChangeCategory(varType: string, collectionName: string): ChangeCategory {
  const col = (collectionName || '').toLowerCase();
  if (varType === 'COLOR') return 'color';
  if (varType === 'FLOAT' && (col.includes('font') || col.includes('typography') || col.includes('size'))) return 'typography';
  if (varType === 'STRING' && col.includes('font')) return 'typography';
  if (varType === 'FLOAT' && (col.includes('spacing') || col.includes('gap') || col.includes('padding') || col.includes('margin'))) return 'spacing';
  return 'other';
}

const CATEGORY_LABELS: Record<ChangeCategory, string> = {
  color: 'Colors',
  typography: 'Typography',
  spacing: 'Spacing & Layout',
  other: 'Other',
};

function groupChangesByCategory(changes: ComponentImpactChange[]): Record<ChangeCategory, ComponentImpactChange[]> {
  const groups: Record<ChangeCategory, ComponentImpactChange[]> = {
    color: [], typography: [], spacing: [], other: [],
  };
  changes.forEach((c) => groups[c.changeCategory].push(c));
  return groups;
}

function getImpactLevel(nodeCount: number): 'high' | 'medium' | 'low' {
  if (nodeCount >= 10) return 'high';
  if (nodeCount >= 3) return 'medium';
  return 'low';
}

function buildVariableIdToNameMap(oldVars: any[], newVars: any[]): Map<string, string> {
  const map = new Map<string, string>();
  const add = (v: any) => {
    if (v?.id && v?.name) {
      const label = v.collectionName ? `${v.collectionName}/${v.name}` : v.name;
      map.set(v.id, label);
      if (v.id.startsWith('VariableID:')) map.set(v.id.replace(/^VariableID:/, ''), label);
    }
  };
  oldVars.forEach(add);
  newVars.forEach(add);
  return map;
}

function buildComponentImpactList(
  impactData: VariableUsageResult[],
  diff: VariableDiff,
  variableIdToName: Map<string, string>,
): ComponentImpact[] {
  const removedIds = new Set(diff.removed.map((r) => r.id));
  const changedMap = new Map(diff.changed.map((c) => [c.old.id, c]));
  const removedMap = new Map(diff.removed.map((r) => [r.id, r]));

  const componentMap = new Map<string, { nodeIds: Set<string>; changes: ComponentImpact['changes'] }>();

  for (const impact of impactData) {
    const changeInfo = changedMap.get(impact.variableId) ?? removedMap.get(impact.variableId);
    if (!changeInfo) continue;

    const changeType = removedIds.has(impact.variableId) ? 'removed' as const : 'modified' as const;
    const oldVar = changeType === 'removed' ? (changeInfo as VariableExport) : (changeInfo as { old: VariableExport; new: VariableExport }).old;
    const newVar = changeType === 'modified' ? (changeInfo as { old: VariableExport; new: VariableExport }).new : null;

    const oldVal = Object.values(oldVar.valuesByMode)[0];
    const newVal = newVar ? Object.values(newVar.valuesByMode)[0] : undefined;

    const changeEntry: ComponentImpactChange = {
      variableName: impact.variableName,
      collectionName: impact.collectionName,
      changeType,
      varType: oldVar.type || 'unknown',
      changeCategory: getChangeCategory(oldVar.type || '', impact.collectionName),
      oldValue: formatValueForDesigner(oldVal, oldVar.type, variableIdToName),
      newValue: newVal !== undefined ? formatValueForDesigner(newVal, newVar!.type, variableIdToName) : undefined,
      oldRawValue: oldVal,
      newRawValue: newVal,
      valuesByMode: newVar?.valuesByMode ?? oldVar.valuesByMode,
      description: (newVar?.description || oldVar.description) as string | undefined,
    };

    for (const comp of impact.components) {
      let entry = componentMap.get(comp.componentName);
      if (!entry) {
        entry = { nodeIds: new Set(comp.nodeIds), changes: [changeEntry] };
        componentMap.set(comp.componentName, entry);
      } else {
        comp.nodeIds.forEach((id) => entry!.nodeIds.add(id));
        if (!entry.changes.some((c) => c.variableName === changeEntry.variableName)) {
          entry.changes.push(changeEntry);
        }
      }
    }
  }

  return Array.from(componentMap.entries()).map(([componentName, { nodeIds, changes }]) => ({
    componentName,
    nodeCount: nodeIds.size,
    nodeIds: Array.from(nodeIds),
    changes,
  }));
}

export default function ExtractTab() {
  const [jsonResult, setJsonResult] = useState<string>('');
  const [oldJsonPreview, setOldJsonPreview] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const dispatch = useDispatch<Dispatch>();
  const settings = useSelector(settingsStateSelector);
  const {
    pat = '',
    owner = '',
    repo = '',
    baseBranch = 'main',
    filePath = 'variables.json',
    webhookUrl: savedWebhookUrl = '',
    webhookUrlDev: savedWebhookUrlDev = '',
  } = settings.githubExtractConfig || {};

  const [targetBranch, setTargetBranch] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [isCreatingPr, setIsCreatingPr] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);

  const [diff, setDiff] = useState<VariableDiff | null>(null);
  const [impactData, setImpactData] = useState<VariableUsageResult[]>([]);
  const [variableIdToName, setVariableIdToName] = useState<Map<string, string>>(new Map());
  const [hasDrift, setHasDrift] = useState<boolean | null>(null);
  const [driftError, setDriftError] = useState<string | null>(null);

  // Notification toggles
  const [notifyDevTeam, setNotifyDevTeam] = useState(false);
  const [notifyDS, setNotifyDS] = useState(false);

  // Webhook settings panel
  const [showSettings, setShowSettings] = useState(false);
  const [webhookUrlInput, setWebhookUrlInput] = useState(savedWebhookUrl);
  const [webhookUrlDev, setWebhookUrlDev] = useState(savedWebhookUrlDev);

  // View state
  const [showJsonPreviews, setShowJsonPreviews] = useState(false);
  const [showComponentImpacts, setShowComponentImpacts] = useState(true);
  const [componentSearchFilter, setComponentSearchFilter] = useState('');
  const [componentChangeTypeFilter, setComponentChangeTypeFilter] = useState<'all' | 'modified' | 'removed'>('all');
  const [componentVarTypeFilter, setComponentVarTypeFilter] = useState<string>('all');
  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(new Set());
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const checkDrift = useCallback(async () => {
    if (!pat || !owner || !repo || !baseBranch || !filePath) return;
    setDriftError(null);
    try {
      const extractResponse = await AsyncMessageChannel.ReactInstance.message({
        type: AsyncMessageTypes.EXTRACT_VARIABLES_TO_CANVAS,
      });
      const currentCanvasJson = extractResponse.jsonString || '[]';
      const githubConfig = { pat, owner, repo, branch: baseBranch, path: filePath };
      const remoteJson = await withRetry(() => getGitHubFileContent(githubConfig));
      if (remoteJson) {
        const { data: remoteVars, error: remoteErr } = safeParseJson(remoteJson, []);
        const { data: canvasVars, error: canvasErr } = safeParseJson(currentCanvasJson, []);
        if (remoteErr || canvasErr) {
          setDriftError(remoteErr || canvasErr || 'Failed to parse JSON');
          setHasDrift(null);
          return;
        }
        const driftResult = compareVariables(Array.isArray(remoteVars) ? remoteVars : [], Array.isArray(canvasVars) ? canvasVars : []);
        setHasDrift(driftResult.added.length > 0 || driftResult.removed.length > 0 || driftResult.changed.length > 0);
      }
    } catch (err: any) {
      setDriftError(err?.message || 'Drift check failed');
      setHasDrift(null);
    }
  }, [pat, owner, repo, baseBranch, filePath]);

  useEffect(() => {
    checkDrift();
    const interval = setInterval(checkDrift, 60000);
    return () => clearInterval(interval);
  }, [checkDrift]);

  const handleExtractAndAnalyze = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setDiff(null);
    setJsonResult('');
    setOldJsonPreview('');
    setImpactData([]);
    setVariableIdToName(new Map());

    try {
      const extractResponse = await AsyncMessageChannel.ReactInstance.message({
        type: AsyncMessageTypes.EXTRACT_VARIABLES_TO_CANVAS,
      });
      const freshJson = extractResponse.jsonString || '[]';
      const { data: newVars, error: extractErr } = safeParseJson(freshJson, []);
      if (extractErr) {
        setError(`Invalid extract JSON: ${extractErr}`);
        return;
      }
      setJsonResult(freshJson);

      if (pat && owner && repo) {
        const baseJsonStr = await withRetry(() => getGitHubFileContent({ pat, owner, repo, branch: baseBranch, path: filePath }));
        const baseStr = baseJsonStr || '[]';
        setOldJsonPreview(baseStr);
        const { data: oldVars, error: baseErr } = safeParseJson(baseStr, []);
        if (baseErr) {
          setError(`Invalid GitHub JSON: ${baseErr}`);
          return;
        }
        const oldArr = Array.isArray(oldVars) ? oldVars : [];
        const newArr = Array.isArray(newVars) ? newVars : [];
        const diffResult = compareVariables(oldArr, newArr);
        setDiff(diffResult);
        setVariableIdToName(buildVariableIdToNameMap(oldArr, newArr));

        const variableIds = [
          ...diffResult.removed.map((v) => v.id),
          ...diffResult.changed.map((v) => v.old.id),
        ].filter(Boolean) as string[];

        if (variableIds.length > 0) {
          const impactRes = await AsyncMessageChannel.ReactInstance.message({
            type: AsyncMessageTypes.CALCULATE_VARIABLES_IMPACT,
            variableIds,
          });
          if (impactRes && (impactRes as any).variables) {
            setImpactData((impactRes as any).variables);
          }
        }
      }
      track('Extract and Analyze Variables');
    } catch (err: any) {
      setError(`Failed: ${err.message || String(err)}`);
    } finally {
      setIsLoading(false);
    }
  }, [pat, owner, repo, baseBranch, filePath]);

  const fetchBranches = useCallback(async () => {
    if (!pat || !owner || !repo) return;
    setIsLoadingBranches(true);
    try {
      const branches = await getGitHubBranches({ pat, owner, repo });
      setAvailableBranches(branches);
    } catch (_err) { /* silence */ } finally {
      setIsLoadingBranches(false);
    }
  }, [pat, owner, repo]);

  // Fetch branches on mount if config is ready
  useEffect(() => {
    if (pat && owner && repo) fetchBranches();
  }, [pat, owner, repo, fetchBranches]);

  // Sync webhook URLs from settings when they change externally (e.g. GithubExtractSettings)
  useEffect(() => {
    setWebhookUrlInput(savedWebhookUrl);
    setWebhookUrlDev(savedWebhookUrlDev);
  }, [savedWebhookUrl, savedWebhookUrlDev]);

  const handleCreatePr = useCallback(async () => {
    if (!jsonResult || !pat || !owner || !repo || !targetBranch) {
      setError('Please fill all required fields and extract JSON first.');
      return;
    }
    setError(null);
    setIsCreatingPr(true);
    setPrUrl(null);
    try {
      const url = await createGitHubPullRequest({
        pat, owner, repo, baseBranch, targetBranch,
        title: 'Design Tokens Update from Figma',
        body: 'Automated PR containing updated Figma variables.',
        files: [{ path: filePath, content: jsonResult }],
        commitMessage: commitMessage || 'chore: update design tokens',
      });
      setPrUrl(url);

      // Notify Dev Team via webhook
      if (notifyDevTeam && webhookUrlDev && diff) {
        await triggerTeamsWebhook(webhookUrlDev, url, repo, targetBranch, diff.added.length, diff.removed.length, diff.changed.length);
      }
      // Notify DS via webhook
      if (notifyDS && webhookUrlInput && diff) {
        await triggerTeamsWebhook(webhookUrlInput, url, repo, targetBranch, diff.added.length, diff.removed.length, diff.changed.length);
      }
      track('Create PR for Extracted Variables');
    } catch (err: any) {
      setError(err.message || 'Failed to create PR');
    } finally {
      setIsCreatingPr(false);
    }
  }, [jsonResult, pat, owner, repo, baseBranch, targetBranch, filePath, commitMessage, notifyDevTeam, notifyDS, webhookUrlDev, webhookUrlInput, diff]);

  const handleDownload = useCallback(() => {
    if (!jsonResult) return;
    track('Download Extracted Variables JSON');
    try {
      const blob = new Blob([jsonResult], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'variables.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('Download failed. Try copying the JSON manually.');
    }
  }, [jsonResult]);

  const handleWebhookUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setWebhookUrlInput(val);
    dispatch.settings.setGithubExtractConfig({ webhookUrl: val });
  }, [dispatch]);
  const handleWebhookDevChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setWebhookUrlDev(val);
    dispatch.settings.setGithubExtractConfig({ webhookUrlDev: val });
  }, [dispatch]);
  const handleCommitChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setCommitMessage(e.target.value), []);

  const hasAnalysis = diff !== null;
  const totalChanges = hasAnalysis ? diff.added.length + diff.removed.length + diff.changed.length : 0;
  const rawComponentImpacts = hasAnalysis && diff && impactData.length > 0 ? buildComponentImpactList(impactData, diff, variableIdToName) : [];

  const componentImpacts = rawComponentImpacts.filter((comp) => {
    const matchesSearch = !componentSearchFilter || comp.componentName.toLowerCase().includes(componentSearchFilter.toLowerCase());
    const hasMatchingChanges = componentChangeTypeFilter === 'all'
      || comp.changes.some((c) => c.changeType === componentChangeTypeFilter);
    const hasMatchingVarType = componentVarTypeFilter === 'all'
      || comp.changes.some((c) => c.changeCategory === componentVarTypeFilter || c.varType === componentVarTypeFilter);
    return matchesSearch && hasMatchingChanges && hasMatchingVarType;
  });

  const handleSelectInFigma = useCallback(async (nodeIds: string[]) => {
    try {
      await AsyncMessageChannel.ReactInstance.message({
        type: AsyncMessageTypes.SELECT_NODES,
        ids: nodeIds,
      });
    } catch (_) { /* ignore */ }
  }, []);

  const showCopyFeedback = useCallback((msg: string) => {
    setCopyFeedback(msg);
    setTimeout(() => setCopyFeedback(null), 1500);
  }, []);

  const handleCopy = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showCopyFeedback(`Copied ${label}`);
    } catch (_) {
      showCopyFeedback('Copy failed');
    }
  }, [showCopyFeedback]);

  const handleExportSummary = useCallback(() => {
    const lines: string[] = ['# Components Affected - Design Token Changes', '', `Generated: ${new Date().toISOString()}`, ''];
    rawComponentImpacts.forEach((comp) => {
      lines.push(`## ${comp.componentName} (${comp.nodeCount} nodes)`);
      lines.push('');
      const grouped = groupChangesByCategory(comp.changes);
      (['color', 'typography', 'spacing', 'other'] as ChangeCategory[]).forEach((cat) => {
        const changes = grouped[cat];
        if (changes.length > 0) {
          lines.push(`### ${CATEGORY_LABELS[cat]}`);
          changes.forEach((ch) => {
            const changeLine = ch.changeType === 'modified'
              ? `- **${ch.variableName}**: ${ch.oldValue} → ${ch.newValue}`
              : `- **${ch.variableName}** (removed): ${ch.oldValue}`;
            lines.push(changeLine);
          });
          lines.push('');
        }
      });
      lines.push('---');
      lines.push('');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `component-impact-summary-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showCopyFeedback('Exported');
  }, [rawComponentImpacts, showCopyFeedback]);

  const toggleComponentExpand = useCallback((name: string) => {
    setExpandedComponents((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  return (
    <TabRoot>
      {/* ── Top Bar ── */}
      <Section css={{ padding: '$3 $4' }}>
        <Stack direction="row" align="center" justify="between">
          <Box>
            <Heading size="small" css={{ color: '$white', fontWeight: '$bold', marginBottom: '2px' }}>Extract Variables</Heading>
            <Text css={{ color: '$fgMuted', fontSize: '10px' }}>
              {!(pat && owner && repo) && 'Configure GitHub (PAT, owner, repo) in Settings to compare with remote'}
              {pat && owner && repo && hasDrift === true && '⚠ Local drift detected'}
              {pat && owner && repo && hasDrift === false && '✓ Synced with GitHub'}
              {pat && owner && repo && hasDrift === null && !driftError && 'Extract variables and compare with GitHub'}
              {pat && owner && repo && driftError && `Drift check error: ${driftError}`}
            </Text>
          </Box>
          <Stack direction="row" gap={1} align="center">
            {/* Download */}
            <IconButton
              icon={<Download width={14} height={14} />}
              variant="invisible"
              size="small"
              onClick={handleDownload}
              disabled={!jsonResult}
              title="Download JSON"
              css={{ color: jsonResult ? '$accentDefault' : '$fgSubtle' }}
            />
            {/* Refresh */}
            <IconButton
              icon={<RefreshDouble width={14} height={14} />}
              variant="invisible"
              size="small"
              onClick={handleExtractAndAnalyze}
              disabled={isLoading}
              title="Refresh diff"
              css={{ color: '$fgSubtle' }}
            />
            {/* Settings */}
            <IconButton
              icon={<Settings width={14} height={14} />}
              variant="invisible"
              size="small"
              onClick={() => setShowSettings((s) => !s)}
              title="Webhook settings"
              css={{ color: showSettings ? '$accentDefault' : '$fgSubtle' }}
            />
            {/* Main CTA */}
            <Button
              variant="primary"
              onClick={handleExtractAndAnalyze}
              disabled={isLoading}
              css={{ backgroundColor: '$accentDefault', height: '28px', fontSize: '11px', padding: '0 $3', marginLeft: '$2' }}
            >
              {isLoading ? 'Extracting...' : 'Extract JSON'}
            </Button>
          </Stack>
        </Stack>
      </Section>

      {/* ── Settings Panel (collapsible) ── */}
      {showSettings && (
        <Section css={{ backgroundColor: '$bgSubtle' }}>
          <Stack direction="row" align="center" justify="between" css={{ marginBottom: '$3' }}>
            <Heading size="small" css={{ color: '$accentDefault', fontSize: '11px', fontWeight: '$bold' }}>⚙ Webhook Settings</Heading>
            <IconButton icon={<Xmark width={12} height={12} />} variant="invisible" size="small" css={{ color: '$fgSubtle' }} onClick={() => setShowSettings(false)} />
          </Stack>
          <Stack direction="column" gap={3}>
            <Box>
              <Label css={{ color: '$fgMuted', fontSize: '9px', fontWeight: '$bold', letterSpacing: '0.08em', display: 'block', marginBottom: '$1' }}>
                DS TEAM WEBHOOK URL
              </Label>
              <TextInput
                value={webhookUrlInput}
                onChange={handleWebhookUrlChange}
                placeholder="https://teams.webhook.url/ds"
                css={{ backgroundColor: '$bgSubtle', border: '1px solid $borderMuted', color: '$fgDefault', fontSize: '11px', height: '30px' }}
              />
            </Box>
            <Box>
              <Label css={{ color: '$fgMuted', fontSize: '9px', fontWeight: '$bold', letterSpacing: '0.08em', display: 'block', marginBottom: '$1' }}>
                DEV TEAM WEBHOOK URL
              </Label>
              <TextInput
                value={webhookUrlDev}
                onChange={handleWebhookDevChange}
                placeholder="https://teams.webhook.url/dev"
                css={{ backgroundColor: '$bgSubtle', border: '1px solid $borderMuted', color: '$fgDefault', fontSize: '11px', height: '30px' }}
              />
            </Box>
          </Stack>
        </Section>
      )}

      {/* ── JSON Preview Toggle ── */}
      {(jsonResult || oldJsonPreview) && (
        <Section css={{ flexGrow: 1 }}>
          <Stack direction="row" align="center" justify="between" css={{ marginBottom: showJsonPreviews ? '$3' : '0' }}>
            <Stack direction="row" align="center" gap={2}>
              <Code width={12} height={12} style={{ color: 'var(--colors-fgSubtle)' }} />
              <Text css={{ color: '$fgMuted', fontSize: '10px', fontWeight: '$bold' }}>JSON Comparison</Text>
            </Stack>
            <Button
              variant="invisible"
              size="small"
              onClick={() => setShowJsonPreviews((p) => !p)}
              css={{ color: '$accentDefault', fontSize: '10px' }}
            >
              {showJsonPreviews ? 'Hide' : 'Show'}
            </Button>
          </Stack>
          {showJsonPreviews && (
            <Stack direction="row" gap={3}>
              <Box css={{ flex: 1 }}>
                <Text css={{ color: '$fgSubtle', fontSize: '9px', fontWeight: '$bold', letterSpacing: '0.06em', marginBottom: '$1', display: 'block' }}>OLD (GITHUB)</Text>
                <StyledTextarea readOnly value={oldJsonPreview} />
              </Box>
              <Box css={{ flex: 1 }}>
                <Text css={{ color: '$fgSubtle', fontSize: '9px', fontWeight: '$bold', letterSpacing: '0.06em', marginBottom: '$1', display: 'block' }}>NEW (CANVAS)</Text>
                <StyledTextarea readOnly value={jsonResult} />
              </Box>
            </Stack>
          )}
        </Section>
      )}

      {/* ── Analysis Summary ── */}
      <Section css={{ flexGrow: 1 }}>
        <SectionHeader direction="row" align="center" justify="between">
          <Box>
            <Heading size="small" css={{ color: '$white', fontWeight: '$bold', marginBottom: '2px' }}>Analysis Summary</Heading>
            <Text css={{ color: '$fgSubtle', fontSize: '10px' }}>
              {hasAnalysis ? `${totalChanges} total change${totalChanges !== 1 ? 's' : ''} found` : 'Run Extract JSON to see changes'}
            </Text>
          </Box>
          {hasAnalysis && (
            <Stack direction="row" gap={2} css={{ flexWrap: 'wrap' }}>
              <StatChip type="added">
                <Check width={9} height={9} />
                {diff!.added.length} added
              </StatChip>
              <StatChip type="removed">
                <Xmark width={9} height={9} />
                {diff!.removed.length} removed
              </StatChip>
              <StatChip type="modified">
                <NavArrowDown width={9} height={9} />
                {diff!.changed.length} modified
              </StatChip>
              {impactData.length > 0 && (
                <Box css={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '$bold', letterSpacing: '0.05em', backgroundColor: 'rgba(156,39,176,0.2)', color: '#CE93D8', border: '1px solid #7B1FA2' }}>
                  {impactData.reduce((sum, v) => sum + v.componentCount, 0)}
                  {' '}
                  components affected
                </Box>
              )}
            </Stack>
          )}
        </SectionHeader>

        <Box css={{ border: '1px solid $borderMuted', borderRadius: '6px', overflow: 'hidden' }}>
          {!hasAnalysis && (
            <Box css={{ padding: '$8', textAlign: 'center' }}>
              <InfoCircle width={28} height={28} style={{ color: 'var(--colors-fgSubtle)', marginBottom: '8px', display: 'block', margin: '0 auto 8px' }} />
              <Text css={{ color: '$fgMuted', fontSize: '11px' }}>No analysis data yet.</Text>
              <Text css={{ color: '$fgSubtle', fontSize: '10px', marginTop: '$1' }}>{'Click "Extract JSON" to load and compare variables.'}</Text>
            </Box>
          )}

          {hasAnalysis && totalChanges === 0 && (
            <Box css={{ padding: '$8', textAlign: 'center' }}>
              <Check width={28} height={28} style={{ color: '#2E7D32', margin: '0 auto 8px', display: 'block' }} />
              <Text css={{ color: '$successFg', fontSize: '11px' }}>No changes detected.</Text>
              <Text css={{ color: '$fgMuted', fontSize: '10px', marginTop: '$1' }}>Canvas is in sync with GitHub.</Text>
            </Box>
          )}

          {hasAnalysis && totalChanges > 0 && impactData.length === 0 && (
            <Box css={{ padding: '$4 $6', backgroundColor: 'rgba(156,39,176,0.1)', borderTop: '1px solid $borderMuted' }}>
              <InfoCircle width={16} height={16} style={{ color: '#CE93D8', display: 'inline-block', marginRight: '6px', verticalAlign: 'middle' }} />
              <Text css={{ color: '#CE93D8', fontSize: '10px' }}>
                Changed variables are not used in any components yet. Components Affected will appear when modified/removed variables are bound to component instances.
              </Text>
            </Box>
          )}

          {hasAnalysis && diff!.added.length > 0 && (
            <>
              <Box css={{ padding: '$1 $4', backgroundColor: '$bgSubtle', borderBottom: '1px solid $borderMuted' }}>
                <Text css={{ color: '$successFg', fontSize: '9px', fontWeight: '$bold', letterSpacing: '0.08em' }}>ADDED</Text>
              </Box>
              {diff!.added.map((v) => (
                <VarRow key={v.id}>
                  <Box>
                    <Text css={{ color: '$white', fontSize: '11px', fontWeight: '$medium' }}>{v.name}</Text>
                    <Text css={{ color: '$fgSubtle', fontSize: '9px' }}>{v.collectionName}</Text>
                  </Box>
                  <Badge type="added">NEW</Badge>
                </VarRow>
              ))}
            </>
          )}

          {hasAnalysis && diff!.changed.length > 0 && (
            <>
              <Box css={{ padding: '$1 $4', backgroundColor: '$bgSubtle', borderBottom: '1px solid $borderMuted', borderTop: diff!.added.length > 0 ? '1px solid $borderMuted' : 'none' }}>
                <Text css={{ color: '$accentDefault', fontSize: '9px', fontWeight: '$bold', letterSpacing: '0.08em' }}>MODIFIED</Text>
              </Box>
              {diff!.changed.map((v) => {
                const oldVal = Object.values(v.old.valuesByMode)[0];
                const newVal = Object.values(v.new.valuesByMode)[0];
                return (
                  <VarRow key={v.new.id}>
                    <Box>
                      <Text css={{ color: '$white', fontSize: '11px', fontWeight: '$medium' }}>{v.new.name}</Text>
                      <Stack direction="row" align="center" gap={2} css={{ marginTop: '2px' }}>
                        <Text css={{ color: '$dangerFg', fontSize: '9px', textDecoration: 'line-through' }}>{String(oldVal)}</Text>
                        <Text css={{ color: '$fgSubtle', fontSize: '9px' }}>→</Text>
                        <Text css={{ color: '$successFg', fontSize: '9px', fontWeight: '$bold' }}>{String(newVal)}</Text>
                      </Stack>
                    </Box>
                    <Badge type="modified">MODIFIED</Badge>
                  </VarRow>
                );
              })}
            </>
          )}

          {hasAnalysis && diff!.removed.length > 0 && (
            <>
              <Box css={{ padding: '$1 $4', backgroundColor: '$bgSubtle', borderBottom: '1px solid $borderMuted', borderTop: (diff!.added.length > 0 || diff!.changed.length > 0) ? '1px solid $borderMuted' : 'none' }}>
                <Text css={{ color: '$dangerFg', fontSize: '9px', fontWeight: '$bold', letterSpacing: '0.08em' }}>REMOVED</Text>
              </Box>
              {diff!.removed.map((v) => (
                <VarRow key={v.id}>
                  <Box>
                    <Text css={{ color: '$fgMuted', fontSize: '11px', fontWeight: '$medium' }}>{v.name}</Text>
                    <Text css={{ color: '$fgSubtle', fontSize: '9px' }}>{v.collectionName}</Text>
                  </Box>
                  <Badge type="removed">REMOVED</Badge>
                </VarRow>
              ))}
            </>
          )}

          {/* Components Affected — detailed list for UX designers */}
          {rawComponentImpacts.length > 0 && (
            <>
              <Box
                as="button"
                onClick={() => setShowComponentImpacts((p) => !p)}
                css={{
                  width: '100%',
                  padding: '$2 $4',
                  backgroundColor: 'rgba(156,39,176,0.15)',
                  borderTop: '1px solid $borderMuted',
                  borderBottom: showComponentImpacts ? '1px solid $borderMuted' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  border: 'none',
                  color: '#CE93D8',
                  fontSize: '9px',
                  fontWeight: '$bold',
                  letterSpacing: '0.08em',
                  '&:hover': { backgroundColor: 'rgba(156,39,176,0.25)' },
                }}
              >
                <Stack direction="row" align="center" gap={2}>
                  <Component width={10} height={10} />
                  COMPONENTS AFFECTED
                  {' '}
                  (
                  {rawComponentImpacts.length}
                  )
                </Stack>
                {showComponentImpacts ? <NavArrowUp width={10} height={10} /> : <NavArrowDown width={10} height={10} />}
              </Box>
              {showComponentImpacts && (
                <>
                  {/* Search, filter, export bar */}
                  <Box css={{ padding: '$2 $4', backgroundColor: '$bgSubtle', borderBottom: '1px solid $borderMuted', display: 'flex', flexDirection: 'column', gap: '$2' }}>
                    <Stack direction="row" align="center" gap={2}>
                      <Box css={{ position: 'relative', flex: 1 }}>
                        <Search width={12} height={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--colors-fgSubtle)' }} />
                        <TextInput
                          value={componentSearchFilter}
                          onChange={(e) => setComponentSearchFilter(e.target.value)}
                          placeholder="Search components…"
                          css={{ paddingLeft: '24px', height: '28px', fontSize: '10px' }}
                        />
                        {componentSearchFilter && (
                          <Box
                            as="button"
                            onClick={() => setComponentSearchFilter('')}
                            css={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                          >
                            <Xmark width={10} height={10} style={{ color: 'var(--colors-fgSubtle)' }} />
                          </Box>
                        )}
                      </Box>
                      <DropdownMenu>
                        <DropdownMenu.Trigger asChild>
                          <Button variant="invisible" size="small" css={{ height: '28px', fontSize: '9px' }}>
                            {componentChangeTypeFilter === 'all' ? 'All changes' : componentChangeTypeFilter}
                          </Button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content css={{ minWidth: '120px' }}>
                            <DropdownMenu.Item onSelect={() => setComponentChangeTypeFilter('all')}>All changes</DropdownMenu.Item>
                            <DropdownMenu.Item onSelect={() => setComponentChangeTypeFilter('modified')}>Modified only</DropdownMenu.Item>
                            <DropdownMenu.Item onSelect={() => setComponentChangeTypeFilter('removed')}>Removed only</DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu>
                      <DropdownMenu>
                        <DropdownMenu.Trigger asChild>
                          <Button variant="invisible" size="small" css={{ height: '28px', fontSize: '9px' }}>
                            {componentVarTypeFilter === 'all' ? 'All types' : componentVarTypeFilter}
                          </Button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content css={{ minWidth: '120px' }}>
                            <DropdownMenu.Item onSelect={() => setComponentVarTypeFilter('all')}>All types</DropdownMenu.Item>
                            <DropdownMenu.Item onSelect={() => setComponentVarTypeFilter('color')}>Colors</DropdownMenu.Item>
                            <DropdownMenu.Item onSelect={() => setComponentVarTypeFilter('typography')}>Typography</DropdownMenu.Item>
                            <DropdownMenu.Item onSelect={() => setComponentVarTypeFilter('spacing')}>Spacing</DropdownMenu.Item>
                            <DropdownMenu.Item onSelect={() => setComponentVarTypeFilter('other')}>Other</DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu>
                      <IconButton
                        icon={<DownloadDataWindow width={12} height={12} />}
                        variant="invisible"
                        size="small"
                        onClick={handleExportSummary}
                        title="Export summary as Markdown"
                      />
                    </Stack>
                    {copyFeedback && (
                      <Text css={{ color: '$successFg', fontSize: '9px' }}>{copyFeedback}</Text>
                    )}
                  </Box>
                  {componentImpacts.length === 0 ? (
                    <Box css={{ padding: '$4', textAlign: 'center' }}>
                      <Text css={{ color: '$fgMuted', fontSize: '10px' }}>No components match the current filters.</Text>
                    </Box>
                  ) : (
                    componentImpacts.map((comp) => {
                      const isExpanded = expandedComponents.has(comp.componentName);
                      const impactLevel = getImpactLevel(comp.nodeCount);
                      return (
                        <Box
                          key={comp.componentName}
                          css={{
                            borderBottom: '1px solid $borderMuted',
                            backgroundColor: '$bgDefault',
                          }}
                        >
                          <Box
                            as="button"
                            onClick={() => toggleComponentExpand(comp.componentName)}
                            css={{
                              width: '100%',
                              padding: '$2 $4',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              border: 'none',
                              background: 'transparent',
                              color: 'inherit',
                              textAlign: 'left',
                              '&:hover': { backgroundColor: '$bgSubtle' },
                            }}
                          >
                            <Stack direction="row" align="center" gap={2}>
                              {isExpanded ? <NavArrowUp width={10} height={10} style={{ color: 'var(--colors-fgSubtle)' }} /> : <NavArrowDown width={10} height={10} style={{ color: 'var(--colors-fgSubtle)' }} />}
                              <Text css={{ color: '$white', fontSize: '11px', fontWeight: '$bold' }}>{comp.componentName}</Text>
                              <Text css={{ color: '$fgSubtle', fontSize: '9px' }}>
                                (
                                {comp.nodeCount}
                                {' '}
                                {comp.nodeCount === 1 ? 'node' : 'nodes'}
                                )
                              </Text>
                              <Box
                                css={{
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontSize: '8px',
                                  fontWeight: '$bold',
                                  backgroundColor: impactLevel === 'high' ? 'rgba(198,40,40,0.3)' : impactLevel === 'medium' ? 'rgba(255,152,0,0.3)' : 'rgba(76,175,80,0.3)',
                                  color: impactLevel === 'high' ? '#EF9A9A' : impactLevel === 'medium' ? '#FFE082' : '#A5D6A7',
                                }}
                              >
                                {impactLevel.toUpperCase()}
                              </Box>
                            </Stack>
                            <Stack direction="row" align="center" gap={1}>
                              <IconButton
                                icon={<Component width={10} height={10} />}
                                variant="invisible"
                                size="small"
                                onClick={(e) => { e.stopPropagation(); handleSelectInFigma(comp.nodeIds); }}
                                title="Select in Figma"
                              />
                              <IconButton
                                icon={<Copy width={10} height={10} />}
                                variant="invisible"
                                size="small"
                                onClick={(e) => { e.stopPropagation(); handleCopy(`${comp.componentName}\n${comp.changes.map((c) => `- ${c.variableName}: ${c.oldValue}${c.newValue ? ` → ${c.newValue}` : ' (removed)'}`).join('\n')}`, 'component summary'); }}
                                title="Copy summary"
                              />
                            </Stack>
                          </Box>
                          {isExpanded && (
                            <Box css={{ padding: '$2 $4 $3', paddingLeft: '28px' }}>
                              {(['color', 'typography', 'spacing', 'other'] as ChangeCategory[]).map((cat) => {
                                const changes = comp.changes.filter((c) => c.changeCategory === cat);
                                if (changes.length === 0) return null;
                                return (
                                  <Box key={cat} css={{ marginBottom: '$2' }}>
                                    <Text css={{ color: '$fgMuted', fontSize: '8px', fontWeight: '$bold', letterSpacing: '0.08em', marginBottom: '$1', display: 'block' }}>{CATEGORY_LABELS[cat]}</Text>
                                    {changes.map((ch) => (
                                      <Box
                                        key={ch.variableName}
                                        css={{
                                          padding: '$2 $3',
                                          backgroundColor: '$bgSubtle',
                                          borderRadius: '4px',
                                          borderLeft: `3px solid ${ch.changeType === 'removed' ? '#C62828' : '#1565C0'}`,
                                          marginBottom: '$1',
                                          position: 'relative',
                                        }}
                                        title={ch.description || undefined}
                                      >
                                        <Stack direction="row" align="center" gap={2} css={{ marginBottom: '4px' }}>
                                          <Text css={{ color: '$white', fontSize: '10px', fontWeight: '$medium' }}>{ch.variableName}</Text>
                                          <Text css={{ color: '$fgSubtle', fontSize: '8px' }}>{ch.collectionName}</Text>
                                          <Badge type={ch.changeType} css={{ marginLeft: 'auto' }}>
                                            {ch.changeType.toUpperCase()}
                                          </Badge>
                                          <IconButton
                                            icon={<Copy width={8} height={8} />}
                                            variant="invisible"
                                            size="small"
                                            onClick={() => handleCopy(`${ch.variableName}: ${ch.oldValue}${ch.newValue ? ` → ${ch.newValue}` : ''}`, 'change')}
                                            title="Copy"
                                          />
                                        </Stack>
                                        <Stack direction="row" align="center" gap={2} css={{ flexWrap: 'wrap', alignItems: 'center' }}>
                                          {isColorValue(ch.oldRawValue) && (
                                            <Box
                                              css={{
                                                width: 14,
                                                height: 14,
                                                borderRadius: 3,
                                                border: '1px solid $borderMuted',
                                                flexShrink: 0,
                                                backgroundColor: rgbToHex(ch.oldRawValue.r, ch.oldRawValue.g, ch.oldRawValue.b, ch.oldRawValue.a),
                                              }}
                                            />
                                          )}
                                          <Text css={{ color: '$dangerFg', fontSize: '9px', textDecoration: ch.changeType === 'modified' ? 'line-through' : 'none' }}>
                                            {ch.oldValue}
                                          </Text>
                                          {ch.changeType === 'modified' && ch.newValue != null && (
                                            <>
                                              {isColorValue(ch.newRawValue) && (
                                                <Box
                                                  css={{
                                                    width: 14,
                                                    height: 14,
                                                    borderRadius: 3,
                                                    border: '1px solid $borderMuted',
                                                    flexShrink: 0,
                                                    backgroundColor: rgbToHex(ch.newRawValue.r, ch.newRawValue.g, ch.newRawValue.b, ch.newRawValue.a),
                                                  }}
                                                />
                                              )}
                                              <Text css={{ color: '$fgSubtle', fontSize: '9px' }}>→</Text>
                                              <Text css={{ color: '$successFg', fontSize: '9px', fontWeight: '$bold' }}>{ch.newValue}</Text>
                                            </>
                                          )}
                                        </Stack>
                                        {ch.valuesByMode && Object.keys(ch.valuesByMode).length > 1 && (
                                          <Box css={{ marginTop: '4px' }}>
                                            <Text css={{ color: '$fgMuted', fontSize: '8px', fontWeight: '$bold', display: 'block' }}>By mode:</Text>
                                            {Object.entries(ch.valuesByMode).map(([modeId, val]) => (
                                              <Text key={modeId} css={{ color: '$fgSubtle', fontSize: '8px' }}>
                                                {modeId}
                                                :
                                                {' '}
                                                {formatValueForDesigner(val, ch.varType, variableIdToName)}
                                              </Text>
                                            ))}
                                          </Box>
                                        )}
                                        <Text css={{ color: '$fgMuted', fontSize: '8px', marginTop: '2px' }}>
                                          {getDesignerFriendlyType(ch.varType, ch.collectionName)}
                                        </Text>
                                      </Box>
                                    ))}
                                  </Box>
                                );
                              })}
                            </Box>
                          )}
                        </Box>
                      );
                    })
                  )}
                </>
              )}
            </>
          )}
        </Box>
      </Section>

      {/* ── PR Configuration ── */}
      <Section css={{ borderColor: '#222', borderTop: '2px solid #1E1E1E' }}>
        <Stack direction="row" align="center" justify="between" css={{ marginBottom: '$4' }}>
          <Stack direction="row" align="center" gap={2}>
            <GitPullRequest width={13} height={13} style={{ color: 'var(--colors-fgSubtle)' }} />
            <Heading size="small" css={{ color: '$white', fontWeight: '$bold', fontSize: '12px' }}>Pull Request</Heading>
          </Stack>
          <Button
            variant="invisible"
            size="small"
            onClick={fetchBranches}
            css={{ color: '$accentDefault', fontSize: '10px' }}
          >
            {isLoadingBranches ? 'Loading...' : 'Refresh branches'}
          </Button>
        </Stack>

        <Stack direction="column" gap={3}>
          {/* Target Branch — proper dropdown */}
          <Box>
            <Label css={{ color: '$fgMuted', fontSize: '9px', fontWeight: '$bold', letterSpacing: '0.08em', display: 'block', marginBottom: '$2' }}>
              TARGET BRANCH
            </Label>
            <DropdownMenu>
              <DropdownMenu.Trigger asChild>
                <Box
                  as="button"
                  css={{
                    width: '100%',
                    height: '32px',
                    backgroundColor: '$bgDefault',
                    border: '1px solid $borderMuted',
                    borderRadius: '4px',
                    color: targetBranch ? '$fgDefault' : '$fgSubtle',
                    fontSize: '11px',
                    padding: '0 $3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    '&:hover': { borderColor: '$borderDefault' },
                  }}
                >
                  <Text css={{ color: targetBranch ? '$fgDefault' : '$fgSubtle', fontSize: '11px' }}>
                    {targetBranch || 'Select a branch...'}
                  </Text>
                  <NavArrowDown width={12} height={12} style={{ color: 'var(--colors-fgSubtle)' }} />
                </Box>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  css={{ backgroundColor: '$bgDefault', border: '1px solid $borderMuted', borderRadius: '6px', minWidth: '200px', maxHeight: '180px', overflowY: 'auto' }}
                  sideOffset={4}
                >
                  {availableBranches.length === 0 && (
                    <Box css={{ padding: '$3', textAlign: 'center' }}>
                      <Text css={{ color: '$fgSubtle', fontSize: '10px' }}>
                        {isLoadingBranches ? 'Loading branches...' : 'No branches loaded. Click "Refresh branches"'}
                      </Text>
                    </Box>
                  )}
                  {availableBranches.map((branch) => (
                    <BranchOption
                      key={branch}
                      onSelect={() => setTargetBranch(branch)}
                    >
                      <Stack direction="row" align="center" justify="between">
                        <Text css={{ color: '#ccc', fontSize: '11px' }}>{branch}</Text>
                        {targetBranch === branch && <Check width={10} height={10} style={{ color: 'var(--colors-accentDefault)' }} />}
                      </Stack>
                    </BranchOption>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu>
          </Box>

          {/* Merge into label */}
          {targetBranch && (
            <Stack direction="row" gap={2} align="center">
              <Link width={10} height={10} style={{ color: '#555' }} />
              <Text css={{ color: '#555', fontSize: '10px' }}>
                Merge
                {' '}
                <Box as="span" css={{ color: '#90CAF9' }}>{targetBranch}</Box>
                {' '}
                into
                {' '}
                <Box as="span" css={{ color: '#ccc' }}>{baseBranch}</Box>
              </Text>
            </Stack>
          )}

          {/* Commit message */}
          <Box>
            <Label css={{ color: '#666', fontSize: '9px', fontWeight: '$bold', letterSpacing: '0.08em', display: 'block', marginBottom: '$2' }}>
              COMMIT MESSAGE
            </Label>
            <TextInput
              value={commitMessage}
              onChange={handleCommitChange}
              placeholder="chore: update design tokens"
              css={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', color: '$white', fontSize: '11px', height: '32px' }}
            />
          </Box>

          {/* Notification Toggles */}
          <Box>
            <Text css={{ color: '#666', fontSize: '9px', fontWeight: '$bold', letterSpacing: '0.08em', marginBottom: '$2', display: 'block' }}>
              NOTIFICATIONS
            </Text>
            <ToggleRow>
              <Stack direction="row" align="center" gap={3}>
                <Telegram width={14} height={14} style={{ color: '#90CAF9' }} />
                <Box>
                  <Text css={{ color: '$white', fontSize: '11px', fontWeight: '$medium' }}>Inform Dev Team</Text>
                  <Text css={{ color: '#555', fontSize: '9px' }}>Send PR details to dev webhook</Text>
                </Box>
              </Stack>
              <Toggle active={notifyDevTeam} onClick={() => setNotifyDevTeam((v) => !v)} />
            </ToggleRow>
            <ToggleRow css={{ marginBottom: 0 }}>
              <Stack direction="row" align="center" gap={3}>
                <BellNotification width={14} height={14} style={{ color: '#CE93D8' }} />
                <Box>
                  <Text css={{ color: '$white', fontSize: '11px', fontWeight: '$medium' }}>Notify Design System</Text>
                  <Text css={{ color: '#555', fontSize: '9px' }}>Send PR details to DS webhook</Text>
                </Box>
              </Stack>
              <Toggle active={notifyDS} onClick={() => setNotifyDS((v) => !v)} />
            </ToggleRow>
          </Box>

          {/* Error / Success */}
          {error && (
            <Box css={{ padding: '$2 $3', backgroundColor: 'rgba(229,57,53,0.12)', borderRadius: '4px', border: '1px solid rgba(229,57,53,0.3)' }}>
              <Text css={{ color: '#EF9A9A', fontSize: '10px' }}>{error}</Text>
            </Box>
          )}

          {prUrl && (
            <Box css={{ padding: '$3', backgroundColor: 'rgba(46,125,50,0.12)', borderRadius: '4px', border: '1px solid rgba(46,125,50,0.3)' }}>
              <Stack direction="row" gap={2} align="center">
                <Check width={13} height={13} style={{ color: '#81C784' }} />
                <Text css={{ color: '#81C784', fontSize: '10px' }}>
                  {'PR created: '}
                  <a href={prUrl} target="_blank" rel="noreferrer" style={{ color: '#90CAF9', textDecoration: 'underline' }}>{prUrl}</a>
                </Text>
              </Stack>
            </Box>
          )}

          {/* Create PR button */}
          <Button
            variant="primary"
            onClick={handleCreatePr}
            disabled={isCreatingPr || !jsonResult || !targetBranch}
            css={{ backgroundColor: '#1565C0', height: '36px', fontWeight: '$bold', fontSize: '12px', marginTop: '$1' }}
          >
            {isCreatingPr ? 'Creating PR...' : 'Create Pull Request'}
          </Button>
        </Stack>
      </Section>
    </TabRoot>
  );
}
