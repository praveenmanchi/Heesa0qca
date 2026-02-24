export interface WebhookPayload {
  title: string;
  themeColor?: string;
  text: string;
  potentialAction?: Array<{
    '@type': string;
    name: string;
    targets: Array<{
      os: 'default';
      uri: string;
    }>;
  }>;
}

/**
 * Triggers a Microsoft Teams Incoming Webhook with a formatted MessageCard.
 *
 * @param webhookUrl The Microsoft Teams Incoming Webhook URL.
 * @param prUrl The URL of the newly created Pull Request.
 * @param repoName The name of the GitHub repository.
 * @param branchName The name of the target branch.
 * @param added Count of added variables.
 * @param removed Count of removed variables.
 * @param modified Count of modified variables.
 */
export async function triggerTeamsWebhook(
  webhookUrl: string,
  prUrl: string,
  repoName: string,
  branchName: string,
  added: number,
  removed: number,
  modified: number,
): Promise<boolean> {
  if (!webhookUrl) {
    console.warn('No Webhook URL provided. Skipping Teams notification.');
    return false;
  }

  const payload: WebhookPayload = {
    title: `Figma Variables Exported to ${repoName}`,
    themeColor: '0078D7', // Teams Blue
    text: `A new Pull Request has been automatically generated from Figma.\n\n**Repository**: ${repoName}\n**Branch**: ${branchName}\n\n**Changes Overview**:\n- Added: ${added}\n- Removed: ${removed}\n- Modified: ${modified}`,
    potentialAction: [
      {
        '@type': 'OpenUri',
        name: 'View Pull Request',
        targets: [
          { os: 'default', uri: prUrl },
        ],
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Teams Webhook failed: ${response.status} ${response.statusText}`);
      return false;
    }

    console.log('Successfully triggered Teams webhook.');
    return true;
  } catch (err) {
    console.error('Error triggering Teams webhook:', err);
    return false;
  }
}
