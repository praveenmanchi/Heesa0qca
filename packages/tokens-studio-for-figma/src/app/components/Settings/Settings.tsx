import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  Box, Link, Text, Button, Heading, Label, Stack, Switch, Select, TextInput,
} from '@tokens-studio/ui';
import SyncSettings from '../SyncSettings';
import GithubExtractSettings from '../GithubExtractSettings';

import { Dispatch } from '../../store';
import {
  uiStateSelector,
  settingsStateSelector,
} from '@/selectors';

import { Divider } from '../Divider';
import OnboardingExplainer from '../OnboardingExplainer';
import RemConfiguration from '../RemConfiguration';

// TODO: expose types from @tokens-studio/ui/checkbox
type CheckedState = boolean | 'indeterminate';

function Settings() {
  const { t } = useTranslation(['settings']);

  const onboardingData = {
    title: t('whereTokensStored'),
    text: t('whereTokensStoredOnboarding'),
    url: 'https://docs.tokens.studio/token-storage/remote?ref=onboarding_explainer_syncproviders',
  };

  const uiState = useSelector(uiStateSelector);
  const settings = useSelector(settingsStateSelector);
  const dispatch = useDispatch<Dispatch>();

  const closeOnboarding = React.useCallback(() => {
    dispatch.uiState.setOnboardingExplainerSyncProviders(false);
  }, [dispatch]);

  const handleResetButton = React.useCallback(() => {
    dispatch.uiState.setOnboardingExplainerSets(true);
    dispatch.uiState.setOnboardingExplainerExportSets(true);
    dispatch.uiState.setOnboardingExplainerInspect(true);
    dispatch.uiState.setOnboardingExplainerSyncProviders(true);
    dispatch.uiState.setLastOpened(0);
  }, [dispatch]);

  return (
    <Box className="content scroll-container">
      <Stack direction="column" gap={4} css={{ padding: '$3 0' }}>

        {/* {uiState.onboardingExplainerSyncProviders && (
          <Stack direction="column" gap={2} css={{ padding: '$4' }}>
            <OnboardingExplainer data={onboardingData} closeOnboarding={closeOnboarding} />
          </Stack>
        )} */}
        <SyncSettings />
        <Divider />
        <Stack direction="column" align="start" gap={4} css={{ padding: '0 $4' }}>
          <GithubExtractSettings />
        </Stack>
        <Divider />
        <Stack direction="column" align="start" gap={4} css={{ padding: '0 $4' }}>
          <Heading size="medium">AI Assistance (UXAI)</Heading>
          <Stack
            direction="column"
            gap={4}
            css={{
              border: '1px solid $borderSubtle', borderRadius: '$medium', padding: '$4', width: '100%',
            }}
          >
            <Stack direction="row" justify="between" align="center" css={{ width: '100%' }}>
              <Label>Enable AI assistance</Label>
              <Switch
                checked={settings.aiAssistanceEnabled ?? false}
                onCheckedChange={(checked) => dispatch.settings.setAiAssistanceEnabled(checked)}
              />
            </Stack>
            {settings.aiAssistanceEnabled && (
              <>
                <Stack direction="column" gap={2} css={{ width: '100%' }}>
                  <Label>AI Provider</Label>
                  <Select
                    value={settings.aiProvider ?? 'claude'}
                    onValueChange={(v) => dispatch.settings.setAiProvider(v as 'claude' | 'gemini')}
                  >
                    <Select.Trigger value={settings.aiProvider ?? 'claude'} />
                    <Select.Content>
                      <Select.Item value="claude">Claude (Anthropic)</Select.Item>
                      <Select.Item value="gemini">Gemini (Google)</Select.Item>
                    </Select.Content>
                  </Select>
                </Stack>
                <Stack direction="column" gap={2} css={{ width: '100%' }}>
                  <Label>Claude API Key</Label>
                  <TextInput
                    type="password"
                    value={settings.aiClaudeApiKey ?? ''}
                    onChange={(e) => dispatch.settings.setAiClaudeApiKey(e.target.value)}
                    placeholder="sk-ant-..."
                  />
                </Stack>
                <Stack direction="column" gap={2} css={{ width: '100%' }}>
                  <Label>Gemini API Key</Label>
                  <TextInput
                    type="password"
                    value={settings.aiGeminiApiKey ?? ''}
                    onChange={(e) => dispatch.settings.setAiGeminiApiKey(e.target.value)}
                    placeholder="AIza..."
                  />
                </Stack>
                <Divider />
                <Stack direction="column" gap={3} css={{ width: '100%' }}>
                  <Heading size="small">Dual File Mode</Heading>
                  <Text css={{ fontSize: '$1', color: '$fgMuted' }}>
                    Configure separate Variables and Components Figma files so UXAI can analyze cross-file
                    variable and component usage via the Figma REST API.
                  </Text>
                  <Stack direction="row" justify="between" align="center" css={{ width: '100%' }}>
                    <Label>Enable Dual File Mode</Label>
                    <Switch
                      checked={settings.uxaiDualFileEnabled ?? false}
                      onCheckedChange={(checked) => dispatch.settings.setUxaiDualFileEnabled(checked as CheckedState as boolean)}
                    />
                  </Stack>
                  {settings.uxaiDualFileEnabled && (
                    <Stack direction="column" gap={3} css={{ width: '100%' }}>
                      <Stack direction="column" gap={2} css={{ width: '100%' }}>
                        <Label>Variables File ID</Label>
                        <TextInput
                          type="text"
                          value={settings.uxaiVariablesFileId ?? ''}
                          onChange={(e) => dispatch.settings.setUxaiVariablesFileId(e.target.value)}
                          placeholder="Figma file key for your Variables library"
                        />
                      </Stack>
                      <Stack direction="column" gap={2} css={{ width: '100%' }}>
                        <Label>Variables File API Key</Label>
                        <TextInput
                          type="password"
                          value={settings.uxaiVariablesFileApiKey ?? ''}
                          onChange={(e) => dispatch.settings.setUxaiVariablesFileApiKey(e.target.value)}
                          placeholder="Personal access token with file_variables:read"
                        />
                      </Stack>
                      <Stack direction="column" gap={2} css={{ width: '100%' }}>
                        <Label>Components File ID</Label>
                        <TextInput
                          type="text"
                          value={settings.uxaiComponentsFileId ?? ''}
                          onChange={(e) => dispatch.settings.setUxaiComponentsFileId(e.target.value)}
                          placeholder="Figma file key for your Components library"
                        />
                      </Stack>
                      <Stack direction="column" gap={2} css={{ width: '100%' }}>
                        <Label>Components File API Key</Label>
                        <TextInput
                          type="password"
                          value={settings.uxaiComponentsFileApiKey ?? ''}
                          onChange={(e) => dispatch.settings.setUxaiComponentsFileApiKey(e.target.value)}
                          placeholder="Personal access token with file_variables:read"
                        />
                      </Stack>
                    </Stack>
                  )}
                </Stack>
              </>
            )}
          </Stack>
        </Stack>
        <Divider />
        <Stack direction="column" align="start" gap={4} css={{ padding: '0 $4' }}>
          <Heading size="medium">{t('settings')}</Heading>

          <Stack
            direction="column"
            gap={4}
            css={{
              border: '1px solid $borderSubtle',
              borderRadius: '$medium',
              padding: '$4',
              width: '100%',
            }}
          >
            <RemConfiguration />
          </Stack>
          <Stack
            direction="column"
            gap={4}
            css={{
              border: '1px solid $borderSubtle',
              borderRadius: '$medium',
              padding: '$4',
              width: '100%',
            }}
          >

            <Stack direction="row" justify="between" gap={2} align="center" css={{ width: '100%' }}>
              <Label>{t('resetOnboarding')}</Label>
              <Button variant="secondary" data-testid="reset-onboarding" onClick={handleResetButton}>
                {t('resetOnboarding')}
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}

export default Settings;
