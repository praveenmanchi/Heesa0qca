import React, { useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Button, Heading, TextInput, Label, Switch, Badge,
} from '@tokens-studio/ui';
import Box from './Box';
import Text from './Text';
import Stack from './Stack';
import { Dispatch } from '@/app/store';
import { settingsStateSelector } from '@/selectors';

type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error';

export default function GithubExtractSettings() {
  const dispatch = useDispatch<Dispatch>();
  const settings = useSelector(settingsStateSelector);

  const [pat, setPat] = useState(settings.githubExtractConfig?.pat || '');
  const [owner, setOwner] = useState(settings.githubExtractConfig?.owner || '');
  const [repo, setRepo] = useState(settings.githubExtractConfig?.repo || '');
  const [baseBranch, setBaseBranch] = useState(settings.githubExtractConfig?.baseBranch || 'main');
  const [filePath, setFilePath] = useState(settings.githubExtractConfig?.filePath || 'variables.json');
  const [webhookUrl, setWebhookUrl] = useState(settings.githubExtractConfig?.webhookUrl || '');
  const [webhookUrlDev, setWebhookUrlDev] = useState(settings.githubExtractConfig?.webhookUrlDev || '');
  const [emailNotification, setEmailNotification] = useState(settings.githubExtractConfig?.emailNotification || '');
  const [localJsonComparison, setLocalJsonComparison] = useState(settings.githubExtractConfig?.localJsonComparison ?? false);

  const [isSaved, setIsSaved] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [connectionError, setConnectionError] = useState('');

  const handleSave = useCallback(() => {
    dispatch.settings.setGithubExtractConfig({
      pat,
      owner,
      repo,
      baseBranch,
      filePath,
      webhookUrl,
      webhookUrlDev,
      emailNotification,
      localJsonComparison,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  }, [pat, owner, repo, baseBranch, filePath, webhookUrl, webhookUrlDev, emailNotification, localJsonComparison, dispatch]);

  const handleTestConnection = useCallback(async () => {
    if (!pat || !owner || !repo) {
      setConnectionStatus('error');
      setConnectionError('PAT, owner and repo are required.');
      return;
    }
    setConnectionStatus('testing');
    setConnectionError('');
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: { Authorization: `Bearer ${pat}`, Accept: 'application/vnd.github+json' },
      });
      if (res.ok) {
        setConnectionStatus('success');
      } else {
        const body = await res.json().catch(() => ({}));
        setConnectionError(body.message || `HTTP ${res.status}`);
        setConnectionStatus('error');
      }
    } catch (e: any) {
      setConnectionError(e?.message || 'Network error');
      setConnectionStatus('error');
    }
  }, [pat, owner, repo]);

  const connectionLabel = {
    idle: null,
    testing: <Text css={{ color: '$fgMuted', fontSize: '$xxsmall' }}>Testing…</Text>,
    success: <Text css={{ color: '$successFg', fontSize: '$xxsmall' }}>✅ Connected</Text>,
    error: <Text css={{ color: '$dangerFg', fontSize: '$xxsmall' }}>❌ {connectionError}</Text>,
  }[connectionStatus];

  return (
    <Box css={{ display: 'flex', flexDirection: 'column', gap: '$4', width: '100%' }}>
      <Stack direction="row" align="center" justify="between">
        <Heading size="small">GitHub Output Configuration</Heading>
      </Stack>

      <Text css={{ color: '$fgSubtle' }}>
        Configure the GitHub repository where extracted variables will be committed via Pull Request.
      </Text>

      {/* ── GitHub repo fields ── */}
      <Stack direction="column" gap={3}>
        <Box css={{ display: 'flex', flexDirection: 'column', gap: '$1' }}>
          <Label htmlFor="pat">Personal Access Token</Label>
          <TextInput id="pat" type="password" value={pat} onChange={(e) => setPat(e.target.value)} placeholder="ghp_..." />
        </Box>
        <Box css={{ display: 'flex', flexDirection: 'column', gap: '$1' }}>
          <Label htmlFor="owner">Repository Owner</Label>
          <TextInput id="owner" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="your-org" />
        </Box>
        <Box css={{ display: 'flex', flexDirection: 'column', gap: '$1' }}>
          <Label htmlFor="repo">Repository Name</Label>
          <TextInput id="repo" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="design-tokens" />
        </Box>
        <Box css={{ display: 'flex', flexDirection: 'column', gap: '$1' }}>
          <Label htmlFor="baseBranch">Base Branch</Label>
          <TextInput id="baseBranch" value={baseBranch} onChange={(e) => setBaseBranch(e.target.value)} />
        </Box>
        <Box css={{ display: 'flex', flexDirection: 'column', gap: '$1' }}>
          <Label htmlFor="filePath">Variables JSON File Path</Label>
          <TextInput id="filePath" value={filePath} onChange={(e) => setFilePath(e.target.value)} />
        </Box>

        {/* Test connection */}
        <Stack direction="row" align="center" gap={3}>
          <Button variant="secondary" size="small" onClick={handleTestConnection} disabled={connectionStatus === 'testing'}>
            Test Connection
          </Button>
          {connectionLabel}
        </Stack>
      </Stack>

      <Box css={{ height: '1px', backgroundColor: '$borderMuted' }} />

      {/* ── Local JSON comparison toggle ── */}
      <Stack direction="row" justify="between" align="center" css={{ width: '100%' }}>
        <Box css={{ display: 'flex', flexDirection: 'column', gap: '$1' }}>
          <Label>Enable Local JSON Comparison</Label>
          <Text css={{ color: '$fgSubtle', fontSize: '$xxsmall' }}>
            Compare the local variables.json baseline against the live GitHub file to detect drift.
          </Text>
        </Box>
        <Switch
          checked={localJsonComparison}
          onCheckedChange={(v) => setLocalJsonComparison(v as boolean)}
        />
      </Stack>

      <Box css={{ height: '1px', backgroundColor: '$borderMuted' }} />

      {/* ── Notifications ── */}
      <Heading size="small">Notifications</Heading>
      <Text css={{ color: '$fgSubtle' }}>
        Trigger notifications when a PR is successfully opened.
      </Text>

      <Stack direction="column" gap={3}>
        <Box css={{ display: 'flex', flexDirection: 'column', gap: '$1' }}>
          <Label htmlFor="webhookDs">
            MS Teams Webhook — Design System Team
          </Label>
          <TextInput
            id="webhookDs"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://your-tenant.webhook.office.com/..."
          />
        </Box>
        <Box css={{ display: 'flex', flexDirection: 'column', gap: '$1' }}>
          <Label htmlFor="webhookDev">
            MS Teams Webhook — Dev Team
          </Label>
          <TextInput
            id="webhookDev"
            value={webhookUrlDev}
            onChange={(e) => setWebhookUrlDev(e.target.value)}
            placeholder="https://your-tenant.webhook.office.com/..."
          />
        </Box>
        <Box css={{ display: 'flex', flexDirection: 'column', gap: '$1' }}>
          <Label htmlFor="emailNotification">Email Notifications</Label>
          <TextInput
            id="emailNotification"
            type="email"
            value={emailNotification}
            onChange={(e) => setEmailNotification(e.target.value)}
            placeholder="team@company.com"
          />
          <Text css={{ color: '$fgSubtle', fontSize: '$xxsmall' }}>
            Comma-separated addresses for PR summary emails (requires backend mail service).
          </Text>
        </Box>
      </Stack>

      <Stack direction="row" justify="between" align="center">
        {isSaved ? <Text css={{ color: '$successFg', fontSize: '$xxsmall' }}>Settings saved!</Text> : <Box />}
        <Button variant="primary" onClick={handleSave}>
          Save Configuration
        </Button>
      </Stack>
    </Box>
  );
}
