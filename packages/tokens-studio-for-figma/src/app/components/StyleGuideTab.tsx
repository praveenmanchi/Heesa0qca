import React, {
  useCallback, useState, useEffect, useMemo,
} from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Button, Heading, TextInput, Label, IconButton,
} from '@tokens-studio/ui';
import {
  Check, Settings, Xmark, Search, Download, RefreshDouble, NavArrowUp, NavArrowDown, EyeClosed,
} from 'iconoir-react';
import { ICON_SIZE, CONTROL_HEIGHT, CODE_FONT_SIZE } from '@/constants/UIConstants';
import { AsyncMessageTypes } from '@/types/AsyncMessages';
import { AsyncMessageChannel } from '@/AsyncMessageChannel';
import {
  themesListSelector, settingsStateSelector,
  tokensSelector, activeTokenSetSelector,
} from '@/selectors';
import { mergeTokenGroups } from '@/utils/tokenHelpers';
import { TokenResolver } from '@/utils/TokenResolver';
import { exportToZeroheight, downloadStyleDictionaryJson } from '@/utils/zeroheightExport';
import { Dispatch } from '../store';
import Box from './Box';
import Stack from './Stack';
import Text from './Text';
import { styled } from '@/stitches.config';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FigmaVariable {
  id: string;
  name: string;
  description?: string;
  type: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  collectionId: string;
  collectionName: string;
  valuesByMode: Record<string, any>;
}

interface Collection {
  id: string;
  name: string;
  modes: { modeId: string; name: string }[];
  variables: FigmaVariable[];
}

// ─── Styled Components ───────────────────────────────────────────────────────

const Root = styled(Box, {
  display: 'flex',
  flexDirection: 'row',
  height: '100%',
  overflow: 'hidden',
  backgroundColor: '$bgDefault',
});

const Sidebar = styled(Box, {
  width: '180px',
  flexShrink: 0,
  borderRight: '1px solid $borderSubtle',
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
  backgroundColor: '$bgDefault',
  '&::-webkit-scrollbar': { width: '4px' },
  '&::-webkit-scrollbar-track': { background: 'var(--colors-bgSubtle)' },
  '&::-webkit-scrollbar-thumb': { background: 'var(--colors-borderMuted)', borderRadius: '10px' },
  '&::-webkit-scrollbar-thumb:hover': { background: 'var(--colors-borderDefault)' },
});

const SidebarSection = styled(Box, {
  borderBottom: '1px solid $borderSubtle',
  padding: '$3 $4',
});

const CollectionBtn = styled(Box, {
  as: 'button',
  width: '100%',
  textAlign: 'left',
  padding: '$2 $3',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '$small',
  transition: 'background 0.1s',
  marginBottom: '2px',
  border: 'none',
  '&:last-child': { marginBottom: 0 },
  variants: {
    active: {
      true: { backgroundColor: '$accentMuted', color: '$accentDefault', fontWeight: '$bold' },
      false: { backgroundColor: 'transparent', color: '$fgDefault', '&:hover': { backgroundColor: '$bgSubtle' } },
    },
  },
});

const ModeBtn = styled(Box, {
  padding: '2px $2',
  borderRadius: '3px',
  cursor: 'pointer',
  fontSize: '$xsmall',
  border: '1px solid $borderMuted',
  transition: 'all 0.1s',
  variants: {
    active: {
      true: { backgroundColor: '$accentDefault', color: '$fgOnEmphasis', borderColor: '$accentDefault' },
      false: { backgroundColor: 'transparent', color: '$fgMuted', '&:hover': { borderColor: '$accentDefault', color: '$accentDefault' } },
    },
  },
});

const Main = styled(Box, {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
});

const MainHeader = styled(Box, {
  padding: '$3 $4',
  borderBottom: '1px solid $borderMuted',
  flexShrink: 0,
});

const ScrollArea = styled(Box, {
  flex: 1,
  overflowY: 'auto',
  padding: '$3 $4',
  '&::-webkit-scrollbar': { width: '4px' },
  '&::-webkit-scrollbar-track': { background: 'var(--colors-bgSubtle)' },
  '&::-webkit-scrollbar-thumb': { background: 'var(--colors-borderMuted)', borderRadius: '10px' },
  '&::-webkit-scrollbar-thumb:hover': { background: 'var(--colors-borderDefault)' },
});

const GroupHeader = styled(Box, {
  display: 'flex',
  alignItems: 'center',
  gap: '$2',
  padding: '$2 0',
  marginBottom: '$2',
  borderBottom: '1px solid $borderMuted',
});

const VarRow = styled(Box, {
  display: 'flex',
  alignItems: 'center',
  padding: '$2',
  borderRadius: '4px',
  gap: '$3',
  marginBottom: '1px',
  '&:hover': { backgroundColor: '$bgSubtle' },
});

const ColorSwatch = styled(Box, {
  width: `${CONTROL_HEIGHT.md}px`,
  height: `${CONTROL_HEIGHT.md}px`,
  borderRadius: '4px',
  flexShrink: 0,
  border: '1px solid $borderMuted',
  backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
  backgroundSize: '8px 8px',
  backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
  position: 'relative',
  overflow: 'hidden',
});

const TypographySample = styled(Box, {
  padding: '$1 $2',
  backgroundColor: '$bgSubtle',
  borderRadius: '3px',
  border: '1px solid $borderMuted',
  fontSize: '$xsmall',
  color: '$fgMuted',
  fontStyle: 'italic',
  flex: 1,
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
});

const StatusBanner = styled(Box, {
  padding: '$2 $3',
  borderRadius: '4px',
  fontSize: '$xsmall',
  display: 'flex',
  alignItems: 'center',
  gap: '$2',
  marginBottom: '$3',
  variants: {
    type: {
      error: { backgroundColor: '$dangerBg', border: '1px solid $dangerBorder', color: '$dangerFg' },
      success: { backgroundColor: '$successBg', border: '1px solid $successBorder', color: '$successFg' },
      info: { backgroundColor: '$bgSubtle', border: '1px solid $borderMuted', color: '$fgMuted' },
    },
  },
});

const RightPanel = styled(Box, {
  width: '220px',
  flexShrink: 0,
  borderLeft: '1px solid $borderMuted',
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
  backgroundColor: '$bgDefault',
  '&::-webkit-scrollbar': { width: '4px' },
  '&::-webkit-scrollbar-track': { background: 'var(--colors-bgSubtle)' },
  '&::-webkit-scrollbar-thumb': { background: 'var(--colors-borderMuted)', borderRadius: '10px' },
  '&::-webkit-scrollbar-thumb:hover': { background: 'var(--colors-borderDefault)' },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rgbaToHex(r: number, g: number, b: number, a?: number): string {
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  if (a !== undefined && a < 1) return `${hex}${toHex(a)}`;
  return hex;
}

function formatColor(val: any): { css: string; label: string } {
  if (!val || typeof val !== 'object') return { css: 'transparent', label: String(val) };
  if ('r' in val && 'g' in val && 'b' in val) {
    const hex = rgbaToHex(val.r, val.g, val.b, val.a);
    const cssRgba = `rgba(${Math.round(val.r * 255)}, ${Math.round(val.g * 255)}, ${Math.round(val.b * 255)}, ${val.a ?? 1})`;
    return { css: cssRgba, label: hex };
  }
  if (val.type === 'VARIABLE_ALIAS') return { css: 'transparent', label: '↗ alias' };
  return { css: 'transparent', label: JSON.stringify(val) };
}

function formatValue(type: string, val: any): string {
  if (val === null || val === undefined) return '—';
  if (type === 'COLOR') return formatColor(val).label;
  if (type === 'BOOLEAN') return val ? 'true' : 'false';
  if (type === 'FLOAT') return typeof val === 'number' ? val.toFixed(val % 1 === 0 ? 0 : 2) : String(val);
  if (typeof val === 'object' && val?.type === 'VARIABLE_ALIAS') return '↗ alias';
  return String(val);
}

function typeIcon(type: string): string {
  switch (type) {
    case 'COLOR': return '🎨';
    case 'FLOAT': return '#';
    case 'STRING': return 'Aa';
    case 'BOOLEAN': return '◉';
    default: return '·';
  }
}

function typeLabel(type: string): string {
  switch (type) {
    case 'COLOR': return 'Colors';
    case 'FLOAT': return 'Numbers';
    case 'STRING': return 'Strings & Typography';
    case 'BOOLEAN': return 'Booleans';
    default: return type;
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StyleGuideTab() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [progressMsg, setProgressMsg] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const themes = useSelector(themesListSelector);
  const settings = useSelector(settingsStateSelector);
  const tokens = useSelector(tokensSelector);
  const activeTokenSet = useSelector(activeTokenSetSelector);
  const dispatch = useDispatch<Dispatch>();

  const [selectedThemeIds, setSelectedThemeIds] = useState<string[]>([]);

  // Variable data from canvas
  const [allVariables, setAllVariables] = useState<FigmaVariable[]>([]);
  const [collectionsInfo, setCollectionsInfo] = useState<{ id: string; name: string; modes: { modeId: string; name: string }[] }[]>([]);
  const [isLoadingVars, setIsLoadingVars] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [selectedModeId, setSelectedModeId] = useState<string | null>(null);
  const [groupByPath, setGroupByPath] = useState(true);
  const [groupLayoutByKey, setGroupLayoutByKey] = useState<Record<string, { order: string[]; hidden: string[] }>>({});

  // ── Collections derived from variables ───────────────────────────────────
  const collections: Collection[] = useMemo(() => {
    const map = new Map<string, Collection>();
    const collInfoMap = new Map(collectionsInfo.map((c) => [c.id, c]));
    allVariables.forEach((v) => {
      if (!map.has(v.collectionId)) {
        const info = collInfoMap.get(v.collectionId);
        const modes = info?.modes ?? Object.keys(v.valuesByMode).map((modeId) => ({ modeId, name: modeId }));
        map.set(v.collectionId, {
          id: v.collectionId, name: v.collectionName, modes, variables: [],
        });
      }
      map.get(v.collectionId)!.variables.push(v);
    });
    return Array.from(map.values());
  }, [allVariables, collectionsInfo]);

  const selectedCollection = useMemo(
    () => (selectedCollectionId ? collections.find((c) => c.id === selectedCollectionId) || null : null),
    [collections, selectedCollectionId],
  );

  // ── Variables for current collection + mode ────────────────────────────
  const filteredVariables = useMemo(() => {
    if (!selectedCollection) return [];
    const mId = selectedModeId || (selectedCollection.modes[0]?.modeId ?? null);
    const q = searchQuery.toLowerCase();
    return selectedCollection.variables.filter((v) => {
      if (q && !v.name.toLowerCase().includes(q) && !v.collectionName.toLowerCase().includes(q)) return false;
      if (mId && !(mId in v.valuesByMode)) return false;
      return true;
    }).map((v) => ({
      ...v,
      resolvedValue: mId ? v.valuesByMode[mId] : Object.values(v.valuesByMode)[0],
    }));
  }, [selectedCollection, selectedModeId, searchQuery]);

  // ── Group by type or by path ─────────────────────────────────────────────
  const grouped = useMemo(() => {
    if (groupByPath) {
      const pathGroups: Record<string, typeof filteredVariables> = {};
      filteredVariables.forEach((v) => {
        const parts = v.name.split('/');
        const topKey = parts[0] || 'Other';
        if (!pathGroups[topKey]) pathGroups[topKey] = [];
        pathGroups[topKey].push(v);
      });
      return Object.entries(pathGroups)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([path, items]) => ({ type: path, items }));
    }
    const order = ['COLOR', 'STRING', 'FLOAT', 'BOOLEAN'];
    const g: Record<string, typeof filteredVariables> = {};
    filteredVariables.forEach((v) => {
      if (!g[v.type]) g[v.type] = [];
      g[v.type].push(v);
    });
    return order.filter((t) => g[t]).map((t) => ({ type: t, items: g[t] }));
  }, [filteredVariables, groupByPath]);

  const activeModeId = selectedModeId || (selectedCollection?.modes[0]?.modeId ?? null);
  const layoutKey = useMemo(
    () => (selectedCollection && activeModeId ? `${selectedCollection.id}::${activeModeId}` : null),
    [selectedCollection, activeModeId],
  );

  const displayGroups = useMemo(() => {
    if (!groupByPath || !layoutKey) return grouped;
    const layout = groupLayoutByKey[layoutKey];
    if (!layout) return grouped;

    const hiddenSet = new Set(layout.hidden || []);
    const order = layout.order || [];
    const base = grouped.filter((g) => !hiddenSet.has(g.type));

    if (!order.length) {
      return base;
    }

    const indexMap = new Map(order.map((name, idx) => [name, idx]));
    return [...base].sort((a, b) => {
      const ia = indexMap.has(a.type) ? indexMap.get(a.type)! : Number.MAX_SAFE_INTEGER;
      const ib = indexMap.has(b.type) ? indexMap.get(b.type)! : Number.MAX_SAFE_INTEGER;
      if (ia !== ib) return ia - ib;
      return a.type.localeCompare(b.type);
    });
  }, [grouped, groupByPath, layoutKey, groupLayoutByKey]);

  const handleMoveGroup = useCallback((groupType: string, direction: 'up' | 'down') => {
    if (!groupByPath || !layoutKey) return;
    setGroupLayoutByKey((prev) => {
      const current = prev[layoutKey] || {
        order: grouped.map((g) => g.type),
        hidden: [],
      };
      const order = current.order && current.order.length ? [...current.order] : grouped.map((g) => g.type);
      let index = order.indexOf(groupType);
      if (index === -1) {
        order.push(groupType);
        index = order.length - 1;
      }
      const newIndex = direction === 'up' ? Math.max(0, index - 1) : Math.min(order.length - 1, index + 1);
      if (newIndex === index) return prev;
      const [item] = order.splice(index, 1);
      order.splice(newIndex, 0, item);
      return {
        ...prev,
        [layoutKey]: {
          ...current,
          order,
        },
      };
    });
  }, [groupByPath, layoutKey, grouped]);

  const handleToggleGroupVisibility = useCallback((groupType: string) => {
    if (!groupByPath || !layoutKey) return;
    setGroupLayoutByKey((prev) => {
      const current = prev[layoutKey] || {
        order: grouped.map((g) => g.type),
        hidden: [],
      };
      const hidden = new Set(current.hidden || []);
      if (hidden.has(groupType)) {
        hidden.delete(groupType);
      } else {
        hidden.add(groupType);
      }
      return {
        ...prev,
        [layoutKey]: {
          ...current,
          hidden: Array.from(hidden),
        },
      };
    });
  }, [groupByPath, layoutKey, grouped]);

  // ── Load variables from canvas ────────────────────────────────────────
  const loadVariables = useCallback(async () => {
    setIsLoadingVars(true);
    try {
      const res = await AsyncMessageChannel.ReactInstance.message({
        type: AsyncMessageTypes.EXTRACT_VARIABLES_TO_CANVAS,
      });
      const vars: FigmaVariable[] = JSON.parse(res.jsonString || '[]');
      setAllVariables(vars);
      if (res.collectionsInfo?.length) {
        setCollectionsInfo(res.collectionsInfo);
      }
      if (vars.length > 0) {
        const firstCollId = vars[0].collectionId;
        setSelectedCollectionId(firstCollId);
        const info = res.collectionsInfo?.find((c) => c.id === firstCollId);
        const firstModeId = info?.modes[0]?.modeId ?? Object.keys(vars[0].valuesByMode)[0];
        setSelectedModeId(firstModeId);
      }
    } catch (_err) {
      setStatusMsg({ type: 'error', text: 'Failed to load variables from canvas.' });
    } finally {
      setIsLoadingVars(false);
    }
  }, []);

  useEffect(() => { loadVariables(); }, [loadVariables]);

  // Update selectedModeId when collection changes
  useEffect(() => {
    if (selectedCollection && selectedCollection.modes.length > 0) {
      setSelectedModeId(selectedCollection.modes[0].modeId);
    }
  }, [selectedCollectionId, selectedCollection]);

  // Theme multi-select
  const handleToggleTheme = useCallback((id: string) => {
    setSelectedThemeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedThemeIds(themes.map((t) => t.id));
  }, [themes]);

  const handleDeselectAll = useCallback(() => setSelectedThemeIds([]), []);

  // Generate
  const handleGenerate = useCallback(async () => {
    if (selectedThemeIds.length === 0) {
      setStatusMsg({ type: 'error', text: 'Select at least one theme to generate.' });
      return;
    }
    setIsGenerating(true);
    setStatusMsg(null);
    try {
      setProgressMsg('Resolving tokens...');
      const themeData = themes
        .filter((t) => selectedThemeIds.includes(t.id))
        .map((theme) => {
          const resolved = new TokenResolver([]).setTokens(
            mergeTokenGroups(tokens, theme.selectedTokenSets, {}, activeTokenSet),
          );
          return { theme, resolvedTokens: resolved };
        });

      setProgressMsg('Generating colors...');
      await new Promise((r) => { setTimeout(r, 100); });
      setProgressMsg('Generating typography...');
      await new Promise((r) => { setTimeout(r, 100); });
      setProgressMsg('Building frames...');

      await AsyncMessageChannel.ReactInstance.message({
        type: AsyncMessageTypes.GENERATE_STYLE_GUIDE,
        themeData,
      });
      setStatusMsg({ type: 'success', text: 'Style guide generated on canvas!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Generation failed: ${err.message || 'Unknown error'}` });
    } finally {
      setIsGenerating(false);
      setProgressMsg('');
    }
  }, [selectedThemeIds, themes, tokens, activeTokenSet]);

  // Update
  const handleUpdate = useCallback(async () => {
    if (selectedThemeIds.length === 0) {
      setStatusMsg({ type: 'error', text: 'Select at least one theme to update.' });
      return;
    }
    setIsUpdating(true);
    setStatusMsg(null);
    try {
      const themeData = themes
        .filter((t) => selectedThemeIds.includes(t.id))
        .map((theme) => {
          const resolved = new TokenResolver([]).setTokens(
            mergeTokenGroups(tokens, theme.selectedTokenSets, {}, activeTokenSet),
          );
          return { theme, resolvedTokens: resolved };
        });
      await AsyncMessageChannel.ReactInstance.message({
        type: AsyncMessageTypes.UPDATE_STYLE_GUIDE,
        themeData,
      });
      setStatusMsg({ type: 'success', text: 'Style guide updated!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Update failed: ${err.message || 'Unknown error'}` });
    } finally {
      setIsUpdating(false);
    }
  }, [selectedThemeIds, themes, tokens, activeTokenSet]);

  // Download Style Dictionary JSON (the only programmatic export that works with Zeroheight)
  const handleDownloadStyleDictionary = useCallback(() => {
    try {
      // Collect all resolved tokens from selected themes
      const allResolvedTokens = themes
        .filter((t) => selectedThemeIds.includes(t.id))
        .flatMap((theme) => (
          new TokenResolver([]).setTokens(
            mergeTokenGroups(tokens, theme.selectedTokenSets, {}, activeTokenSet),
          )
        ));
      downloadStyleDictionaryJson(allResolvedTokens);
      setStatusMsg({ type: 'success', text: 'Style Dictionary JSON downloaded.' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Download failed: ${err.message}` });
    }
  }, [themes, selectedThemeIds, tokens, activeTokenSet]);

  const handleAPIKeyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch.settings.setZeroheightAPIKey(e.target.value);
  }, [dispatch.settings]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleGenerate();
  }, [handleGenerate]);

  // Generate style guide from selected collection + mode (Figma Variables)
  const [isGeneratingFromVars, setIsGeneratingFromVars] = useState(false);
  const handleGenerateFromVariables = useCallback(async () => {
    if (!selectedCollection || !activeModeId) {
      setStatusMsg({ type: 'error', text: 'Select a collection and mode first.' });
      return;
    }
    setIsGeneratingFromVars(true);
    setStatusMsg(null);
    try {
      const modeName = selectedCollection.modes.find((m) => m.modeId === activeModeId)?.name ?? activeModeId;
      const variables = filteredVariables.map((v) => ({
        id: v.id,
        name: v.name,
        type: v.type,
        collectionId: v.collectionId,
        collectionName: v.collectionName,
        resolvedValue: v.resolvedValue,
        valuesByMode: v.valuesByMode,
      }));

      let groupsConfig;
      if (groupByPath && layoutKey) {
        const layout = groupLayoutByKey[layoutKey];
        const allTypes = grouped.map((g) => g.type);
        const hidden = layout?.hidden || [];
        const visibleOrderBase = (layout?.order && layout.order.length ? layout.order : allTypes)
          .filter((t) => allTypes.includes(t) && !hidden.includes(t));
        const order = visibleOrderBase.concat(allTypes.filter((t) => !visibleOrderBase.includes(t) && !hidden.includes(t)));
        groupsConfig = {
          order,
          hidden,
        };
      }
      await AsyncMessageChannel.ReactInstance.message({
        type: AsyncMessageTypes.GENERATE_STYLE_GUIDE_FROM_VARIABLES,
        variables,
        collectionName: selectedCollection.name,
        modeName,
        modeId: activeModeId,
        groupsConfig,
      });
      setStatusMsg({ type: 'success', text: `Style guide generated for ${modeName}!` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Generation failed: ${err?.message || 'Unknown error'}` });
    } finally {
      setIsGeneratingFromVars(false);
    }
  }, [selectedCollection, activeModeId, filteredVariables]);

  // ── Download variables JSON ───────────────────────────────────────────
  const downloadJson = useCallback(() => {
    if (!allVariables.length) return;
    const data = encodeURIComponent(JSON.stringify(allVariables, null, 2));
    const a = document.createElement('a');
    a.href = `data:application/json;charset=utf-8,${data}`;
    a.download = 'variables.json';
    a.click();
  }, [allVariables]);

  return (
    <Root onKeyDown={handleKeyDown}>
      {/* ── Left: Collection Sidebar ────────────────────────────────────── */}
      <Sidebar>
        {/* Header */}
        <SidebarSection>
          <Stack direction="row" align="center" justify="between" css={{ marginBottom: '$2' }}>
            <Heading size="small" css={{ color: '$fgDefault', fontSize: '$small', fontWeight: '$bold' }}>Collections</Heading>
            <IconButton
              icon={<RefreshDouble width={ICON_SIZE.sm} height={ICON_SIZE.sm} />}
              variant="invisible"
              size="small"
              onClick={loadVariables}
              disabled={isLoadingVars}
              title="Reload variables"
              css={{ color: '$fgSubtle' }}
            />
          </Stack>
          {isLoadingVars && <Text css={{ color: '$fgSubtle', fontSize: '$xsmall' }}>Loading...</Text>}
          {!isLoadingVars && collections.length === 0 && (
            <Text css={{ color: '$fgSubtle', fontSize: '$xsmall' }}>
              No variable collections found on canvas.
            </Text>
          )}
          <Stack direction="column" gap={0}>
            {collections.map((col) => (
              <CollectionBtn
                key={col.id}
                active={selectedCollectionId === col.id}
                onClick={() => setSelectedCollectionId(col.id)}
                as="button"
              >
                <Text css={{ fontSize: '$small', color: 'inherit', fontWeight: selectedCollectionId === col.id ? '$bold' : '$regular' }}>
                  {col.name}
                </Text>
                <Text css={{ fontSize: '$xsmall', color: '$fgSubtle' }}>
                  {col.variables.length}
                  {' '}
                  vars
                </Text>
              </CollectionBtn>
            ))}
          </Stack>
        </SidebarSection>

        {/* Mode selector */}
        {selectedCollection && selectedCollection.modes.length > 0 && (
        <SidebarSection>
          <Text css={{
            color: '$fgSubtle', fontSize: '$xsmall', fontWeight: '$bold', letterSpacing: '0.08em', display: 'block', marginBottom: '$2',
          }}
          >
            MODE
          </Text>
          <Stack direction="column" gap={1}>
            {selectedCollection.modes.map((mode) => (
              <ModeBtn
                key={mode.modeId}
                active={activeModeId === mode.modeId}
                onClick={() => setSelectedModeId(mode.modeId)}
                as="button"
                css={{ width: '100%', textAlign: 'left' }}
              >
                <Text css={{ fontSize: '$xsmall', color: 'inherit' }}>
                  {mode.name || mode.modeId}
                </Text>
              </ModeBtn>
            ))}
          </Stack>
          <Button
            variant="primary"
            size="small"
            onClick={handleGenerateFromVariables}
            disabled={isGeneratingFromVars || filteredVariables.length === 0}
            css={{ width: '100%', marginTop: '$2', fontSize: '$xsmall' }}
          >
            {isGeneratingFromVars ? 'Generating...' : `Generate for ${selectedCollection.modes.find((m) => m.modeId === activeModeId)?.name || 'mode'}`}
          </Button>
        </SidebarSection>
        )}

        {/* Stats */}
        {selectedCollection && (
        <SidebarSection>
          <Stack direction="column" gap={1}>
            {(['COLOR', 'FLOAT', 'STRING', 'BOOLEAN'] as const).map((type) => {
              const count = selectedCollection.variables.filter((v) => v.type === type).length;
              if (!count) return null;
              return (
                <Stack key={type} direction="row" align="center" justify="between">
                  <Text css={{ fontSize: '$xsmall', color: '$fgMuted' }}>
                        {typeIcon(type)}
                        {' '}
                        {typeLabel(type)}
                      </Text>
                  <Text css={{ fontSize: '$xsmall', color: '$fgSubtle' }}>{count}</Text>
                </Stack>
              );
            })}
          </Stack>
        </SidebarSection>
        )}
      </Sidebar>

      {/* ── Main: Variable Viewer ─────────────────────────────────────────── */}
      <Main>
        {/* Search bar + group toggle */}
        <MainHeader>
          <Stack direction="row" align="center" gap={2} css={{ flexWrap: 'wrap' }}>
            <Search width={ICON_SIZE.sm} height={ICON_SIZE.sm} style={{ color: 'var(--colors-fgSubtle)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder={selectedCollection ? `Search in ${selectedCollection.name}...` : 'Select a collection'}
              value={searchQuery}
              onChange={handleSearchChange}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: `${CODE_FONT_SIZE}px`,
                color: 'var(--colors-fgDefault)',
              }}
            />
            {searchQuery && (
            <IconButton
              icon={<Xmark width={ICON_SIZE.xs} height={ICON_SIZE.xs} />}
              variant="invisible"
              size="small"
              onClick={() => setSearchQuery('')}
              css={{ color: '$fgSubtle' }}
            />
            )}
            <Box
              as="button"
              onClick={() => setGroupByPath((b) => !b)}
              css={{
                fontSize: '$xsmall',
                color: '$fgSubtle',
                background: 'transparent',
                border: '1px solid $borderMuted',
                borderRadius: '4px',
                padding: '2px 6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              title={groupByPath ? 'Grouped by path (e.g. Font, Color)' : 'Grouped by type (COLOR, STRING, etc.)'}
            >
              {groupByPath ? 'By path' : 'By type'}
            </Box>
            <IconButton
              icon={<Download width={ICON_SIZE.sm} height={ICON_SIZE.sm} />}
              variant="invisible"
              size="small"
              onClick={downloadJson}
              disabled={!allVariables.length}
              title="Download variables JSON"
              css={{ color: allVariables.length ? '$accentDefault' : '$fgSubtle' }}
            />
          </Stack>
        </MainHeader>

        {/* Variable content */}
        <ScrollArea>
          {!selectedCollection && (
            <Box css={{ padding: '$8', textAlign: 'center' }}>
              <Text css={{
                color: '$fgMuted', fontSize: '$small', display: 'block', marginBottom: '$1',
              }}
              >
                ← Select a collection
              </Text>
              <Text css={{ color: '$fgSubtle', fontSize: '$xsmall' }}>
                Choose a variable collection from the left panel to browse its tokens.
              </Text>
            </Box>
          )}

          {selectedCollection && filteredVariables.length === 0 && searchQuery && (
            <Box css={{ padding: '$6', textAlign: 'center' }}>
              <Text css={{ color: '$fgMuted', fontSize: '$xsmall' }}>
                No variables match
                {' '}
                &quot;
                {searchQuery}
                &quot;
              </Text>
            </Box>
          )}

          {displayGroups.map(({ type, items }) => (
            <Box key={type} css={{ marginBottom: '$5' }}>
              <GroupHeader>
                <Text css={{
                  fontSize: '$xsmall', fontWeight: '$bold', color: '$fgMuted', letterSpacing: '0.08em',
                }}
                >
                  {groupByPath ? type : `${typeIcon(type)}  ${typeLabel(type).toUpperCase()}`}
                </Text>
                <Text css={{ fontSize: '$xsmall', color: '$fgSubtle', marginLeft: 'auto' }}>
                  {items.length}
                </Text>
                {groupByPath && (
                  <Stack direction="row" gap={1} css={{ marginLeft: '$2' }}>
                    <IconButton
                      icon={<NavArrowUp width={ICON_SIZE.xs} height={ICON_SIZE.xs} />}
                      variant="invisible"
                      size="small"
                      onClick={() => handleMoveGroup(type, 'up')}
                      css={{ color: '$fgSubtle' }}
                    />
                    <IconButton
                      icon={<NavArrowDown width={ICON_SIZE.xs} height={ICON_SIZE.xs} />}
                      variant="invisible"
                      size="small"
                      onClick={() => handleMoveGroup(type, 'down')}
                      css={{ color: '$fgSubtle' }}
                    />
                    <IconButton
                      icon={<EyeClosed width={ICON_SIZE.xs} height={ICON_SIZE.xs} />}
                      variant="invisible"
                      size="small"
                      onClick={() => handleToggleGroupVisibility(type)}
                      css={{ color: '$fgSubtle' }}
                    />
                  </Stack>
                )}
              </GroupHeader>

              {type === 'COLOR' && items.map((v) => {
                const { css: swatchColor, label } = formatColor((v as any).resolvedValue);
                return (
                  <VarRow key={v.id}>
                    <ColorSwatch title={label}>
                        <Box
                            css={{
                                position: 'absolute', inset: 0, backgroundColor: swatchColor,
                              }}
                          />
                      </ColorSwatch>
                    <Box css={{ flex: 1, minWidth: 0 }}>
                        <Text css={{
                            fontSize: '$small', color: '$fgDefault', fontWeight: '$medium', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}
                          >
                            {v.name.split('/').pop()}
                          </Text>
                        <Text css={{ fontSize: '$xsmall', color: '$fgSubtle', display: 'block' }}>
                            {v.name.includes('/') ? v.name.split('/').slice(0, -1).join('/') : ''}
                          </Text>
                      </Box>
                    <Text css={{
                        fontSize: '$xsmall', color: '$fgMuted', fontFamily: '$mono', flexShrink: 0,
                      }}
                      >
                        {label}
                      </Text>
                  </VarRow>
                );
              })}

              {type === 'STRING' && items.map((v) => {
                const val = (v as any).resolvedValue;
                const display = String(val ?? '—');
                const isFont = v.name.toLowerCase().includes('font') || v.name.toLowerCase().includes('family');
                return (
                  <VarRow key={v.id}>
                    <TypographySample style={isFont ? { fontFamily: display } : {}}>
                        {isFont ? 'Aa — ' : ''}
                        {display}
                      </TypographySample>
                    <Box css={{ flex: 1, minWidth: 0, marginLeft: '$2' }}>
                        <Text css={{
                            fontSize: '$small', color: '$fgDefault', fontWeight: '$medium', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}
                          >
                            {v.name.split('/').pop()}
                          </Text>
                        <Text css={{ fontSize: '$xsmall', color: '$fgSubtle' }}>
                            {v.name.includes('/') ? v.name.split('/').slice(0, -1).join('/') : ''}
                          </Text>
                      </Box>
                  </VarRow>
                );
              })}

              {(type === 'FLOAT' || type === 'BOOLEAN') && items.map((v) => {
                const val = (v as any).resolvedValue;
                const display = formatValue(type, val);
                return (
                  <VarRow key={v.id}>
                    <Box
                        css={{
                            width: `${CONTROL_HEIGHT.md}px`,
                            height: `${CONTROL_HEIGHT.md}px`,
                            borderRadius: '4px',
                            backgroundColor: '$bgSubtle',
                            border: '1px solid $borderMuted',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            fontSize: '$xsmall',
                            color: '$fgMuted',
                            fontFamily: '$mono',
                          }}
                      >
                        {typeIcon(type)}
                      </Box>
                    <Box css={{ flex: 1, minWidth: 0 }}>
                        <Text css={{
                            fontSize: '$small', color: '$fgDefault', fontWeight: '$medium', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}
                          >
                            {v.name.split('/').pop()}
                          </Text>
                        <Text css={{ fontSize: '$xsmall', color: '$fgSubtle' }}>
                            {v.name.includes('/') ? v.name.split('/').slice(0, -1).join('/') : ''}
                          </Text>
                      </Box>
                    <Text css={{
                        fontSize: '$xsmall', color: '$fgMuted', fontFamily: '$mono', flexShrink: 0,
                      }}
                      >
                        {display}
                      </Text>
                  </VarRow>
                );
              })}
            </Box>
          ))}
        </ScrollArea>
      </Main>

      {/* ── Right: Generate Panel ─────────────────────────────────────────── */}
      <RightPanel>
        {/* Title + settings toggle */}
        <Box css={{ padding: '$3 $3 0', flexShrink: 0 }}>
          <Stack direction="row" align="center" justify="between" css={{ marginBottom: '$1' }}>
            <Heading size="small" css={{ fontSize: '$small', fontWeight: '$bold', color: '$fgDefault' }}>Style Guide</Heading>
            <IconButton
              icon={<Settings width={ICON_SIZE.md} height={ICON_SIZE.md} />}
              variant="invisible"
              size="small"
              onClick={() => setShowSettings((s) => !s)}
              css={{ color: showSettings ? '$accentDefault' : '$fgSubtle' }}
              title="Publish settings"
            />
          </Stack>
          <Text css={{ color: '$fgSubtle', fontSize: '$xsmall' }}>
            Generate a style guide on canvas from your tokens.
          </Text>
        </Box>

        {/* Settings Panel — Zeroheight */}
        {showSettings && (
        <Box css={{
          margin: '$3', padding: '$3', backgroundColor: '$bgSubtle', borderRadius: '6px', border: '1px solid $borderMuted',
        }}
        >
          <Stack direction="row" align="center" justify="between" css={{ marginBottom: '$2' }}>
            <Text css={{
              fontSize: '$xsmall', fontWeight: '$bold', color: '$fgMuted', letterSpacing: '0.06em',
            }}
            >
              EXPORT / PUBLISH
            </Text>
            <IconButton icon={<Xmark width={ICON_SIZE.xs} height={ICON_SIZE.xs} />} variant="invisible" size="small" onClick={() => setShowSettings(false)} css={{ color: '$fgSubtle' }} />
          </Stack>

          {/* Info: correct Zeroheight sync method */}
          <Box css={{
            padding: '$2', backgroundColor: '$bgDefault', borderRadius: '4px', border: '1px solid $borderMuted', marginBottom: '$3',
          }}
          >
            <Text css={{
              fontSize: '$xsmall', color: '$fgMuted', display: 'block', marginBottom: '$1', fontWeight: '$bold',
            }}
            >
              ℹ️ How to sync with Zeroheight
            </Text>
            <Text css={{ fontSize: '$xsmall', color: '$fgSubtle', lineHeight: 1.5 }}>
              The Zeroheight API cannot push variables — use their official
              {' '}
              <Box
                as="a"
                href="https://help.zeroheight.com/hc/en-us/articles/35887032233371"
                target="_blank"
                rel="noreferrer"
                css={{ color: '$accentDefault', textDecoration: 'none' }}
              >
                variables sync Figma plugin
              </Box>
              {' '}
              to push variables, then use the JSON below for Style Dictionary.
            </Text>
          </Box>

          {/* Style Dictionary JSON download — always available */}
          <Button
            variant="secondary"
            size="small"
            onClick={handleDownloadStyleDictionary}
            css={{ width: '100%', fontSize: '$xsmall', marginBottom: '$2' }}
          >
            ↓ Download Style Dictionary JSON
          </Button>

          {/* Optional: Zeroheight API token for page status reads */}
          <Box css={{ marginBottom: '$2' }}>
            <Label css={{
              fontSize: '$xsmall', color: '$fgSubtle', fontWeight: '$bold', letterSpacing: '0.06em', display: 'block', marginBottom: '$1',
            }}
            >
              ZEROHEIGHT API TOKEN (OPTIONAL)
            </Label>
            <TextInput
              type="password"
              placeholder="Enterprise Bearer token..."
              value={settings.zeroheightAPIKey || ''}
              onChange={handleAPIKeyChange}
              css={{ fontSize: '$xsmall', height: '28px', backgroundColor: '$bgDefault' }}
            />
            <Text css={{
              fontSize: '$xsmall', color: '$fgSubtle', marginTop: '$1', display: 'block',
            }}
            >
              Only needed for reading styleguide page statuses (Enterprise plan).
            </Text>
          </Box>
        </Box>
        )}

        {/* Status message */}
        {statusMsg && (
        <Box css={{ padding: '0 $3' }}>
          <StatusBanner type={statusMsg.type}>
            {statusMsg.type === 'error' && <Xmark width={ICON_SIZE.sm} height={ICON_SIZE.sm} />}
            {statusMsg.type === 'success' && <Check width={ICON_SIZE.sm} height={ICON_SIZE.sm} />}
            <Text css={{ fontSize: '$xsmall', color: 'inherit', flex: 1 }}>{statusMsg.text}</Text>
            <IconButton icon={<Xmark width={ICON_SIZE.xs} height={ICON_SIZE.xs} />} variant="invisible" size="small" onClick={() => setStatusMsg(null)} css={{ color: 'inherit', flexShrink: 0 }} />
          </StatusBanner>
        </Box>
        )}

        {/* Progress */}
        {(isGenerating || isUpdating) && progressMsg && (
        <Box css={{ padding: '0 $3 $2' }}>
          <Text css={{ color: '$fgSubtle', fontSize: '$xsmall', fontStyle: 'italic' }}>{progressMsg}</Text>
        </Box>
        )}

        <Box css={{ padding: '$3', borderBottom: '1px solid $borderMuted', flexShrink: 0 }}>
          {/* Themes section */}
          <Stack direction="row" align="center" justify="between" css={{ marginBottom: '$2' }}>
            <Text css={{
              fontSize: '$xsmall', fontWeight: '$bold', color: '$fgMuted', letterSpacing: '0.06em',
            }}
            >
              THEMES
            </Text>
            <Stack direction="row" gap={2}>
              <Box
                as="button"
                css={{
                  fontSize: '$xsmall', color: '$accentDefault', cursor: 'pointer', border: 'none', background: 'none', padding: 0,
                }}
                onClick={handleSelectAll}
              >
                All
              </Box>
              <Text css={{ fontSize: '$xsmall', color: '$fgSubtle' }}>·</Text>
              <Box
                as="button"
                css={{
                  fontSize: '$xsmall', color: '$fgSubtle', cursor: 'pointer', border: 'none', background: 'none', padding: 0,
                }}
                onClick={handleDeselectAll}
              >
                None
              </Box>
            </Stack>
          </Stack>

          {themes.length === 0 && (
            <Box css={{
              padding: '$3', backgroundColor: '$bgSubtle', borderRadius: '4px', border: '1px solid $borderMuted',
            }}
            >
              <Text css={{ color: '$fgSubtle', fontSize: '$xsmall' }}>
                No themes found. Create themes in the Themes tab first.
              </Text>
            </Box>
          )}

          <Stack direction="column" gap={1}>
            {themes.map((theme) => {
              const isSelected = selectedThemeIds.includes(theme.id);
              return (
                <Stack
                  key={theme.id}
                  direction="row"
                  align="center"
                  gap={2}
                  css={{
                    padding: '$2',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: '$bgSubtle' },
                  }}
                  onClick={() => handleToggleTheme(theme.id)}
                >
                  <Box
                    css={{
                        width: `${ICON_SIZE.md}px`,
                        height: '14px',
                        borderRadius: '3px',
                        border: '1px solid $borderMuted',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isSelected ? '$accentDefault' : 'transparent',
                      }}
                  >
                    {isSelected && <Check width={ICON_SIZE.xs} height={ICON_SIZE.xs} style={{ color: 'var(--colors-fgOnEmphasis)' }} />}
                  </Box>
                  <Text css={{ fontSize: '$small', color: '$fgDefault' }}>{theme.name}</Text>
                </Stack>
              );
            })}
          </Stack>
        </Box>

        {/* Action buttons */}
        <Box css={{ padding: '$3', flexShrink: 0 }}>
          <Stack direction="column" gap={2}>
            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={isGenerating || selectedThemeIds.length === 0}
              css={{ width: '100%', fontSize: '$small' }}
            >
              {isGenerating
                ? progressMsg || 'Generating...'
                : `Generate${selectedThemeIds.length > 0 ? ` (${selectedThemeIds.length})` : ''}`}
            </Button>
            <Button
              variant="secondary"
              onClick={handleUpdate}
              disabled={isUpdating || isGenerating || selectedThemeIds.length === 0}
              css={{ width: '100%', fontSize: '$small' }}
            >
              {isUpdating ? 'Updating...' : 'Update Existing'}
            </Button>
          </Stack>
          <Text css={{
            color: '$fgSubtle', fontSize: '$xsmall', marginTop: '$2', display: 'block', textAlign: 'center',
          }}
          >
            Press Enter to generate
          </Text>
        </Box>
      </RightPanel>
    </Root>
  );
}
