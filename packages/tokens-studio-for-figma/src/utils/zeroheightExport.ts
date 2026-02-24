import { saveAs } from 'file-saver';
import { SingleToken } from '@/types/tokens';

/**
 * Zeroheight Integration
 *
 * The Zeroheight public API (developers.zeroheight.com) does NOT support
 * pushing variables or tokens. The only way to push Figma variables to
 * Zeroheight is via their official "zeroheight – variables sync" Figma plugin.
 *
 * What the API DOES support (Enterprise plan required):
 *   - GET  /v2/styleguides           — list styleguides
 *   - GET  /v2/styleguides/:id/pages — list pages in a styleguide
 *   - GET  /v2/pages/:id             — get a single page's content
 *   - PATCH /v2/pages/:id/status     — update a page's status
 *
 * This utility therefore:
 *   1. Downloads a Style Dictionary-compatible JSON for manual/post-sync import.
 *   2. Optionally reads styleguide page status via the real API.
 */

const ZH_API_BASE = 'https://zeroheight.com/open_api/v2';

/** Download a Style Dictionary-compatible JSON file from the current token set. */
export function downloadStyleDictionaryJson(tokens: SingleToken[], filename = 'tokens-style-dictionary.json') {
    const styleDictionary: Record<string, any> = {};

    tokens.forEach((token) => {
        const parts = token.name.split('.');
        let node = styleDictionary;
        parts.forEach((part, i) => {
            if (i === parts.length - 1) {
                node[part] = {
                    value: token.value,
                    type: token.type,
                    ...(token.description ? { comment: token.description } : {}),
                };
            } else {
                if (!node[part]) node[part] = {};
                node = node[part];
            }
        });
    });

    const blob = new Blob([JSON.stringify(styleDictionary, null, 2)], { type: 'application/json;charset=utf-8' });
    saveAs(blob, filename);
}

/** Read styleguide pages via the real Zeroheight API (requires Enterprise + Bearer token). */
export async function getZeroheightPages(apiToken: string, styleguideId: string): Promise<{ id: string; name: string; status?: string }[]> {
    const res = await fetch(`${ZH_API_BASE}/styleguides/${styleguideId}/pages`, {
        headers: { Authorization: `Bearer ${apiToken}` },
    });
    if (!res.ok) throw new Error(`Zeroheight API error: ${res.status} ${res.statusText}`);
    const data = await res.json();
    return (data.data || []).map((p: any) => ({ id: p.id, name: p.name, status: p.status }));
}

/** Update a page's status via the real Zeroheight API (requires Enterprise + Bearer token). */
export async function updateZeroheightPageStatus(apiToken: string, pageId: string, status: string): Promise<void> {
    const res = await fetch(`${ZH_API_BASE}/pages/${pageId}/status`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error(`Zeroheight API error: ${res.status} ${res.statusText}`);
}

/**
 * Legacy export function — kept for backward compatibility.
 * Always downloads a JSON file. The API key parameter is no longer used
 * for pushing (that endpoint doesn't exist) but is kept to avoid breaking
 * existing callers.
 */
export async function exportToZeroheight(tokens: SingleToken[], _apiKey?: string) {
    downloadStyleDictionaryJson(tokens);
}
