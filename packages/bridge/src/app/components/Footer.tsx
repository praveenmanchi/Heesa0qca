import React, { useCallback, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { DownloadIcon, UploadIcon } from '@primer/octicons-react';
import { useTranslation } from 'react-i18next';
import { Button, IconButton } from '@tokens-studio/ui';
import { WarningTriangleSolid } from 'iconoir-react';
import pjs from '../../../package.json';
import Box from './Box';
import Stack from './Stack';
import BranchSelector from './BranchSelector';
import useRemoteTokens from '../store/remoteTokens';
import {
  localApiStateSelector,
  editProhibitedSelector,
  storageTypeSelector,
  usedTokenSetSelector,
  projectURLSelector,
  activeThemeSelector,
  uiStateSelector,
  tokensSizeSelector,
  themesSizeSelector,
  settingsStateSelector,
} from '@/selectors';
import RefreshIcon from '@/icons/refresh.svg';
import Tooltip from './Tooltip';
import { StorageProviderType } from '@/constants/StorageProviderType';
import { isGitProvider } from '@/utils/is';
import IconLibrary from '@/icons/library.svg';
import { transformProviderName } from '@/utils/transformProviderName';
import { DirtyStateBadgeWrapper } from './DirtyStateBadgeWrapper';
import { useChangedState } from '@/hooks/useChangedState';
import { TokenFormatBadge } from './TokenFormatBadge';
import { isEqual } from '@/utils/isEqual';
import { useStorageSizeWarning } from '../hooks/useStorageSizeWarning';

// ── Status dot component ──────────────────────────────────────────────────────
const StatusDot = ({ color }: { color: string }) => (
  <Box
    css={{
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      backgroundColor: color,
      flexShrink: 0,
      boxShadow: `0 0 4px ${color}88`,
    }}
  />
);

export default function Footer() {
  const storageType = useSelector(storageTypeSelector);
  const editProhibited = useSelector(editProhibitedSelector);
  const localApiState = useSelector(localApiStateSelector);
  const usedTokenSet = useSelector(usedTokenSetSelector);
  const tokensSize = useSelector(tokensSizeSelector);
  const themesSize = useSelector(themesSizeSelector);
  const projectURL = useSelector(projectURLSelector);
  const uiState = useSelector(uiStateSelector, isEqual);
  const settings = useSelector(settingsStateSelector);
  const { pullTokens, pushTokens, checkRemoteChange } = useRemoteTokens();
  const { t } = useTranslation(['footer', 'licence']);
  const activeTheme = useSelector(activeThemeSelector);
  const { hasChanges: hasLocalChange } = useChangedState();
  const { hasRemoteChange } = uiState;

  // Derive statuses
  const isGit = isGitProvider(localApiState);
  const gitConnected = isGit && !!(localApiState as any).branch;
  const aiEnabled = settings?.aiAssistanceEnabled ?? false;
  const mcpEnabled = settings?.mcpEnabled ?? false;

  const providerName = storageType.provider !== StorageProviderType.LOCAL
    ? transformProviderName(storageType.provider) : 'Local';

  // Uptime counter
  const [uptime, setUptime] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setUptime((p) => p + 1), 60000);
    return () => clearInterval(interval);
  }, []);
  const formatUptime = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  React.useEffect(() => {
    const interval = setInterval(() => {
      checkRemoteChange();
    }, 60000);
    return () => clearInterval(interval);
  }, [checkRemoteChange]);

  const onPushButtonClicked = React.useCallback(() => pushTokens(), [pushTokens]);
  const onPullButtonClicked = React.useCallback(() => pullTokens({ usedTokenSet, activeTheme }), [pullTokens, usedTokenSet, activeTheme]);
  const handlePullTokens = useCallback(() => {
    pullTokens({ usedTokenSet, activeTheme, updateLocalTokens: true });
  }, [pullTokens, usedTokenSet, activeTheme]);

  const handleBadgeClick = useStorageSizeWarning();

  return (
    <Box css={{ flexShrink: 0, borderTop: '1px solid $borderSubtle', backgroundColor: '$bgDefault' }}>
      {/* ── Top row: Git controls (existing) ── */}
      <Box
        css={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '$2 $4',
          overflow: 'hidden',
          gap: '$2',
        }}
      >
        <Stack direction="row" align="center" gap={2} css={{ overflow: 'hidden' }}>
          {storageType.provider === StorageProviderType.LOCAL && (tokensSize > 100 || themesSize > 100) && (
            <Button
              icon={<WarningTriangleSolid />}
              size="small"
              variant="invisible"
              onClick={handleBadgeClick}
            >
              {`${tokensSize > 100 ? tokensSize : themesSize} KB`}
            </Button>
          )}
          {((isGitProvider(localApiState) && (localApiState as any).branch) || storageType.provider === StorageProviderType.SUPERNOVA) && (
            <>
              <BranchSelector />
              <TokenFormatBadge />
              <DirtyStateBadgeWrapper badge={hasRemoteChange}>
                <IconButton
                  data-testid="footer-pull-button"
                  icon={<DownloadIcon />}
                  onClick={onPullButtonClicked}
                  variant="invisible"
                  size="small"
                  tooltipSide="top"
                  tooltip={
                    t('pullFrom', {
                      provider: transformProviderName(storageType.provider),
                    }) as string
                  }
                />
              </DirtyStateBadgeWrapper>
              <DirtyStateBadgeWrapper badge={hasLocalChange}>
                <IconButton
                  data-testid="footer-push-button"
                  icon={<UploadIcon />}
                  onClick={onPushButtonClicked}
                  variant="invisible"
                  size="small"
                  tooltipSide="top"
                  disabled={editProhibited || !hasLocalChange}
                  tooltip={
                    t('pushTo', {
                      provider: transformProviderName(storageType.provider),
                    }) as string
                  }
                />
              </DirtyStateBadgeWrapper>
            </>
          )}
          {storageType.provider !== StorageProviderType.LOCAL
            && storageType.provider !== StorageProviderType.GITHUB
            && storageType.provider !== StorageProviderType.GITLAB
            && storageType.provider !== StorageProviderType.ADO
            && storageType.provider !== StorageProviderType.BITBUCKET
            && storageType.provider !== StorageProviderType.SUPERNOVA
            ? (
              <Stack align="center" direction="row" gap={2}>
                {storageType.provider === StorageProviderType.JSONBIN && (
                  <Tooltip label={t('goTo', {
                    provider: transformProviderName(storageType.provider),
                  }) as string}
                  >
                    <IconButton icon={<IconLibrary />} href={projectURL} />
                  </Tooltip>
                )}
                <IconButton
                  tooltip={t('pullFrom', {
                    provider: transformProviderName(storageType.provider),
                  }) as string}
                  onClick={handlePullTokens}
                  variant="invisible"
                  size="small"
                  icon={<RefreshIcon />}
                />
              </Stack>
            ) : null}
        </Stack>
      </Box>

      {/* ── Bottom row: Status indicators ── */}
      <Box
        css={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '3px $4',
          borderTop: '1px solid $borderSubtle',
          backgroundColor: 'var(--colors-bgSubtle, #1a1a1d)',
          fontSize: '10px',
          color: '$fgMuted',
          gap: '$3',
          fontFamily: 'Inter, -apple-system, sans-serif',
          letterSpacing: '0.2px',
        }}
      >
        {/* Left side: Connection statuses */}
        <Box css={{ display: 'flex', alignItems: 'center', gap: '$3', overflow: 'hidden' }}>
          {/* Git/Provider status */}
          <Tooltip label={gitConnected ? `Connected to ${providerName}` : `Provider: ${providerName}`}>
            <Box css={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'default' }}>
              <StatusDot color={gitConnected ? '#10b981' : storageType.provider !== StorageProviderType.LOCAL ? '#f59e0b' : '#6b7280'} />
              <span style={{ whiteSpace: 'nowrap' }}>
                {gitConnected ? providerName : providerName}
              </span>
            </Box>
          </Tooltip>

          {/* Divider */}
          <Box css={{ width: '1px', height: '10px', backgroundColor: '$borderMuted', flexShrink: 0 }} />

          {/* AI status */}
          <Tooltip label={aiEnabled ? 'AI Assistance enabled' : 'AI Assistance disabled (enable in Settings)'}>
            <Box css={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'default' }}>
              <StatusDot color={aiEnabled ? '#8b5cf6' : '#6b7280'} />
              <span style={{ whiteSpace: 'nowrap' }}>
                AI
                {' '}
                {aiEnabled ? 'On' : 'Off'}
              </span>
            </Box>
          </Tooltip>

          {/* Divider */}
          <Box css={{ width: '1px', height: '10px', backgroundColor: '$borderMuted', flexShrink: 0 }} />

          {/* MCP status */}
          <Tooltip label={mcpEnabled ? 'MCP+Code enabled' : 'MCP+Code disabled (enable in Settings)'}>
            <Box css={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'default' }}>
              <StatusDot color={mcpEnabled ? '#3b82f6' : '#6b7280'} />
              <span style={{ whiteSpace: 'nowrap' }}>
                MCP
                {' '}
                {mcpEnabled ? 'On' : 'Off'}
              </span>
            </Box>
          </Tooltip>
        </Box>

        {/* Right side: Metrics */}
        <Box css={{ display: 'flex', alignItems: 'center', gap: '$3', flexShrink: 0 }}>
          {/* Tokens size */}
          {tokensSize > 0 && (
            <Tooltip label={`Token data: ${tokensSize} KB`}>
              <Box css={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'default' }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                </svg>
                <span>
                  {tokensSize}
                  KB
                </span>
              </Box>
            </Tooltip>
          )}

          {/* Session uptime */}
          <Tooltip label={`Session active for ${formatUptime(uptime)}`}>
            <Box css={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'default' }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{formatUptime(uptime)}</span>
            </Box>
          </Tooltip>

          {/* Divider */}
          <Box css={{ width: '1px', height: '10px', backgroundColor: '$borderMuted', flexShrink: 0 }} />

          {/* Version */}
          <span style={{ opacity: 0.6 }}>
            v
            {pjs.version}
          </span>
        </Box>
      </Box>
    </Box>
  );
}
