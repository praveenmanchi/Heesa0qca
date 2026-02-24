# Settings Tab Technical Documentation

The Settings Tab manages the plugin's configuration, including sync providers, window dimensions, and storage preferences.

## 📌 Functionality Overview
- **Sync Providers**: Configures external sources like GitHub, GitLab, and JSONBin.
- **Storage Switching**: Toggle between Local storage and Remote storage providers.
- **Persistence Settings**: Controls how often tokens are saved and where credentials are kept.

## 🛠 Technical Implementation

### Sync Provider Architecture
The plugin supports multiple `StorageProviderType`s. Each provider has its own credential requirements and fetch/push logic.

```tsx
// SyncSettings.tsx
const providers = useMemo(() => [
    { text: 'GitHub', type: StorageProviderType.GITHUB },
    { text: 'GitLab', type: StorageProviderType.GITLAB },
    // ...
], [t]);
```

### Remote Token Lifecycle
The `useRemoteTokens` hook manages the orchestration of fetching tokens from a provider and updating the Redux state.

```tsx
// Fetching logic snippet
const { fetchBranches } = useRemoteTokens();

const setLocalBranches = React.useCallback(async (provider: StorageTypeCredentials) => {
    const branches = await fetchBranches(provider);
    if (branches) {
        dispatch.branchState.setBranches(branches);
    }
}, [dispatch.branchState, fetchBranches]);
```

### Persistence Logic
Settings are persisted in `figma.clientStorage` (unique to the user/machine) for credentials, while document-specific settings use `sharedPluginData`.

```tsx
// Updating UI state persistence
dispatch.uiState.setLocalApiState({ ...provider, migrating });
```

## 📡 API Usage

### Figma Plugin API
- **`figma.clientStorage.setAsync`**: Used to securely store Personal Access Tokens (PATs) locally.
- **`figma.ui.resize`**: Controlled via the `RESIZE_WINDOW` message to adjust the plugin's aspect ratio.

### IPC Protocol
| Message Type | Direction | Purpose |
| --- | --- | --- |
| `CREDENTIALS` | UI -> Plugin | Pushes new sync provider credentials to local storage. |
| `SET_STORAGE_TYPE` | UI -> Plugin | Updates whether the plugin is in "Local" or "Sync" mode. |
| `RESIZE_WINDOW` | UI -> Plugin | Adjusts the dimensions of the plugin window. |

## 💡 Key Information for Developers
- **Security**: Never store Personal Access Tokens in `SharedPluginData`; always use `clientStorage` to keep them private to the user.
- **Sync States**: The plugin tracks unsaved changes and "out of sync" states to prevent data loss during multi-player collaboration.
- **Credential Migration**: Legacy credential formats are handled during initialization to ensure backward compatibility.
