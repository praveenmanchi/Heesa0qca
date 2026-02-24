import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import Box from './Box';
import { Tabs } from '@/constants/Tabs';
import Stack from './Stack';
import { TabButton } from './TabButton';
import { NavbarUndoButton } from './NavbarUndoButton';
import { activeTabSelector, settingsStateSelector } from '@/selectors';
import { Dispatch } from '../store';
import { useAuth } from '@/context/AuthContext';
import Banner from './Banner';
import {
  IconVariable,
  IconInspect,
  IconStyleGuide,
  IconExtract,
  IconBell,
  IconSettings,
  IconComposition,
} from '@/icons';

const Navbar: React.FC<React.PropsWithChildren<unknown>> = () => {
  const activeTab = useSelector(activeTabSelector);
  const settings = useSelector(settingsStateSelector);
  const dispatch = useDispatch<Dispatch>();
  const { t } = useTranslation(['navbar']);
  const aiEnabled = settings?.aiAssistanceEnabled ?? false;

  const handleSwitch = useCallback(
    (tab: Tabs) => {
      dispatch.uiState.setActiveTab(tab);
    },
    [dispatch.uiState],
  );

  return (
    <>
      <Banner />
      <Box
        css={{
          position: 'sticky',
          top: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '$bgDefault',
          borderBottom: '1px solid $borderSubtle',
          boxShadow: '0 1px 0 0 $borderSubtle',
          zIndex: 1,
          padding: '0 $2',
        }}
      >
        <Stack gap={0} direction="row" align="center" justify="between" css={{ width: '100%' }}>
          <Stack gap={0} direction="row" align="center" justify="start">
            <TabButton
              name={Tabs.VARIABLES}
              activeTab={activeTab}
              label="Variables"
              onSwitch={handleSwitch}
              startEnhancer={<IconVariable />}
            />
            <TabButton
              name={Tabs.INSPECTOR}
              activeTab={activeTab}
              label={t('inspect')}
              onSwitch={handleSwitch}
              startEnhancer={<IconInspect />}
            />
            <TabButton
              name={Tabs.STYLEGUIDE}
              activeTab={activeTab}
              label="Style Guide"
              onSwitch={handleSwitch}
              startEnhancer={<IconStyleGuide />}
            />
            <TabButton
              name={Tabs.EXTRACT}
              activeTab={activeTab}
              label="Extract"
              onSwitch={handleSwitch}
              startEnhancer={<IconExtract />}
            />
            {aiEnabled && (
              <TabButton
                name={Tabs.UXAI}
                activeTab={activeTab}
                label="UXAI"
                onSwitch={handleSwitch}
                startEnhancer={<IconComposition />}
              />
            )}
            <TabButton
              name={Tabs.CHANGELOG}
              activeTab={activeTab}
              label="Change Log"
              onSwitch={handleSwitch}
              startEnhancer={<IconBell />}
            />
          </Stack>
          <Stack gap={0} direction="row" align="center" justify="end">
            <TabButton
              name={Tabs.SETTINGS}
              activeTab={activeTab}
              label=""
              onSwitch={handleSwitch}
              startEnhancer={<IconSettings />}
              tooltip={t('settings')}
            />
            <NavbarUndoButton />
          </Stack>
        </Stack>
      </Box>
    </>
  );
};

export default Navbar;
