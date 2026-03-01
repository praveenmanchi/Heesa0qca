import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  Box, Stack, Button, EmptyState, IconButton,
} from '@tokens-studio/ui';
import {
  ArrowUpIcon, ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon,
  ComponentInstanceIcon, TokensIcon, TextIcon, GroupIcon,
} from '@radix-ui/react-icons';
import { IconSpacing } from '@/icons';
import { Dispatch } from '../store';
import useTokens from '../store/useTokens';
import InspectorTokenGroup from './InspectorTokenGroup';
import { SingleToken } from '@/types/tokens';
import { inspectStateSelector, uiStateSelector } from '@/selectors';
import { AsyncMessageTypes } from '@/types/AsyncMessages';
import { AsyncMessageChannel } from '@/AsyncMessageChannel';
import { isEqual } from '@/utils/isEqual';
import { TokenTypes } from '@/constants/TokenTypes';
import { Properties } from '@/constants/Properties';
import { SelectionGroup } from '@/types';
import { NodeInfo } from '@/types/NodeInfo';
import { StyleIdBackupKeys } from '@/constants/StyleIdBackupKeys';
import BulkRemapModal from './modals/BulkRemapModal';
import createAnnotation from './createAnnotation';
import { Direction } from '@/constants/Direction';

/** Map property to filter category */
function getPropertyCategory(cat: string): 'color' | 'typography' | 'spacing' | 'other' {
  const c = (cat || '').toLowerCase();
  if (['fill', 'border', 'borderColor', 'boxShadow', 'opacity'].some((p) => c.includes(p))) return 'color';
  if (['font', 'typography', 'text', 'letter', 'paragraph', 'lineheight'].some((p) => c.includes(p))) return 'typography';
  if (['spacing', 'padding', 'margin', 'gap', 'sizing', 'width', 'height', 'dimension'].some((p) => c.includes(p))) return 'spacing';
  return 'other';
}

type TypeFilter = 'all' | 'color' | 'typography' | 'spacing' | 'other';
type ModeFilter = 'all' | 'modeDependent';

export default function InspectorMultiView({ resolvedTokens, tokenToSearch, selectedMode }: { resolvedTokens: SingleToken[], tokenToSearch: string, selectedMode: string }) {
  const { t } = useTranslation(['inspect']);

  const inspectState = useSelector(inspectStateSelector, isEqual);
  const uiState = useSelector(uiStateSelector, isEqual);
  const { removeTokensByValue } = useTokens();
  const [bulkRemapModalVisible, setShowBulkRemapModalVisible] = React.useState(false);
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>('all');
  const [modeFilter, setModeFilter] = React.useState<ModeFilter>('all');
  const [selectPattern, setSelectPattern] = React.useState('');
  const dispatch = useDispatch<Dispatch>();

  React.useEffect(() => {
    if (tokenToSearch) {
      AsyncMessageChannel.ReactInstance.message({
        type: AsyncMessageTypes.SEARCH_VARIABLE_USAGE,
        query: tokenToSearch,
      });
    }
  }, [uiState.variableUsageReloadTrigger, tokenToSearch]);

  React.useEffect(() => {
    dispatch.inspectState.setSelectedTokens([]);
  }, [uiState.selectionValues]);

  const filteredSelectionValues = React.useMemo(() => {
    let result = uiState.selectionValues;
    if (!inspectState.isShowBrokenReferences) {
      result = result.filter((token) => resolvedTokens.find((resolvedToken) => resolvedToken.name === token.value) || token.resolvedValue);
    }
    if (!inspectState.isShowResolvedReferences) {
      result = result.filter((token) => (!resolvedTokens.find((resolvedToken) => resolvedToken.name === token.value) && !token.resolvedValue));
    }
    if (tokenToSearch) {
      result = result.filter((token) => token.value.toLowerCase().includes(tokenToSearch.toLowerCase()));
    }
    if (modeFilter === 'modeDependent') {
      result = result.filter((token) => token.modes && Object.keys(token.modes).length > 1);
    }
    if (typeFilter !== 'all') {
      result = result.filter((token) => getPropertyCategory(token.category) === typeFilter);
    }
    return result;
  }, [uiState.selectionValues, inspectState.isShowBrokenReferences, inspectState.isShowResolvedReferences, resolvedTokens, tokenToSearch, modeFilter, typeFilter]);

  const groupedSelectionValues = React.useMemo(() => {
    const grouped = filteredSelectionValues.reduce<Partial<
      Record<TokenTypes, SelectionGroup[]>
      & Record<Properties, SelectionGroup[]>
    >>((acc, curr) => {
      if (StyleIdBackupKeys.includes(curr.type)) return acc;
      if (acc[curr.category]) {
        const sameValueIndex = acc[curr.category]!.findIndex((v) => v.value === curr.value);

        if (sameValueIndex > -1) {
          acc[curr.category]![sameValueIndex].nodes.push(...curr.nodes);
        } else {
          acc[curr.category] = [...acc[curr.category]!, curr];
        }
      } else {
        acc[curr.category] = [curr];
      }

      return acc;
    }, {});

    // Sort each category by usage (nodes.length) descending
    Object.keys(grouped).forEach((key) => {
      const arr = grouped[key as Properties];
      if (arr && arr.length >= 1) {
        arr.sort((a, b) => b.nodes.length - a.nodes.length);
      }
    });

    return grouped;
  }, [filteredSelectionValues]);

  const removeTokens = React.useCallback(() => {
    const valuesToRemove = uiState.selectionValues
      .filter((v) => inspectState.selectedTokens.includes(`${v.category} -${v.value} `))
      .map((v) => ({ nodes: v.nodes, property: v.type })) as ({
        property: Properties;
        nodes: NodeInfo[];
      }[]);

    removeTokensByValue(valuesToRemove);
  }, [inspectState.selectedTokens, removeTokensByValue, uiState.selectionValues]);

  const handleSelectAll = React.useCallback(() => {
    dispatch.inspectState.setSelectedTokens(
      inspectState.selectedTokens.length === filteredSelectionValues.length
        ? []
        : filteredSelectionValues.map((v) => `${v.category} -${v.value} `),
    );
  }, [dispatch.inspectState, inspectState.selectedTokens.length, filteredSelectionValues]);

  const handleSelectByPattern = React.useCallback(() => {
    if (!selectPattern.trim()) return;
    const pattern = selectPattern.trim().toLowerCase();
    const isWildcard = pattern.includes('*');
    const regex = isWildcard
      ? new RegExp(`^ ${pattern.replace(/\*/g, '.*')} $`, 'i')
      : null;
    const matches = filteredSelectionValues.filter((v) => {
      const val = v.value.toLowerCase();
      if (regex) return regex.test(val);
      return val.includes(pattern);
    });
    dispatch.inspectState.setSelectedTokens(matches.map((v) => `${v.category} -${v.value} `));
  }, [selectPattern, filteredSelectionValues, dispatch.inspectState]);

  const handleShowBulkRemap = React.useCallback(() => {
    setShowBulkRemapModalVisible(true);
  }, []);

  const handleHideBulkRemap = React.useCallback(() => {
    setShowBulkRemapModalVisible(false);
  }, []);

  const handleAnnotate = React.useCallback((direction: Direction = Direction.LEFT) => {
    createAnnotation(uiState.mainNodeSelectionValues, direction);
  }, [uiState.mainNodeSelectionValues]);

  // ── Computed summary values ──────────────────────────────────────
  const uniqueVarCount = filteredSelectionValues.length;
  const totalUseCount = filteredSelectionValues.reduce((sum, v) => sum + v.nodes.length, 0);
  const groupCount = Object.keys(groupedSelectionValues).length;

  const totalCompCount = React.useMemo(() => new Set(
    filteredSelectionValues.flatMap((v) => v.nodes.map((n) => n.componentName ?? n.id)),
  ).size, [filteredSelectionValues]);

  // Per-category unique component counts (Set<string> per category)
  const categoryComponentCounts = React.useMemo(() => {
    const catMap: Record<string, Set<string>> = {};
    Object.entries(groupedSelectionValues).forEach(([key, tokens]) => {
      const cat = getPropertyCategory(key);
      if (!catMap[cat]) catMap[cat] = new Set();
      tokens!.forEach((tok) => {
        tok.nodes.forEach((n) => catMap[cat].add(n.componentName ?? n.id));
      });
    });
    return catMap;
  }, [groupedSelectionValues]);

  const hasSearchNoResults = tokenToSearch && uiState.selectionValues.length > 0 && filteredSelectionValues.length === 0;

  // ── Local FilterPill helper ──────────────────────────────────────
  const FilterPill = ({
    active, accent = false, onClick, children,
  }: {
    active: boolean; accent?: boolean; onClick: () => void; children: React.ReactNode;
  }) => (
    <Box
      as="button"
      onClick={onClick}
      css={{
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
        padding: '$1 $2',
        fontSize: '$label',
        border: '1px solid',
        borderRadius: '$small',
        cursor: 'pointer',
        lineHeight: 1,
        background: active ? (accent ? '$accentMuted' : '$accentDefault') : 'transparent',
        color: active ? (accent ? '$accentDefault' : '$fgOnEmphasis') : '$fgMuted',
        borderColor: active ? '$accentDefault' : '$borderMuted',
        '&:hover': { borderColor: '$accentDefault' },
      }}
    >
      {children}
    </Box>
  );

  return (
    <>
      {/* Sticky header with selection summary and filters */}
      {uiState.selectionValues.length > 0 && (
        <Box
          css={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            backgroundColor: '$bgDefault',
            borderBottom: '1px solid $borderMuted',
            padding: '$3 $4',
            display: 'flex',
            flexDirection: 'column',
            gap: '$2',
          }}
        >
          {/* ── Row 1: Stat chips ── */}
          <Box css={{
            display: 'flex', alignItems: 'center', gap: '$4', flexWrap: 'wrap',
          }}
          >
            {/* Variables */}
            <Box css={{ display: 'flex', alignItems: 'center', gap: '4px', color: '$fgMuted', fontSize: '$bodyXs' }}>
              <TokensIcon width={12} height={12} />
              <Box as="strong" css={{ color: '$fgDefault' }}>{uniqueVarCount}</Box>
              <span>variables</span>
            </Box>
            {/* Components */}
            <Box css={{ display: 'flex', alignItems: 'center', gap: '4px', color: '$fgMuted', fontSize: '$bodyXs' }}>
              <ComponentInstanceIcon width={12} height={12} />
              <Box as="strong" css={{ color: '$fgDefault' }}>{totalCompCount}</Box>
              <span>components</span>
            </Box>
            {/* Groups */}
            <Box css={{ display: 'flex', alignItems: 'center', gap: '4px', color: '$fgMuted', fontSize: '$bodyXs' }}>
              <GroupIcon width={12} height={12} />
              <Box as="strong" css={{ color: '$fgDefault' }}>{groupCount}</Box>
              <span>groups</span>
            </Box>
            {/* Uses */}
            <Box css={{ display: 'flex', alignItems: 'center', gap: '4px', color: '$fgMuted', fontSize: '$bodyXs' }}>
              <Box as="strong" css={{ color: '$fgDefault' }}>{totalUseCount}</Box>
              <span>uses</span>
            </Box>
          </Box>

          {/* ── Row 2: Category breakdown chips ── */}
          {(categoryComponentCounts.color?.size > 0
            || categoryComponentCounts.typography?.size > 0
            || categoryComponentCounts.spacing?.size > 0) && (
            <Box css={{ display: 'flex', alignItems: 'center', gap: '$2', flexWrap: 'wrap' }}>
              {categoryComponentCounts.color?.size > 0 && (
                <Box css={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '2px $2', border: '1px solid $borderMuted', borderRadius: '$small',
                  fontSize: '$label', color: '$fgMuted',
                }}
                >
                  <Box css={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #f87171 0%, #60a5fa 50%, #34d399 100%)',
                  }}
                  />
                  {`Colors: ${categoryComponentCounts.color.size} ${categoryComponentCounts.color.size === 1 ? 'comp' : 'comps'}`}
                </Box>
              )}
              {categoryComponentCounts.typography?.size > 0 && (
                <Box css={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '2px $2', border: '1px solid $borderMuted', borderRadius: '$small',
                  fontSize: '$label', color: '$fgMuted',
                }}
                >
                  <TextIcon width={10} height={10} />
                  {`Typography: ${categoryComponentCounts.typography.size} ${categoryComponentCounts.typography.size === 1 ? 'comp' : 'comps'}`}
                </Box>
              )}
              {categoryComponentCounts.spacing?.size > 0 && (
                <Box css={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '2px $2', border: '1px solid $borderMuted', borderRadius: '$small',
                  fontSize: '$label', color: '$fgMuted',
                }}
                >
                  <IconSpacing style={{ width: 10, height: 10 }} />
                  {`Spacing: ${categoryComponentCounts.spacing.size} ${categoryComponentCounts.spacing.size === 1 ? 'comp' : 'comps'}`}
                </Box>
              )}
            </Box>
          )}

          {/* ── Row 3: Filter pills ── */}
          <Box css={{ display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center' }}>
            <FilterPill
              active={typeFilter === 'all' && modeFilter === 'all'}
              onClick={() => { setTypeFilter('all'); setModeFilter('all'); }}
            >
              All
            </FilterPill>

            <FilterPill active={typeFilter === 'color'} onClick={() => setTypeFilter('color')}>
              <Box css={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #f87171, #60a5fa, #34d399)',
              }}
              />
              Color
            </FilterPill>

            <FilterPill active={typeFilter === 'typography'} onClick={() => setTypeFilter('typography')}>
              <TextIcon width={10} height={10} />
              Typography
            </FilterPill>

            <FilterPill active={typeFilter === 'spacing'} onClick={() => setTypeFilter('spacing')}>
              <IconSpacing style={{ width: 10, height: 10 }} />
              Spacing
            </FilterPill>

            <FilterPill active={typeFilter === 'other'} onClick={() => setTypeFilter('other')}>
              Other
            </FilterPill>

            {/* Divider */}
            <Box css={{ width: '1px', height: 14, background: '$borderMuted', margin: '0 2px', flexShrink: 0 }} />

            <FilterPill
              accent
              active={modeFilter === 'modeDependent'}
              onClick={() => setModeFilter((m) => (m === 'all' ? 'modeDependent' : 'all'))}
            >
              Mode-dep
            </FilterPill>
          </Box>

          {/* ── Row 4: Annotate direct icon buttons (single layer only) ── */}
          {uiState.selectedLayers === 1 && (
            <Box css={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <Box css={{ fontSize: '$label', color: '$fgMuted', marginRight: '$1' }}>Annotate:</Box>
              <IconButton
                size="small"
                variant="secondary"
                icon={<ArrowUpIcon />}
                tooltip="Annotate Top"
                onClick={() => handleAnnotate(Direction.TOP)}
              />
              <IconButton
                size="small"
                variant="secondary"
                icon={<ArrowRightIcon />}
                tooltip="Annotate Right"
                onClick={() => handleAnnotate(Direction.RIGHT)}
              />
              <IconButton
                size="small"
                variant="secondary"
                icon={<ArrowDownIcon />}
                tooltip="Annotate Bottom"
                onClick={() => handleAnnotate(Direction.BOTTOM)}
              />
              <IconButton
                size="small"
                variant="secondary"
                icon={<ArrowLeftIcon />}
                tooltip="Annotate Left"
                onClick={() => handleAnnotate(Direction.LEFT)}
              />
            </Box>
          )}
        </Box>
      )}

      <Box
        css={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          padding: '$4',
          overflowY: 'auto',
        }}
        className="content scroll-container"
      >
        {hasSearchNoResults ? (
          <Stack direction="column" gap={4} css={{ padding: '$5', margin: 'auto' }}>
            <EmptyState
              title="No variables match your search"
              description={`No variables found matching "${tokenToSearch}".Try a different search term or clear the search.`}
            />
          </Stack>
        ) : uiState.selectionValues.length > 0 ? (
          <Box css={{ display: 'flex', flexDirection: 'column', gap: '$1' }}>
            {Object.entries(groupedSelectionValues).map((group) => (
              <InspectorTokenGroup
                key={`inspect - group - ${group[0]} `}
                group={group as [Properties, SelectionGroup[]]}
                resolvedTokens={resolvedTokens}
                selectedMode={selectedMode}
                defaultCollapsed={Object.keys(groupedSelectionValues).length > 5}
              />
            ))}
          </Box>
        ) : (
          <Stack direction="column" gap={4} css={{ padding: '$5', margin: 'auto' }}>
            <EmptyState
              title={uiState.selectedLayers > 0 ? t('noTokensFound') : t('noLayersSelected')}
              description={uiState.selectedLayers > 0 ? t('noLayersWithTokens') : 'Select a layer in Figma to view its applied tokens here.'}
            />
          </Stack>
        )}
      </Box>
      {bulkRemapModalVisible && (
        <BulkRemapModal
          isOpen={bulkRemapModalVisible}
          onClose={handleHideBulkRemap}
        />
      )}
    </>
  );
}
