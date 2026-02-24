import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  Button, Heading, Select, Label, Spinner,
} from '@tokens-studio/ui';
import { IconLogo } from '@/icons';
import Text from './Text';
import Callout from './Callout';
import { Dispatch } from '../store';
import {
  apiProvidersSelector, storageTypeSelector, lastErrorSelector, themeOptionsSelector, activeThemeSelector,
} from '@/selectors';
import Stack from './Stack';
import Box from './Box';
import { Tabs } from '@/constants/Tabs';
import { StorageProviderType } from '@/constants/StorageProviderType';
import { transformProviderName } from '@/utils/transformProviderName';
import { track } from '@/utils/analytics';
import Footer from './Footer';
import { autoSelectFirstThemesPerGroup } from '@/utils/autoSelectThemes';
import useRemoteTokens from '../store/remoteTokens';

function StartScreen() {
  const dispatch = useDispatch<Dispatch>();
  const { t } = useTranslation(['startScreen']);
  const { restoreStoredProvider, restoreProviderWithAutoPull } = useRemoteTokens();

  const storageType = useSelector(storageTypeSelector);
  const apiProviders = useSelector(apiProvidersSelector);
  const lastError = useSelector(lastErrorSelector);
  const availableThemes = useSelector(themeOptionsSelector);
  const activeTheme = useSelector(activeThemeSelector);

  const [isLoadingProvider, setIsLoadingProvider] = React.useState(false);

  const onSetEmptyTokens = React.useCallback(() => {
    track('Start with empty set');
    dispatch.uiState.setLastError(null);
    dispatch.uiState.setActiveTab(Tabs.VARIABLES);
    dispatch.tokenState.setEmptyTokens();
  }, [dispatch]);

  const onSetDefaultTokens = React.useCallback(() => {
    track('Start with example set');
    dispatch.uiState.setLastError(null);
    dispatch.uiState.setActiveTab(Tabs.VARIABLES);
    dispatch.tokenState.setDefaultTokens();
  }, [dispatch]);

  const onSetSyncClick = React.useCallback(() => {
    if (storageType.provider === StorageProviderType.LOCAL) {
      return;
    }
    const matchingProvider = apiProviders.find((i) => i.internalId === storageType?.internalId);
    const credentialsToSet = matchingProvider
      ? { ...matchingProvider, provider: storageType.provider, new: true }
      : { ...storageType, new: true };
    dispatch.uiState.setLastError(null);
    dispatch.uiState.setActiveTab(Tabs.SETTINGS);
    dispatch.tokenState.setEmptyTokens();
    dispatch.uiState.setLocalApiState(credentialsToSet);
  }, [apiProviders, dispatch.tokenState, dispatch.uiState, storageType]);

  const onProviderSelect = React.useCallback(async (providerId: string) => {
    const selectedProvider = apiProviders.find((provider) => provider.internalId === providerId);
    if (selectedProvider) {
      track('Start with sync provider', { provider: selectedProvider.provider });
      dispatch.uiState.setLastError(null);
      setIsLoadingProvider(true);
      try {
        await restoreProviderWithAutoPull(selectedProvider);
        if (availableThemes.length > 0) {
          const newActiveTheme = autoSelectFirstThemesPerGroup(availableThemes, activeTheme);
          if (Object.keys(newActiveTheme).length > 0 && Object.keys(activeTheme).length === 0) {
            dispatch.tokenState.setActiveTheme({ newActiveTheme, shouldUpdateNodes: true });
            track('Auto-selected themes', { themes: newActiveTheme });
          }
        }
      } catch (error) {
        setIsLoadingProvider(false);
        dispatch.uiState.setLastError({
          type: 'connectivity',
          header: 'Failed to load provider',
          message: 'Unable to connect to the selected sync provider. Please check your credentials and try again.',
        });
      }
    }
  }, [apiProviders, availableThemes, activeTheme, dispatch, restoreProviderWithAutoPull]);

  const matchingProvider = React.useMemo(
    () => (storageType && 'internalId' in storageType
      ? apiProviders.find((i) => i.internalId === storageType.internalId)
      : undefined),
    [apiProviders, storageType],
  );

  const getCalloutContent = React.useMemo(() => {
    if (!lastError) {
      return {
        heading: t('couldNotLoadTokens', { provider: transformProviderName(storageType?.provider) }),
        description: matchingProvider ? t('unableToFetchRemoteWithCredentials') : t('unableToFetchRemoteNoCredentials'),
      };
    }
    return { heading: lastError.header, description: lastError.message };
  }, [lastError, storageType?.provider, matchingProvider, t]);

  const providerOptions = React.useMemo(
    () => apiProviders.map((provider) => ({
      value: provider.internalId,
      label: `${provider.name} (${transformProviderName(provider.provider)})`,
    })),
    [apiProviders],
  );

  const shouldShowProviderSelector = apiProviders.length > 0 && storageType?.provider === StorageProviderType.LOCAL;

  return (
    <Box css={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Box className="content scroll-container" css={{ padding: '$5', height: '100%', display: 'flex' }}>
        <Stack
          direction="column"
          gap={6}
          align="start"
          css={{ padding: '$7', margin: 'auto', maxWidth: '400px', borderRadius: '$medium' }}
        >
          {/* Logo + Brand */}
          <Stack direction="column" gap={3}>
            <IconLogo />
            <Stack direction="column" gap={1}>
              <Heading size="large" css={{ color: '$fgDefault' }}>The Bridge</Heading>
              <Text muted css={{ fontSize: '$xsmall', fontStyle: 'italic' }}>
                Connecting gap between Design and dev handoff
              </Text>
            </Stack>
          </Stack>

          {/* Intro */}
          <Text muted>
            The Bridge gives you full control over your design tokens, variables, and style guides — all in one place. Extract, inspect, and ship design decisions faster.
          </Text>

          {/* What you can do */}
          <Stack direction="column" gap={4}>
            <Heading size="medium">What you can do</Heading>
            <Stack direction="column" gap={3}>
              <Text muted css={{ fontSize: '$xsmall' }}>📐 &nbsp;Extract tab — pull colors, typography & spacing from your Figma file</Text>
              <Text muted css={{ fontSize: '$xsmall' }}>🔍 &nbsp;Variables tab — search & inspect variable usage across all pages</Text>
              <Text muted css={{ fontSize: '$xsmall' }}>🎨 &nbsp;Style Guide tab — generate a living style guide on the Figma canvas</Text>
              <Text muted css={{ fontSize: '$xsmall' }}>📦 &nbsp;Export tokens as Style Dictionary JSON for dev handoff</Text>
            </Stack>
          </Stack>

          {/* Loading provider indicator */}
          {isLoadingProvider && (
            <Stack direction="row" gap={3} align="center">
              <Spinner />
              <Text>Loading tokens from sync provider…</Text>
            </Stack>
          )}

          {/* Sync provider error */}
          {!isLoadingProvider && storageType?.provider !== StorageProviderType.LOCAL && (
            <Callout
              id="callout-action-setupsync"
              heading={getCalloutContent.heading}
              description={getCalloutContent.description}
              action={{ onClick: onSetSyncClick, text: t('enterCredentials') }}
              secondaryAction={matchingProvider ? {
                onClick: () => { dispatch.uiState.setLastError(null); restoreStoredProvider(matchingProvider); },
                text: t('retry'),
              } : undefined}
            />
          )}

          {/* Local storage actions */}
          {!isLoadingProvider && storageType?.provider === StorageProviderType.LOCAL && (
            <Stack direction="column" gap={4}>
              {shouldShowProviderSelector && (
                <Stack direction="column" gap={3}>
                  <Heading size="medium">Load from sync provider</Heading>
                  <Stack direction="row" justify="between" align="center" gap={4} css={{ width: '100%' }}>
                    <Label>Select a provider</Label>
                    <Select onValueChange={onProviderSelect} disabled={isLoadingProvider}>
                      <Select.Trigger value="Choose a provider…" data-testid="provider-selector" />
                      <Select.Content>
                        {providerOptions.map((option) => (
                          <Select.Item key={option.value} value={option.value}>
                            {option.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  </Stack>
                </Stack>
              )}
              <Stack direction="row" gap={2}>
                <Button data-testid="button-configure" size="small" variant="primary" onClick={onSetEmptyTokens} disabled={isLoadingProvider}>
                  New empty file
                </Button>
                <Button data-testid="button-configure-preset" size="small" variant="secondary" onClick={onSetDefaultTokens} disabled={isLoadingProvider}>
                  Load example
                </Button>
              </Stack>
            </Stack>
          )}
        </Stack>
      </Box>
      <Footer />
    </Box>
  );
}

export default StartScreen;
