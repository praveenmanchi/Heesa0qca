import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  Box, Checkbox, Label, Stack, Button, EmptyState, DropdownMenu, Link, TextInput, IconButton,
} from '@tokens-studio/ui';
import {
  ArrowUpIcon, ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, ChevronDownIcon,
} from '@radix-ui/react-icons';
import { Download } from 'iconoir-react';
import { Dispatch } from '../store';
import useTokens from '../store/useTokens';
import InspectorTokenGroup from './InspectorTokenGroup';
import { SingleToken } from '@/types/tokens';
import { inspectStateSelector, uiStateSelector, settingsStateSelector } from '@/selectors';
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
  const settings = useSelector(settingsStateSelector, isEqual);
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
      .filter((v) => inspectState.selectedTokens.includes(`${v.category}-${v.value}`))
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
        : filteredSelectionValues.map((v) => `${v.category}-${v.value}`),
    );
  }, [dispatch.inspectState, inspectState.selectedTokens.length, filteredSelectionValues]);

  const handleSelectByPattern = React.useCallback(() => {
    if (!selectPattern.trim()) return;
    const pattern = selectPattern.trim().toLowerCase();
    const isWildcard = pattern.includes('*');
    const regex = isWildcard
      ? new RegExp(`^${pattern.replace(/\*/g, '.*')}$`, 'i')
      : null;
    const matches = filteredSelectionValues.filter((v) => {
      const val = v.value.toLowerCase();
      if (regex) return regex.test(val);
      return val.includes(pattern);
    });
    dispatch.inspectState.setSelectedTokens(matches.map((v) => `${v.category}-${v.value}`));
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

  const handleExportSelection = React.useCallback(() => {
    const lines: string[] = [
      `# Inspector Export - ${new Date().toISOString().slice(0, 10)}`,
      '',
      '## Summary',
      `- ${filteredSelectionValues.length} variables across ${Object.keys(groupedSelectionValues).length} property groups`,
      `- ${uiState.selectedLayers} layer${uiState.selectedLayers !== 1 ? 's' : ''} selected`,
      '',
      '## Variables',
      '',
    ];
    Object.entries(groupedSelectionValues).forEach(([groupKey, tokens]) => {
      lines.push(`### ${groupKey}`);
      tokens!.forEach((tok) => {
        const compCount = new Set(tok.nodes.map((n) => n.componentName ?? '(Unstyled)')).size;
        lines.push(`- ${tok.value} (${tok.nodes.length} uses, ${compCount} components)`);
      });
      lines.push('');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inspector-export-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [filteredSelectionValues, groupedSelectionValues, uiState.selectedLayers]);

  const handleToggleDeepInspect = React.useCallback(() => {
    dispatch.settings.setInspectDeep(!settings.inspectDeep);
  }, [dispatch.settings, settings.inspectDeep]);

  // Keyboard: Escape clears search (handled by parent), Cmd/Ctrl+E exports
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        if (filteredSelectionValues.length > 0) handleExportSelection();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [filteredSelectionValues.length, handleExportSelection]);

  const uniqueVarCount = filteredSelectionValues.length;
  const totalUseCount = filteredSelectionValues.reduce((sum, v) => sum + v.nodes.length, 0);
  const sharedCount = filteredSelectionValues.filter((v) => {
    const comps = new Set(v.nodes.map((n) => n.componentName ?? '(Unstyled)'));
    return comps.size >= 2;
  }).length;

  const hasSearchNoResults = tokenToSearch && uiState.selectionValues.length > 0 && filteredSelectionValues.length === 0;

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
            gap: '$3',
          }}
        >
          {/* Selection summary */}
          <Box css={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '$2',
          }}
          >
            <Box css={{ fontSize: '$bodyXs', color: '$fgMuted' }}>
              <strong>{uniqueVarCount}</strong>
              {' '}
              variable
              {uniqueVarCount !== 1 ? 's' : ''}
              {' '}
              across
              {' '}
              <strong>{Object.keys(groupedSelectionValues).length}</strong>
              {' '}
              groups
              {' · '}
              <strong>{totalUseCount}</strong>
              {' '}
              total uses
              {sharedCount > 0 && (
                <>
                  {' · '}
                  <strong>{sharedCount}</strong>
                  {' '}
                  shared
                </>
              )}
            </Box>
            <Box css={{
              display: 'flex', alignItems: 'center', gap: '$2', flexWrap: 'wrap',
            }}
            >
              <Button size="small" variant="secondary" onClick={handleToggleDeepInspect} css={{ fontSize: '$label' }}>
                {settings.inspectDeep ? '✓ Deep Inspect' : 'Deep Inspect'}
              </Button>
              <IconButton icon={<Download width={14} height={14} />} size="small" variant="invisible" onClick={handleExportSelection} title="Export (⌘E)" />
            </Box>
          </Box>

          {/* Filters row */}
          <Box css={{
            display: 'flex', flexWrap: 'wrap', gap: '$2', alignItems: 'center',
          }}
          >
            <Box css={{ display: 'flex', gap: '2px' }}>
              {(['all', 'color', 'typography', 'spacing', 'other'] as TypeFilter[]).map((f) => (
                <Box
                  key={f}
                  as="button"
                  onClick={() => setTypeFilter(f)}
                  css={{
                    padding: '$1 $2',
                    fontSize: '$label',
                    border: '1px solid',
                    borderRadius: '$small',
                    cursor: 'pointer',
                    background: typeFilter === f ? '$accentDefault' : 'transparent',
                    color: typeFilter === f ? '$fgOnEmphasis' : '$fgMuted',
                    borderColor: typeFilter === f ? '$accentDefault' : '$borderMuted',
                    textTransform: 'capitalize',
                    '&:hover': { borderColor: '$accentDefault' },
                  }}
                >
                  {f}
                </Box>
              ))}
            </Box>
            <Box
              as="button"
              onClick={() => setModeFilter((m) => (m === 'all' ? 'modeDependent' : 'all'))}
              css={{
                padding: '$1 $2',
                fontSize: '$label',
                border: '1px solid',
                borderRadius: '$small',
                cursor: 'pointer',
                background: modeFilter === 'modeDependent' ? '$accentMuted' : 'transparent',
                color: modeFilter === 'modeDependent' ? '$accentDefault' : '$fgMuted',
                borderColor: modeFilter === 'modeDependent' ? '$accentDefault' : '$borderMuted',
                '&:hover': { borderColor: '$accentDefault' },
              }}
            >
              Mode-dependent only
            </Box>
          </Box>

          {/* Select all + Select by pattern + Bulk actions */}
          <Box css={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '$3',
          }}
          >
            <Box css={{
              display: 'flex', alignItems: 'center', gap: '$3', flexWrap: 'wrap',
            }}
            >
              <Checkbox
                checked={inspectState.selectedTokens.length === filteredSelectionValues.length && filteredSelectionValues.length > 0}
                id="selectAll"
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="selectAll" css={{ fontSize: '$small', fontWeight: '$sansBold', whiteSpace: 'nowrap' }}>
                {t('selectAll')}
              </Label>
              <Box css={{ display: 'flex', alignItems: 'center', gap: '$1' }}>
                <TextInput
                  value={selectPattern}
                  onChange={(e) => setSelectPattern(e.target.value)}
                  placeholder="Select by pattern (e.g. *button*)"
                  css={{ width: '180px', fontSize: '$label', height: '24px' }}
                />
                <Button size="small" variant="secondary" onClick={handleSelectByPattern} disabled={!selectPattern.trim()}>
                  Select
                </Button>
              </Box>
            </Box>
            <Box css={{ display: 'flex', gap: '$2' }}>
              <Button size="small" onClick={handleShowBulkRemap} variant="secondary">
                {t('bulkRemap')}
              </Button>
              {uiState.selectedLayers === 1 && (
                <Box css={{ display: 'flex' }}>
                  <Button size="small" onClick={() => handleAnnotate(Direction.LEFT)} variant="secondary" css={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}>
                    {t('annotate')}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenu.Trigger asChild>
                      <Button
                        size="small"
                        variant="secondary"
                        css={{
                          borderTopLeftRadius: 0, borderBottomLeftRadius: 0, paddingLeft: '$2', paddingRight: '$2',
                        }}
                      >
                        <ChevronDownIcon />
                      </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content>
                        <DropdownMenu.Item onSelect={() => handleAnnotate(Direction.TOP)}>
                          <ArrowUpIcon />
                          {' '}
                          Top
                        </DropdownMenu.Item>
                        <DropdownMenu.Item onSelect={() => handleAnnotate(Direction.RIGHT)}>
                          <ArrowRightIcon />
                          {' '}
                          Right
                        </DropdownMenu.Item>
                        <DropdownMenu.Item onSelect={() => handleAnnotate(Direction.BOTTOM)}>
                          <ArrowDownIcon />
                          {' '}
                          Bottom
                        </DropdownMenu.Item>
                        <DropdownMenu.Item onSelect={() => handleAnnotate(Direction.LEFT)}>
                          <ArrowLeftIcon />
                          {' '}
                          Left
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu>
                </Box>
              )}
              <Button size="small" onClick={removeTokens} disabled={inspectState.selectedTokens.length === 0} variant="danger">
                {t('removeSelected')}
              </Button>
            </Box>
          </Box>
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
              description={`No variables found matching "${tokenToSearch}". Try a different search term or clear the search.`}
            />
            {/* Help link removed per request */}
          </Stack>
        ) : uiState.selectionValues.length > 0 ? (
          <Box css={{ display: 'flex', flexDirection: 'column', gap: '$1' }}>
            {Object.entries(groupedSelectionValues).map((group) => (
              <InspectorTokenGroup
                key={`inspect-group-${group[0]}`}
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
            {/* Help link removed per request */}
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
