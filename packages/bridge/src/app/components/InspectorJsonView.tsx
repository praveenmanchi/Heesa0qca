import React, { useMemo, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  Box, EmptyState, Button, Heading, Textarea,
} from '@tokens-studio/ui';
import { uiStateSelector, settingsStateSelector } from '@/selectors';
import { isEqual } from '@/utils/isEqual';
import Text from './Text';
import Stack from './Stack';
import { SingleToken } from '@/types/tokens';
import useTokens from '../store/useTokens';
import { AsyncMessageChannel } from '@/AsyncMessageChannel';
import { AsyncMessageTypes } from '@/types/AsyncMessages';
import { compareVariables, type VariableDiff } from '@/utils/compareVariables';
import { getGitHubFileContent } from '@/app/store/providers/github/githubPrHandler';
import { CODE_FONT_SIZE } from '@/constants/UIConstants';

export default function InspectorJsonView({
  resolvedTokens,
  selectedMode,
}: {
  resolvedTokens: SingleToken[];
  selectedMode: string;
}) {
  const uiState = useSelector(uiStateSelector, isEqual);
  const settings = useSelector(settingsStateSelector, isEqual);
  const { getTokenValue } = useTokens();
  const { t } = useTranslation(['inspect']);

  const {
    pat = '',
    owner = '',
    repo = '',
    baseBranch = 'main',
    filePath = 'variables.json',
  } = settings.githubExtractConfig || {};

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [diff, setDiff] = useState<VariableDiff | null>(null);
  const [oldJsonPreview, setOldJsonPreview] = useState<string>('');
  const [newJsonPreview, setNewJsonPreview] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [githubConfigError, setGithubConfigError] = useState<string | null>(null);

  const handleRefreshSelection = useCallback(async () => {
    try {
      await AsyncMessageChannel.ReactInstance.message({
        type: AsyncMessageTypes.CHANGED_TABS,
        requiresSelectionValues: true,
      });
    } catch (_) { /* ignore */ }
  }, []);

  const handleAnalyzeComponent = useCallback(async () => {
    if (!pat || !owner || !repo || !baseBranch || !filePath) {
      setGithubConfigError('GitHub integration must be configured in Settings to analyze differences.');
      return;
    }
    setGithubConfigError(null);
    setError(null);
    setIsAnalyzing(true);
    setDiff(null);

    try {
      const extractResponse = await AsyncMessageChannel.ReactInstance.message({
        type: AsyncMessageTypes.EXTRACT_VARIABLES_TO_CANVAS,
      });
      const freshJsonResult = extractResponse.jsonString || '[]';
      const newVars = JSON.parse(freshJsonResult);

      const baseJsonString = await getGitHubFileContent({
        pat,
        owner,
        repo,
        branch: baseBranch,
        path: filePath,
      });
      let oldVars = baseJsonString ? JSON.parse(baseJsonString) : [];
      if (!Array.isArray(oldVars)) {
        oldVars = [];
      }

      const usedTokens = new Set<string>();
      uiState.selectionValues.forEach((group) => {
        if (group.value) {
          const rawValue = String(group.value).replace(/^\{|\}$/g, '');
          usedTokens.add(rawValue.replace(/\./g, '/'));
          usedTokens.add(rawValue);
        }
      });

      const filteredOldVars = oldVars.filter((v: any) => usedTokens.has(v.name));
      const filteredNewVars = newVars.filter((v: any) => usedTokens.has(v.name));

      const diffResult = compareVariables(filteredOldVars, filteredNewVars);
      setDiff(diffResult);
      setOldJsonPreview(JSON.stringify(filteredOldVars, null, 2));
      setNewJsonPreview(JSON.stringify(filteredNewVars, null, 2));
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setError(`Analysis failed: ${err.message || String(err)}`);
    } finally {
      setIsAnalyzing(false);
    }
  }, [pat, owner, repo, baseBranch, filePath, uiState.selectionValues]);

  const componentJSON = useMemo(() => {
    const output: {
      components: Record<string, { id: string; tokens: Record<string, string>; resolvedValues?: Record<string, any> }>;
    } = {
      components: {},
    };

    uiState.selectionValues.forEach((group) => {
      group.nodes.forEach((node) => {
        const compKey = node.name;
        if (!output.components[compKey]) {
          output.components[compKey] = {
            id: node.id,
            tokens: {},
            resolvedValues: {},
          };
        }

        output.components[compKey].tokens[group.type] = group.value;

        if (selectedMode === 'All Modes') {
          if (group.modes && Object.keys(group.modes).length > 0) {
            output.components[compKey].resolvedValues![group.type] = group.modes;
          } else {
            const resolvedToken = getTokenValue(group.value, resolvedTokens);
            if (resolvedToken?.value) {
              output.components[compKey].resolvedValues![group.type] = String(resolvedToken.value);
            } else if (group.resolvedValue) {
              output.components[compKey].resolvedValues![group.type] = group.resolvedValue;
            }
          }
        } else if (group.modes && group.modes[selectedMode]) {
          output.components[compKey].resolvedValues![group.type] = group.modes[selectedMode];
        } else {
          const resolvedToken = getTokenValue(group.value, resolvedTokens);
          if (resolvedToken?.value) {
            output.components[compKey].resolvedValues![group.type] = String(resolvedToken.value);
          } else if (group.resolvedValue) {
            output.components[compKey].resolvedValues![group.type] = group.resolvedValue;
          }
        }
      });
    });

    // Clean up empty resolvedValues objects to keep JSON clean
    Object.values(output.components).forEach((comp) => {
      if (Object.keys(comp.resolvedValues || {}).length === 0) {
        delete comp.resolvedValues;
      }
    });

    return output;
  }, [uiState.selectionValues, getTokenValue, resolvedTokens, selectedMode]);

  if (uiState.selectionValues.length === 0) {
    return (
      <Box
        css={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          padding: '$4',
        }}
      >
        <Stack direction="column" gap={4} css={{ padding: '$5', margin: 'auto' }}>
          <EmptyState
            title={uiState.selectedLayers > 0 ? t('noTokensFound') : t('noLayersSelected')}
            description={uiState.selectedLayers > 0 ? t('noLayersWithTokens') : t('selectLayer')}
          />
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      css={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        overflow: 'auto',
        padding: '$4',
        gap: '$2',
      }}
      className="content scroll-container"
    >
      <Box
        as="pre"
        css={{
          m: 0,
          p: '$4',
          backgroundColor: '$bgSubtle',
          borderRadius: '$medium',
          fontSize: `${CODE_FONT_SIZE}px`,
          overflowX: 'auto',
          color: '$text',
        }}
      >
        <code>{JSON.stringify(componentJSON, null, 2)}</code>
      </Box>

      <Box
        css={{
          marginTop: '$4',
          display: 'flex',
          flexDirection: 'column',
          gap: '$3',
        }}
      >
        <Stack direction="row" gap={2}>
          <Button variant="secondary" onClick={handleRefreshSelection}>
            Refresh Selection
          </Button>
          <Button variant="secondary" onClick={handleAnalyzeComponent} disabled={isAnalyzing}>
            {isAnalyzing ? 'Analyzing Component Variables...' : 'Analyze Component Variables'}
          </Button>
        </Stack>
        {githubConfigError && <Text css={{ color: '$dangerFg' }}>{githubConfigError}</Text>}
        {error && <Text css={{ color: '$dangerFg' }}>{error}</Text>}

        {diff && (
          <Box css={{ display: 'flex', flexDirection: 'column', gap: '$3' }}>
            <Stack direction="row" gap={3} css={{ marginTop: '$2' }}>
              <Box css={{ flex: 1, overflow: 'hidden' }}>
                <Heading size="small">
                  Old JSON (
                  {baseBranch}
                  )
                </Heading>
                <Textarea
                  disabled
                  value={oldJsonPreview}
                  css={{
                    fontFamily: '$mono',
                    fontSize: '$xxsmall',
                    lineHeight: '140%',
                    resize: 'none',
                    minHeight: '200px',
                  }}
                />
              </Box>
              <Box css={{ flex: 1, overflow: 'hidden' }}>
                <Heading size="small">New JSON (Canvas)</Heading>
                <Textarea
                  disabled
                  value={newJsonPreview}
                  css={{
                    fontFamily: '$mono',
                    fontSize: '$xxsmall',
                    lineHeight: '140%',
                    resize: 'none',
                    minHeight: '200px',
                  }}
                />
              </Box>
            </Stack>

            <Box
              css={{
                display: 'flex',
                flexDirection: 'column',
                gap: '$3',
                padding: '$3',
                backgroundColor: '$bgSubtle',
                borderRadius: '$2',
              }}
            >
              <Heading size="small">Component Variables Summary</Heading>
              <Box css={{ marginBottom: '$2' }}>
                <Text css={{ fontWeight: 'bold' }}>
                  Added:
                  {diff.added.length}
                  {' '}
                  variables
                </Text>
                {diff.added.length > 0 && (
                  <ul style={{ margin: '4px 0 8px 0', paddingLeft: '20px', fontSize: `${CODE_FONT_SIZE}px` }}>
                    {diff.added.map((v) => (
                      <li key={v.id || v.name}>
                        {v.name}
                        {' '}
                        <span style={{ opacity: 0.7 }}>
                          (
                          {v.collectionName}
                          )
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Box>
              <Box css={{ marginBottom: '$2' }}>
                <Text css={{ fontWeight: 'bold' }}>
                  Removed:
                  {diff.removed.length}
                  {' '}
                  variables
                </Text>
                {diff.removed.length > 0 && (
                  <ul style={{ margin: '4px 0 8px 0', paddingLeft: '20px', fontSize: `${CODE_FONT_SIZE}px` }}>
                    {diff.removed.map((v) => (
                      <li key={v.id || v.name}>
                        {v.name}
                        {' '}
                        <span style={{ opacity: 0.7 }}>
                          (
                          {v.collectionName}
                          )
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Box>
              <Box css={{ marginBottom: '$2' }}>
                <Text css={{ fontWeight: 'bold' }}>
                  Modified:
                  {diff.changed.length}
                  {' '}
                  variables
                </Text>
                {diff.changed.length > 0 && (
                  <ul style={{ margin: '4px 0 8px 0', paddingLeft: '20px', fontSize: `${CODE_FONT_SIZE}px` }}>
                    {diff.changed.map((v) => {
                      const formatVal = (val: any) => {
                        if (typeof val === 'object' && val !== null) {
                          if (val.type === 'VARIABLE_ALIAS') return `Alias(${val.id})`;
                          if ('r' in val && 'g' in val && 'b' in val) {
                            return `rgba(${Math.round(val.r * 255)}, ${Math.round(val.g * 255)}, ${Math.round(
                              val.b * 255,
                            )}, ${val.a ?? 1})`;
                          }
                          return JSON.stringify(val);
                        }
                        return String(val);
                      };

                      const oldVal = formatVal(Object.values(v.old.valuesByMode)[0]);
                      const newVal = formatVal(Object.values(v.new.valuesByMode)[0]);
                      const hasValueChanged = oldVal !== newVal;

                      return (
                        <li key={v.old.id || v.new.name} style={{ marginBottom: '4px' }}>
                          <span style={{ fontWeight: 500 }}>{v.new.name}</span>
                          {' '}
                          <span style={{ opacity: 0.7 }}>
                            (
                            {v.new.collectionName}
                            )
                          </span>
                          {hasValueChanged ? (
                            <div style={{ color: 'var(--colors-textSubtle, #666)', marginTop: '2px' }}>
                              <span style={{ textDecoration: 'line-through', opacity: 0.8 }}>{String(oldVal)}</span>
                              {' → '}
                              <span style={{ color: 'var(--colors-successFg, #137749)', fontWeight: 500 }}>
                                {String(newVal)}
                              </span>
                            </div>
                          ) : (
                            <div
                              style={{ color: 'var(--colors-textSubtle, #666)', marginTop: '2px', fontStyle: 'italic' }}
                            >
                              Type or Scoping changed
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Box>
              {diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0 && (
                <Text css={{ fontStyle: 'italic', color: '$textSubtle', fontSize: '$xxsmall' }}>
                  No variable changes detected for this component.
                </Text>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
