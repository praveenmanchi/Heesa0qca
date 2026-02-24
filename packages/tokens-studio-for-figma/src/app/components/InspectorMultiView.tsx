import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  Box, Checkbox, Label, Stack, Button, EmptyState, DropdownMenu, Link
} from '@tokens-studio/ui';
import { ArrowUpIcon, ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, ChevronDownIcon } from '@radix-ui/react-icons';
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
import OnboardingExplainer from './OnboardingExplainer';
import BulkRemapModal from './modals/BulkRemapModal';
import createAnnotation from './createAnnotation';
import { Direction } from '@/constants/Direction';

export default function InspectorMultiView({ resolvedTokens, tokenToSearch, selectedMode }: { resolvedTokens: SingleToken[], tokenToSearch: string, selectedMode: string }) {
  const { t } = useTranslation(['inspect']);

  const onboardingData = {
    title: 'Inspect',
    text: 'Select a layer to see which design tokens and variables are applied to it. Use Deep Inspect to scan all children of the selected layer.',
  };

  const inspectState = useSelector(inspectStateSelector, isEqual);
  const uiState = useSelector(uiStateSelector, isEqual);
  const { removeTokensByValue, setNoneValuesOnNode } = useTokens();
  const [bulkRemapModalVisible, setShowBulkRemapModalVisible] = React.useState(false);
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
    return tokenToSearch ? result.filter((token) => token.value.includes(tokenToSearch)) : result;
  }, [uiState.selectionValues, inspectState.isShowBrokenReferences, inspectState.isShowResolvedReferences, resolvedTokens, tokenToSearch]);

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
      if (arr && arr.length > 1) {
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

  const closeOnboarding = React.useCallback(() => {
    dispatch.uiState.setOnboardingExplainerInspect(false);
  }, [dispatch]);

  const setNoneValues = React.useCallback(() => {
    setNoneValuesOnNode(resolvedTokens);
  }, [setNoneValuesOnNode, resolvedTokens]);

  const handleShowBulkRemap = React.useCallback(() => {
    setShowBulkRemapModalVisible(true);
  }, []);

  const handleHideBulkRemap = React.useCallback(() => {
    setShowBulkRemapModalVisible(false);
  }, []);

  const handleAnnotate = React.useCallback((direction: Direction = Direction.LEFT) => {
    createAnnotation(uiState.mainNodeSelectionValues, direction);
  }, [uiState.mainNodeSelectionValues]);

  return (
    <>
      {uiState.selectionValues.length > 0 && (
        <Box css={{
          display: 'inline-flex', paddingInline: '$4', rowGap: '$3', justifyContent: 'space-between',
        }}
        >
          <Box css={{
            display: 'flex', alignItems: 'center', gap: '$3', fontSize: '$small', flexBasis: '80px', flexShrink: 0,
          }}
          >
            <Checkbox
              checked={inspectState.selectedTokens.length === uiState.selectionValues.length}
              id="selectAll"
              onCheckedChange={handleSelectAll}
            />
            <Label htmlFor="selectAll" css={{ fontSize: '$small', fontWeight: '$sansBold', whiteSpace: 'nowrap' }}>
              {t('selectAll')}
            </Label>
          </Box>
          <Box css={{
            display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '$3',
          }}
          >
            {/* <Button size="small" onClick={handleShowBulkRemap} variant="secondary">
              {t('bulkRemap')}
            </Button> */}
            {uiState.selectedLayers === 1 && (
              <Box css={{ display: 'flex' }}>
                <Button size="small" onClick={() => handleAnnotate(Direction.LEFT)} variant="secondary" css={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}>
                  {t('annotate')}
                </Button>
                <DropdownMenu>
                  <DropdownMenu.Trigger asChild>
                    <Button size="small" variant="secondary" css={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, paddingLeft: '$2', paddingRight: '$2' }}>
                      <ChevronDownIcon />
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content>
                      <DropdownMenu.Item onSelect={() => handleAnnotate(Direction.TOP)}><ArrowUpIcon /> Top</DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => handleAnnotate(Direction.RIGHT)}><ArrowRightIcon /> Right</DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => handleAnnotate(Direction.BOTTOM)}><ArrowDownIcon /> Bottom</DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => handleAnnotate(Direction.LEFT)}><ArrowLeftIcon /> Left</DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu>
              </Box>
            )}
            {/* <Button size="small" onClick={setNoneValues} disabled={inspectState.selectedTokens.length === 0} variant="secondary">
              {t('setToNone')}
            </Button> */}
            <Button size="small" onClick={removeTokens} disabled={inspectState.selectedTokens.length === 0} variant="danger">
              {t('removeSelected')}
            </Button>
          </Box>
        </Box>
      )}
      <Box
        css={{
          display: 'flex', flexDirection: 'column', flexGrow: 1, padding: '$4',
        }}
        className="content scroll-container"
      >
        {uiState.selectionValues.length > 0 ? (
          <Box css={{ display: 'flex', flexDirection: 'column', gap: '$1' }}>
            {Object.entries(groupedSelectionValues).map((group) => <InspectorTokenGroup key={`inspect-group-${group[0]}`} group={group as [Properties, SelectionGroup[]]} resolvedTokens={resolvedTokens} selectedMode={selectedMode} />)}
          </Box>
        ) : (
          <Stack direction="column" gap={4} css={{ padding: '$5', margin: 'auto' }}>
            <EmptyState title={uiState.selectedLayers > 0 ? t('noTokensFound') : t('noLayersSelected')} description={uiState.selectedLayers > 0 ? t('noLayersWithTokens') : t('selectLayer')} />
            <Box css={{ textAlign: 'center', marginTop: '$2' }}>
              <Link href="https://docs.tokens.studio/inspect/basic-usage?ref=plugin_inspector_empty" target="_blank" rel="noreferrer" css={{ fontSize: '$small' }}>
                How to use the Inspector
              </Link>
            </Box>
            {/* FIXME: Use selectors - this rerenders */}
            {/* {uiState.onboardingExplainerInspect && (
              <OnboardingExplainer data={onboardingData} closeOnboarding={closeOnboarding} />
            )} */}
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
