import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  Box, Link, Text, Button, Heading, Label, Stack, Switch,
} from '@tokens-studio/ui';
import SyncSettings from '../SyncSettings';
import GithubExtractSettings from '../GithubExtractSettings';

import { Dispatch } from '../../store';
import {
  uiStateSelector,
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
