import React, { useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    Button, Box, Heading, TextInput, Label,
} from '@tokens-studio/ui';
import Text from './Text';
import Stack from './Stack';
import { Dispatch } from '@/app/store';
import { settingsStateSelector } from '@/selectors';

export default function GithubExtractSettings() {
    const dispatch = useDispatch<Dispatch>();
    const settings = useSelector(settingsStateSelector);

    // Use local state for immediate typing feedback, then dispatch on save
    const [pat, setPat] = useState(settings.githubExtractConfig?.pat || '');
    const [owner, setOwner] = useState(settings.githubExtractConfig?.owner || '');
    const [repo, setRepo] = useState(settings.githubExtractConfig?.repo || '');
    const [baseBranch, setBaseBranch] = useState(settings.githubExtractConfig?.baseBranch || 'main');
    const [filePath, setFilePath] = useState(settings.githubExtractConfig?.filePath || 'variables.json');
    const [webhookUrl, setWebhookUrl] = useState(settings.githubExtractConfig?.webhookUrl || '');

    const [isSaved, setIsSaved] = useState(false);

    const handleSave = useCallback(() => {
        dispatch.settings.setGithubExtractConfig({
            pat,
            owner,
            repo,
            baseBranch,
            filePath,
            webhookUrl,
        });
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    }, [pat, owner, repo, baseBranch, filePath, webhookUrl, dispatch]);

    return (
        <Box css={{ display: 'flex', flexDirection: 'column', gap: '$4' }}>
            <Stack direction="row" align="center" justify="between">
                <Heading size="small">GitHub Output Configuration</Heading>
            </Stack>

            <Text css={{ color: '$fgSubtle' }}>
                Configure the GitHub repository where Extracted Variables will be committed via Pull Request.
            </Text>

            <Stack direction="column" gap={3}>
                <Box css={{ display: 'flex', flexDirection: 'column', gap: '$1' }}>
                    <Label htmlFor="pat">Personal Access Token</Label>
                    <TextInput id="pat" type="password" value={pat} onChange={(e) => setPat(e.target.value)} />
                </Box>
                <Box css={{ display: 'flex', flexDirection: 'column', gap: '$1' }}>
                    <Label htmlFor="owner">Repository Owner</Label>
                    <TextInput id="owner" value={owner} onChange={(e) => setOwner(e.target.value)} />
                </Box>
                <Box css={{ display: 'flex', flexDirection: 'column', gap: '$1' }}>
                    <Label htmlFor="repo">Repository Name</Label>
                    <TextInput id="repo" value={repo} onChange={(e) => setRepo(e.target.value)} />
                </Box>
                <Box css={{ display: 'flex', flexDirection: 'column', gap: '$1' }}>
                    <Label htmlFor="baseBranch">Base Branch</Label>
                    <TextInput id="baseBranch" value={baseBranch} onChange={(e) => setBaseBranch(e.target.value)} />
                </Box>
                <Box css={{ display: 'flex', flexDirection: 'column', gap: '$1' }}>
                    <Label htmlFor="filePath">Variables JSON File Path</Label>
                    <TextInput id="filePath" value={filePath} onChange={(e) => setFilePath(e.target.value)} />
                </Box>
            </Stack>

            <Box css={{ height: '1px', backgroundColor: '$borderMuted', my: '$2' }} />

            <Stack direction="row" align="center" justify="between">
                <Heading size="small">Microsoft Teams Webhook (Optional)</Heading>
            </Stack>
            <Text css={{ color: '$fgSubtle' }}>
                Trigger a notification to a Teams channel when a PR is successfully opened.
            </Text>

            <Stack direction="column" gap={3}>
                <Box css={{ display: 'flex', flexDirection: 'column', gap: '$1' }}>
                    <Label htmlFor="webhookUrl">Webhook URL</Label>
                    <TextInput id="webhookUrl" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://your-tenant.webhook.office.com/..." />
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
