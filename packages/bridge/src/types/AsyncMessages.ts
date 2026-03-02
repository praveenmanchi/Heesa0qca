import { UpdateMode } from '@/constants/UpdateMode';
import type { SettingsState } from '@/app/store/models/settings';
import type { Properties } from '@/constants/Properties';
import type { TokenTypes } from '@/constants/TokenTypes';
import type { NodeInfo } from './NodeInfo';
import type { NodeTokenRefMap } from './NodeTokenRefMap';
import type { PullStyleOptions } from './PullStylesOptions';
import type { PullVariablesOptions } from './PullVariablesOptions';
import type { ThemeObjectsList } from './ThemeObjectsList';
import type { AnyTokenList } from './tokens';
import type { UsedTokenSetsMap } from './UsedTokenSetsMap';
import type { StorageProviderType, StorageType, StorageTypeCredentials } from './StorageType';
import type { Direction } from '@/constants/Direction';
import type { SelectionValue } from './SelectionValue';
import type { startup } from '@/utils/plugin';
import type { ThemeObject } from './ThemeObject';
import { DeleteTokenPayload } from './payloads';
import { TokensToRenamePayload } from '@/app/store/useTokens';
import { AuthData } from './Auth';
import { LocalVariableInfo } from '@/plugin/createLocalVariablesInPlugin';
import { ResolvedVariableInfo } from '@/plugin/asyncMessageHandlers';
import { RenameVariableToken } from '@/app/store/models/reducers/tokenState';
import { UpdateTokenVariablePayload } from './payloads/UpdateTokenVariablePayload';
import { TokenFormatOptions } from '@/plugin/TokenFormatStoreClass';
import { ExportTokenSet } from './ExportTokenSet';
import type { VariableCollectionInfo } from './VariableCollectionSelection';
import type { LogEntry } from './LogEntry';

export enum AsyncMessageTypes {
  // the below messages are going from UI to plugin
  CREATE_STYLES = 'async/create-styles',
  RENAME_STYLES = 'async/rename-styles',
  REMOVE_STYLES = 'async/remove-styles',
  CREDENTIALS = 'async/credentials',
  CHANGED_TABS = 'async/changed-tabs',
  SET_ONBOARDINGEXPLAINERSETS = 'async/set-onboardingExplainerSets',
  SET_ONBOARDINGEXPLAINEREXPORTSETS = 'async/set-onboardingExplainerExportSets',
  SET_ONBOARDINGEXPLAINERSYNCPROVIDERS = 'async/set-onboardingExplainerSyncProviders',
  SET_ONBOARDINGEXPLAINERINSPECT = 'async/set-onboardingExplainerInspect',
  REMOVE_SINGLE_CREDENTIAL = 'async/remove-single-credential',
  SET_STORAGE_TYPE = 'async/set-storage-type',
  SET_NODE_DATA = 'async/set-node-data',
  REMOVE_TOKENS_BY_VALUE = 'async/remove-tokens-by-value',
  REMAP_TOKENS = 'async/remap-tokens',
  BULK_REMAP_TOKENS = 'async/bulk-remap-tokens',
  GOTO_NODE = 'async/goto-node',
  SELECT_NODES = 'async/select-nodes',
  PULL_STYLES = 'async/pull-styles',
  PULL_VARIABLES = 'async/pull-variables',
  NOTIFY = 'async/notify',
  CANCEL_OPERATION = 'async/cancel-operation',
  RESIZE_WINDOW = 'async/resize-window',
  SET_SHOW_EMPTY_GROUPS = 'async/set-show-empty-groups',
  SET_UI = 'async/set-ui',
  CREATE_ANNOTATION = 'async/create-annotation',
  UPDATE = 'async/update',
  UPDATE_CHECK_FOR_CHANGES = 'async/update-check-for-changes',
  SET_LICENSE_KEY = 'async/set-license-key',
  ATTACH_LOCAL_STYLES_TO_THEME = 'async/attach-local-styles-to-theme',
  RESOLVE_STYLE_INFO = 'async/resolve-style-info',
  CALCULATE_VARIABLES_IMPACT = 'async/calculate-variables-impact',
  SET_NONE_VALUES_ON_NODE = 'async/set-none-values-on-node',
  SET_AUTH_DATA = 'async/set-auth-data',
  SET_USED_EMAIL = 'async/set-used-email',
  SET_VARIABLES = 'async/set-variables',
  REMOVE_RELAUNCH_DATA = 'async/remove-relaunch-data',
  SET_VARIABLE_EXPORT_SETTINGS = 'async/set-variable-export-settings',
  SET_SELECTED_EXPORT_THEMES = 'async/set-selected-export-themes',
  CREATE_LIVING_DOCUMENTATION = 'async/create-living-documentation',
  SEARCH_VARIABLE_USAGE = 'async/search-variable-usage',
  CREATE_CHANGE_LOG_FRAME = 'async/create-change-log-frame',
  GET_SELECTION_VISUALIZATION = 'async/get-selection-visualization',
  GET_NODE_VARIABLES = 'async/get-node-variables',
  GET_PAGES = 'async/get-pages',
  GET_COMPONENTS = 'async/get-components',
  // the below messages are going from plugin to UI
  STARTUP = 'async/startup',
  GET_THEME_INFO = 'async/get-theme-info',
  GET_FIGMA_FONTS = 'async/get-figma-fonts',
  REMOVE_STYLES_WITHOUT_CONNECTION = 'async/remove-styles-without-connection',
  CREATE_LOCAL_VARIABLES = 'async/create-local-variables',
  CREATE_LOCAL_VARIABLES_WITHOUT_MODES = 'async/create-local-variables-without-modes',
  RESOLVE_VARIABLE_INFO = 'async/resolve-variable-info',
  ATTACH_LOCAL_VARIABLES_TO_THEME = 'async/attach-local-variables-to-theme',
  RENAME_VARIABLES = 'async/rename-variables',
  UPDATE_VARIABLES = 'async/update-variables',
  SET_INITIAL_LOAD = 'async/set-initial-load',
  PREVIEW_REQUEST_STARTUP = 'async/preview-request-startup',
  GET_AVAILABLE_VARIABLE_COLLECTIONS = 'async/get-available-variable-collections',
  EXTRACT_VARIABLES_TO_CANVAS = 'async/extract-variables-to-canvas',
  GET_UXAI_HISTORY = 'async/get-uxai-history',
  SET_UXAI_HISTORY = 'async/set-uxai-history',
  APPLY_UXAI_CHANGES = 'async/apply-uxai-changes',
  GENERATE_STYLE_GUIDE = 'async/generate-style-guide',
  UPDATE_STYLE_GUIDE = 'async/update-style-guide',
  GENERATE_STYLE_GUIDE_FROM_VARIABLES = 'async/generate-style-guide-from-variables',
}

export type AsyncMessage<T extends AsyncMessageTypes, P = unknown> = P & { type: T };

export type CredentialsAsyncMessage = AsyncMessage<AsyncMessageTypes.CREDENTIALS, {
  credential: StorageTypeCredentials;
}>;
export type CredentialsAsyncMessageResult = AsyncMessage<AsyncMessageTypes.CREDENTIALS>;

export type ChangedTabsAsyncMessage = AsyncMessage<AsyncMessageTypes.CHANGED_TABS, { requiresSelectionValues: boolean; }>;
export type ChangedTabsAsyncMessageResult = AsyncMessage<AsyncMessageTypes.CHANGED_TABS>;

export type SetOnboardingExplainerSetsAsyncMessage = AsyncMessage<AsyncMessageTypes.SET_ONBOARDINGEXPLAINERSETS, { onboardingExplainerSets: boolean; }>;
export type SetOnboardingExplainerSetsAsyncMessageResult = AsyncMessage<AsyncMessageTypes.SET_ONBOARDINGEXPLAINERSETS>;

export type SetOnboardingExplainerExportSetsAsyncMessage = AsyncMessage<AsyncMessageTypes.SET_ONBOARDINGEXPLAINEREXPORTSETS, { onboardingExplainerExportSets: boolean; }>;
export type SetOnboardingExplainerExportSetsAsyncMessageResult = AsyncMessage<AsyncMessageTypes.SET_ONBOARDINGEXPLAINEREXPORTSETS>;

export type SetOnboardingExplainerSyncProvidersAsyncMessage = AsyncMessage<AsyncMessageTypes.SET_ONBOARDINGEXPLAINERSYNCPROVIDERS, { onboardingExplainerSyncProviders: boolean; }>;
export type SetOnboardingExplainerSyncProvidersAsyncMessageResult = AsyncMessage<AsyncMessageTypes.SET_ONBOARDINGEXPLAINERSYNCPROVIDERS>;

export type SetOnboardingExplainerInspectAsyncMessage = AsyncMessage<AsyncMessageTypes.SET_ONBOARDINGEXPLAINERINSPECT, { onboardingExplainerInspect: boolean; }>;
export type SetOnboardingExplainerInspectAsyncMessageResult = AsyncMessage<AsyncMessageTypes.SET_ONBOARDINGEXPLAINERINSPECT>;

export type RemoveSingleCredentialAsyncMessage = AsyncMessage<AsyncMessageTypes.REMOVE_SINGLE_CREDENTIAL, { context: StorageTypeCredentials; }>;
export type RemoveSingleCredentialAsyncMessageResult = AsyncMessage<AsyncMessageTypes.REMOVE_SINGLE_CREDENTIAL>;

export type SetStorageTypeAsyncMessage = AsyncMessage<AsyncMessageTypes.SET_STORAGE_TYPE, { storageType: StorageType; }>;
export type SetStorageTypeAsyncMessageResult = AsyncMessage<AsyncMessageTypes.SET_STORAGE_TYPE>;

export type SetNodeDataAsyncMessage = AsyncMessage<AsyncMessageTypes.SET_NODE_DATA, { values: NodeTokenRefMap; tokens: AnyTokenList; settings: SettingsState; }>;
export type SetNodeDataAsyncMessageResult = AsyncMessage<AsyncMessageTypes.SET_NODE_DATA>;

export type RemoveTokensByValueAsyncMessage = AsyncMessage<AsyncMessageTypes.REMOVE_TOKENS_BY_VALUE, {
  tokensToRemove: { nodes: NodeInfo[]; property: Properties }[];
}>;
export type RemoveTokensByValueAsyncMessageResult = AsyncMessage<AsyncMessageTypes.REMOVE_TOKENS_BY_VALUE>;

export type SetNoneValuesOnNodeAsyncMessage = AsyncMessage<AsyncMessageTypes.SET_NONE_VALUES_ON_NODE, {
  tokensToSet: { nodes: NodeInfo[]; property: Properties }[];
  tokens: AnyTokenList
}>;
export type SetNoneValuesOnNodeAsyncMessageResult = AsyncMessage<AsyncMessageTypes.SET_NONE_VALUES_ON_NODE>;

export type RemapTokensAsyncMessage = AsyncMessage<AsyncMessageTypes.REMAP_TOKENS, {
  oldName: string;
  newName: string;
  updateMode: UpdateMode;
  category?: Properties | TokenTypes;
  tokens?: AnyTokenList;
  settings?: SettingsState;
}>;
export type RemapTokensMessageAsyncResult = AsyncMessage<AsyncMessageTypes.REMAP_TOKENS>;

export type BulkRemapTokensAsyncMessage = AsyncMessage<AsyncMessageTypes.BULK_REMAP_TOKENS, {
  oldName: string;
  newName: string;
  updateMode: UpdateMode;
  useRegex: boolean;
}>;
export type BulkRemapTokensMessageAsyncResult = AsyncMessage<AsyncMessageTypes.BULK_REMAP_TOKENS>;

export type GotoNodeAsyncMessage = AsyncMessage<AsyncMessageTypes.GOTO_NODE, {
  id: string;
}>;
export type GotoNodeMessageAsyncResult = AsyncMessage<AsyncMessageTypes.GOTO_NODE>;

export type SelectNodesAsyncMessage = AsyncMessage<AsyncMessageTypes.SELECT_NODES, { ids: string[] }>;
export type SelectNodesMessageAsyncResult = AsyncMessage<AsyncMessageTypes.SELECT_NODES>;

export type PullStylesAsyncMessage = AsyncMessage<AsyncMessageTypes.PULL_STYLES, { styleTypes: PullStyleOptions; }>;
export type PullStylesAsyncMessageResult = AsyncMessage<AsyncMessageTypes.PULL_STYLES>;

export type PullVariablesAsyncMessage = AsyncMessage<AsyncMessageTypes.PULL_VARIABLES, {
  options: PullVariablesOptions;
  themes: ThemeObjectsList;
  proUser: boolean;
}>;
export type PullVariablesMessageResult = AsyncMessage<AsyncMessageTypes.PULL_VARIABLES>;

export type NotifyAsyncMessage = AsyncMessage<AsyncMessageTypes.NOTIFY, {
  msg: string;
  opts: {
    error?: boolean
  };
}>;
export type NotifyAsyncMessageResult = AsyncMessage<AsyncMessageTypes.NOTIFY>;

export type ResizeWindowAsyncMessage = AsyncMessage<AsyncMessageTypes.RESIZE_WINDOW, {
  width: number;
  height: number;
}>;
export type ResizeWindowAsyncMessageResult = AsyncMessage<AsyncMessageTypes.RESIZE_WINDOW>;

export type CancelOperationAsyncMessage = AsyncMessage<AsyncMessageTypes.CANCEL_OPERATION>;
export type CancelOperationAsyncMessageResult = AsyncMessage<AsyncMessageTypes.CANCEL_OPERATION>;

export type SetShowEmptyGroupsAsyncMessage = AsyncMessage<AsyncMessageTypes.SET_SHOW_EMPTY_GROUPS, { showEmptyGroups: boolean; }>;
export type SetShowEmptyGroupsAsyncMessageResult = AsyncMessage<AsyncMessageTypes.SET_SHOW_EMPTY_GROUPS>;

export type SetUiAsyncMessage = AsyncMessage<AsyncMessageTypes.SET_UI, SettingsState>;
export type SetUiAsyncMessageResult = AsyncMessage<AsyncMessageTypes.SET_UI>;

export type CreateAnnotationAsyncMessage = AsyncMessage<AsyncMessageTypes.CREATE_ANNOTATION, {
  tokens: SelectionValue;
  direction: Direction;
}>;
export type CreateAnnotationAsyncMessageResult = AsyncMessage<AsyncMessageTypes.CREATE_ANNOTATION>;

export type CreateLivingDocumentationAsyncMessage = AsyncMessage<AsyncMessageTypes.CREATE_LIVING_DOCUMENTATION, {
  tokenSet: string;
  startsWith: string;
  applyTokens: boolean;
  resolvedTokens: AnyTokenList;
  useRegex?: boolean;
}>;
export type CreateLivingDocumentationAsyncMessageResult = AsyncMessage<AsyncMessageTypes.CREATE_LIVING_DOCUMENTATION>;

export type StyleGuideThemeData = {
  theme: ThemeObject;
  resolvedTokens: AnyTokenList;
};

export type GenerateStyleGuideAsyncMessage = AsyncMessage<AsyncMessageTypes.GENERATE_STYLE_GUIDE, {
  themeData: StyleGuideThemeData[];
}>;
export type GenerateStyleGuideAsyncMessageResult = AsyncMessage<AsyncMessageTypes.GENERATE_STYLE_GUIDE>;

export type UpdateStyleGuideAsyncMessage = AsyncMessage<AsyncMessageTypes.UPDATE_STYLE_GUIDE, {
  themeData: StyleGuideThemeData[];
}>;
export type UpdateStyleGuideAsyncMessageResult = AsyncMessage<AsyncMessageTypes.UPDATE_STYLE_GUIDE>;

export type StyleGuideVariableData = {
  id: string;
  name: string;
  description?: string;
  type: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  collectionId: string;
  collectionName: string;
  resolvedValue: any;
  /**
   * Raw Figma values by modeId. Used so the plugin side can
   * re-resolve VARIABLE_ALIAS chains for the active mode.
   */
  valuesByMode?: Record<string, any>;
};

export type StyleGuideGroupsConfig = {
  /**
   * Ordered list of group identifiers (typically the first path segment,
   * e.g. "BorderRadius", "Size", "Space"). Groups not present here fall
   * back to alphabetical order after the ordered ones.
   */
  order?: string[];
  /**
   * Group identifiers that should be hidden entirely from the generated
   * style guide for this collection + mode.
   */
  hidden?: string[];
  /**
   * Whether to generate separate FrameNodes for each root group (artboards)
   * instead of a single long frame.
   */
  splitArtboards?: boolean;
};

export type GenerateStyleGuideFromVariablesAsyncMessage = AsyncMessage<AsyncMessageTypes.GENERATE_STYLE_GUIDE_FROM_VARIABLES, {
  variables: StyleGuideVariableData[];
  collectionName: string;
  modeName: string;
  /**
   * The Figma modeId for which we’re generating the style guide.
   * This allows the plugin to correctly resolve aliases per mode.
   */
  modeId: string;
  /**
   * Optional configuration describing how variable groups should be ordered
   * and which groups should be hidden for this collection + mode.
   */
  groupsConfig?: StyleGuideGroupsConfig;
}>;
export type GenerateStyleGuideFromVariablesAsyncMessageResult = AsyncMessage<AsyncMessageTypes.GENERATE_STYLE_GUIDE_FROM_VARIABLES>;

export type GetComponentAsyncMessage = AsyncMessage<AsyncMessageTypes.GET_COMPONENTS>;
export type GetComponentAsyncMessageResult = AsyncMessage<AsyncMessageTypes.GET_COMPONENTS, {
  components: { name: string; id: string }[];
}>;

export type CreateStylesAsyncMessage = AsyncMessage<AsyncMessageTypes.CREATE_STYLES, {
  tokens: AnyTokenList;
  sourceTokens: AnyTokenList;
  settings: SettingsState;
  selectedTheme?: ThemeObject;
}>;
export type CreateStylesAsyncMessageResult = AsyncMessage<AsyncMessageTypes.CREATE_STYLES, {
  styleIds: Record<string, string>;
}>;

export type RenameStylesAsyncMessage = AsyncMessage<AsyncMessageTypes.RENAME_STYLES, {
  tokensToRename: TokensToRenamePayload[];
  parent: string;
  settings: Partial<SettingsState>;
}>;
export type RenameStylesAsyncMessageResult = AsyncMessage<AsyncMessageTypes.RENAME_STYLES, {
  styleIds: string[];
}>;

export type RemoveStylesAsyncMessage = AsyncMessage<AsyncMessageTypes.REMOVE_STYLES, {
  token: DeleteTokenPayload;
  settings: Partial<SettingsState>;
}>;
export type RemoveStylesAsyncMessageResult = AsyncMessage<AsyncMessageTypes.REMOVE_STYLES, {
  styleIds: string[];
}>;

export type UpdateAsyncMessage = AsyncMessage<AsyncMessageTypes.UPDATE, {
  tokenValues: Record<string, AnyTokenList>;
  tokens: AnyTokenList | null;
  themes: ThemeObjectsList
  compressedTokens: string;
  compressedThemes: string;
  updatedAt: string;
  settings: SettingsState;
  usedTokenSet: UsedTokenSetsMap;
  activeTheme: Record<string, string>;
  checkForChanges?: boolean
  shouldSwapStyles?: boolean;
  collapsedTokenSets: string[];
  tokenFormat: TokenFormatOptions;
  storageProvider: StorageProviderType;
  storageSize: number;
}>;
export type UpdateAsyncMessageResult = AsyncMessage<AsyncMessageTypes.UPDATE, {
  nodes: number
}>;

export type UpdateCheckForChangesAsyncMessage = AsyncMessage<AsyncMessageTypes.UPDATE_CHECK_FOR_CHANGES, {
  checkForChanges: boolean;
}>;
export type UpdateCheckForChangesAsyncMessageResult = AsyncMessage<AsyncMessageTypes.UPDATE_CHECK_FOR_CHANGES>;

export type SetLicenseKeyMessage = AsyncMessage<AsyncMessageTypes.SET_LICENSE_KEY, {
  licenseKey: string | null
}>;
export type SetLicenseKeyMessageResult = AsyncMessage<AsyncMessageTypes.SET_LICENSE_KEY>;

export type SetInitialLoadMessage = AsyncMessage<AsyncMessageTypes.SET_INITIAL_LOAD, {
  initialLoad: boolean | null
}>;
export type SetInitialLoadMessageResult = AsyncMessage<AsyncMessageTypes.SET_INITIAL_LOAD>;

export type AttachLocalStylesToTheme = AsyncMessage<AsyncMessageTypes.ATTACH_LOCAL_STYLES_TO_THEME, {
  theme: ThemeObject
  tokens: Record<string, AnyTokenList>
  category: 'typography' | 'colors' | 'effects' | 'all'
  settings?: Partial<SettingsState>
}>;
export type AttachLocalStylesToThemeResult = AsyncMessage<AsyncMessageTypes.ATTACH_LOCAL_STYLES_TO_THEME, ThemeObject>;

export type ResolveStyleInfo = AsyncMessage<AsyncMessageTypes.RESOLVE_STYLE_INFO, {
  styleIds: string[]
}>;
export type ResolveStyleInfoResult = AsyncMessage<AsyncMessageTypes.RESOLVE_STYLE_INFO, {
  resolvedValues: {
    id: string
    key?: string
    name?: string
  }[];
}>;

export type GetThemeInfoMessage = AsyncMessage<AsyncMessageTypes.GET_THEME_INFO>;
export type GetThemeInfoMessageResult = AsyncMessage<AsyncMessageTypes.GET_THEME_INFO, {
  activeTheme: Record<string, string>
  themes: ThemeObjectsList
}>;

export type StartupMessage = AsyncMessage<AsyncMessageTypes.STARTUP, (
  ReturnType<typeof startup> extends Promise<infer V> ? V : unknown
)>;
export type StartupMessageResult = AsyncMessage<AsyncMessageTypes.STARTUP>;

export type GetFigmaFontsMessage = AsyncMessage<AsyncMessageTypes.GET_FIGMA_FONTS>;
export type GetFigmaFontsMessageResult = AsyncMessage<AsyncMessageTypes.GET_FIGMA_FONTS, {
  fonts: Array<Font>
}>;

export type GetAvailableVariableCollectionsMessage = AsyncMessage<AsyncMessageTypes.GET_AVAILABLE_VARIABLE_COLLECTIONS>;
export type GetAvailableVariableCollectionsMessageResult = AsyncMessage<AsyncMessageTypes.GET_AVAILABLE_VARIABLE_COLLECTIONS, {
  collections: VariableCollectionInfo[]
}>;

export type RemoveStylesWithoutConnectionMessage = AsyncMessage<AsyncMessageTypes.REMOVE_STYLES_WITHOUT_CONNECTION, {
  usedStyleIds: string[]
}>;
export type RemoveStylesWithoutConnectionResult = AsyncMessage<AsyncMessageTypes.REMOVE_STYLES_WITHOUT_CONNECTION, {
  countOfRemovedStyles: number
}>;
export type SetAuthDataMessage = AsyncMessage<AsyncMessageTypes.SET_AUTH_DATA, {
  auth: AuthData | null
}>;
export type SetAuthDataMessageResult = AsyncMessage<AsyncMessageTypes.SET_AUTH_DATA>;

export type SetUsedEmailMessage = AsyncMessage<AsyncMessageTypes.SET_USED_EMAIL, {
  email: string | undefined
}>;

export type SetUsedEmailMessageResult = AsyncMessage<AsyncMessageTypes.SET_USED_EMAIL>;

export type CreateLocalVariablesAsyncMessage = AsyncMessage<AsyncMessageTypes.CREATE_LOCAL_VARIABLES, {
  tokens: Record<string, AnyTokenList>;
  settings: SettingsState,
  selectedThemes?: string[]
}>;
export type CreateLocalVariablesAsyncMessageResult = AsyncMessage<AsyncMessageTypes.CREATE_LOCAL_VARIABLES, {
  variableIds: Record<string, LocalVariableInfo>
  totalVariables: number
  details?: {
    created: string[];
    updated: string[];
    renamed: string[];
    removed: string[];
  };
}>;

export type CreateLocalVariablesWithoutModesAsyncMessage = AsyncMessage<AsyncMessageTypes.CREATE_LOCAL_VARIABLES_WITHOUT_MODES, {
  tokens: Record<string, AnyTokenList>;
  settings: SettingsState,
  selectedSets: ExportTokenSet[]
}>;
export type CreateLocalVariablesWithoutModesAsyncMessageResult = AsyncMessage<AsyncMessageTypes.CREATE_LOCAL_VARIABLES_WITHOUT_MODES, {
  variableIds: Record<string, LocalVariableInfo>
  totalVariables: number
}>;

export type ResolveVariableInfo = AsyncMessage<AsyncMessageTypes.RESOLVE_VARIABLE_INFO, {
  variableIds: string[]
}>;
export type ResolveVariableInfoResult = AsyncMessage<AsyncMessageTypes.RESOLVE_VARIABLE_INFO, {
  resolvedValues: Record<string, ResolvedVariableInfo>;
}>;

export type AttachLocalVariablesToTheme = AsyncMessage<AsyncMessageTypes.ATTACH_LOCAL_VARIABLES_TO_THEME, {
  theme: ThemeObject
  tokens: Record<string, AnyTokenList>
}>;
export type AttachLocalVariablesToThemeResult = AsyncMessage<AsyncMessageTypes.ATTACH_LOCAL_VARIABLES_TO_THEME, {
  variableInfo: LocalVariableInfo | null
}>;

export type RenameVariablesAsyncMessage = AsyncMessage<AsyncMessageTypes.RENAME_VARIABLES, {
  tokens: {
    oldName: string;
    newName: string;
  }[]
}>;
export type RenameVariablesAsyncMessageResult = AsyncMessage<AsyncMessageTypes.RENAME_VARIABLES, {
  renameVariableToken: RenameVariableToken[];
}>;

export type UpdateVariablesAsyncMessage = AsyncMessage<AsyncMessageTypes.UPDATE_VARIABLES, {
  payload: UpdateTokenVariablePayload
}>;
export type UpdateVariablesAsyncMessageResult = AsyncMessage<AsyncMessageTypes.UPDATE_VARIABLES, {
  details?: {
    created: string[];
    updated: string[];
    renamed: string[];
    removed: string[];
  };
}>;

export type RemoveRelaunchDataMessage = AsyncMessage<
  AsyncMessageTypes.REMOVE_RELAUNCH_DATA,
  {
    area: UpdateMode;
  }
>;
export type RemoveRelaunchDataMessageResult = AsyncMessage<AsyncMessageTypes.REMOVE_RELAUNCH_DATA>;

export type SetVariableExportSettingsMessage = AsyncMessage<AsyncMessageTypes.SET_VARIABLE_EXPORT_SETTINGS, {
  settings: string;
}>;
export type SetVariableExportSettingsMessageResult = AsyncMessage<AsyncMessageTypes.SET_VARIABLE_EXPORT_SETTINGS>;

export type SetSelectedExportThemesMessage = AsyncMessage<AsyncMessageTypes.SET_SELECTED_EXPORT_THEMES, {
  themes: string;
}>;
export type SetSelectedExportThemesMessageResult = AsyncMessage<AsyncMessageTypes.SET_SELECTED_EXPORT_THEMES>;

export type PreviewRequestStartupAsyncMessage = AsyncMessage<AsyncMessageTypes.PREVIEW_REQUEST_STARTUP>;
export type PreviewRequestStartupAsyncMessageResult = AsyncMessage<AsyncMessageTypes.PREVIEW_REQUEST_STARTUP>;

export interface VariableComponentUsage {
  componentName: string;
  nodeIds: string[];
}

export interface VariableUsageResult {
  variableName: string;
  variableId: string;
  collectionName: string;
  totalCount: number;
  componentCount: number;
  components: VariableComponentUsage[];
  pageName?: string;
  /** Number of modes this variable affects (from its collection) */
  modeCount?: number;
  /** Mode names for display (e.g. ["Gap 1.0", "Old Navy 2.0"]) */
  modeNames?: string[];
  /** Resolved type of the variable (COLOR, FLOAT, STRING, BOOLEAN) */
  resolvedType?: string;
  /** Mode values with their names */
  modes?: { modeId: string; modeName: string; value: any }[];
}

export interface TextStyleUsageResult {
  styleName: string;
  styleId: string;
  totalCount: number;
  componentCount: number;
  components: VariableComponentUsage[];
  pageName?: string;
}

export interface SelectionVisualizationVariable {
  variableId: string;
  variableName: string;
  collectionName: string;
  resolvedType?: string;
  totalCount: number;
  componentCount: number;
}

export interface SelectionVisualizationNode {
  id: string;
  name: string;
  type: string;
  children: SelectionVisualizationNode[];
  variables: SelectionVisualizationVariable[];
}

export type SearchVariableUsageAsyncMessage = AsyncMessage<AsyncMessageTypes.SEARCH_VARIABLE_USAGE, {
  query: string;
  allPages?: boolean;
  pageIds?: string[];
  /**
   * When true, only check nodes that are part of a Component or Instance.
   * This drastically increases search speed by skipping deep variable/style checks on raw frames.
   */
  onlyComponents?: boolean;
  /**
   * When true, only fetches and returns matching variables and styles without traversing the document.
   * Useful for populating autocomplete suggestions efficiently.
   */
  suggestionsOnly?: boolean;
}>;
export type SearchVariableUsageAsyncMessageResult = AsyncMessage<AsyncMessageTypes.SEARCH_VARIABLE_USAGE, {
  variables: VariableUsageResult[];
  textStyles?: TextStyleUsageResult[];
}>;

export type CalculateVariablesImpactAsyncMessage = AsyncMessage<AsyncMessageTypes.CALCULATE_VARIABLES_IMPACT, {
  variableIds: string[];
}>;
export type CalculateVariablesImpactAsyncMessageResult = AsyncMessage<AsyncMessageTypes.CALCULATE_VARIABLES_IMPACT, {
  variables: VariableUsageResult[];
}>;

export type SetVariablesAsyncMessage = AsyncMessage<AsyncMessageTypes.SET_VARIABLES, {
  variables?: Variable[];
}>;
export type SetVariablesAsyncMessageResult = AsyncMessage<AsyncMessageTypes.SET_VARIABLES>;

export type CreateChangeLogFrameAsyncMessage = AsyncMessage<AsyncMessageTypes.CREATE_CHANGE_LOG_FRAME, {
  logs: LogEntry[];
}>;
export type CreateChangeLogFrameAsyncMessageResult = AsyncMessage<AsyncMessageTypes.CREATE_CHANGE_LOG_FRAME>;

export type ExtractVariablesToCanvasAsyncMessage = AsyncMessage<AsyncMessageTypes.EXTRACT_VARIABLES_TO_CANVAS>;
export type CollectionModeInfo = { modeId: string; name: string };
export type CollectionInfo = { id: string; name: string; modes: CollectionModeInfo[] };
export type ExtractVariablesToCanvasAsyncMessageResult = AsyncMessage<AsyncMessageTypes.EXTRACT_VARIABLES_TO_CANVAS, {
  jsonString: string;
  collectionsInfo?: CollectionInfo[];
}>;

export type GetSelectionVisualizationAsyncMessage = AsyncMessage<
  AsyncMessageTypes.GET_SELECTION_VISUALIZATION,
  {}
>;

export type GetSelectionVisualizationAsyncMessageResult = AsyncMessage<
  AsyncMessageTypes.GET_SELECTION_VISUALIZATION,
  {
    root?: SelectionVisualizationNode;
    selectionName?: string;
  }
>;

export type GetNodeVariablesAsyncMessage = AsyncMessage<AsyncMessageTypes.GET_NODE_VARIABLES, { nodeId: string }>;
export type GetNodeVariablesAsyncMessageResult = AsyncMessage<AsyncMessageTypes.GET_NODE_VARIABLES, { root?: SelectionVisualizationNode }>;

export interface UxaiHistoryEntry {
  id: string;
  prompt: string;
  result: { summary: string; componentImpact: string; suggestions: string; proposedChanges?: string; rawResponse?: string };
  timestamp: number;
}

export type GetUxaiHistoryAsyncMessage = AsyncMessage<AsyncMessageTypes.GET_UXAI_HISTORY>;
export type GetUxaiHistoryAsyncMessageResult = AsyncMessage<AsyncMessageTypes.GET_UXAI_HISTORY, { history: UxaiHistoryEntry[] }>;

export type GetPagesAsyncMessage = AsyncMessage<AsyncMessageTypes.GET_PAGES>;
export type GetPagesAsyncMessageResult = AsyncMessage<AsyncMessageTypes.GET_PAGES, { pages: { id: string, name: string }[] }>;

export type SetUxaiHistoryAsyncMessage = AsyncMessage<AsyncMessageTypes.SET_UXAI_HISTORY, { history: UxaiHistoryEntry[] }>;
export type SetUxaiHistoryAsyncMessageResult = AsyncMessage<AsyncMessageTypes.SET_UXAI_HISTORY>;

export type UxaiVariableUpdate = { variableId: string; variableName?: string; modeId: string; value: string | number | boolean; type: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN' };
export type UxaiVariableCreate = { collectionId: string; variableName: string; modeId: string; value: string | number | boolean; type: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN'; remapFromVariableId?: string };
export type ApplyUxaiChangesAsyncMessage = AsyncMessage<AsyncMessageTypes.APPLY_UXAI_CHANGES, {
  updates: UxaiVariableUpdate[];
  creates: UxaiVariableCreate[];
}>;
export type ApplyUxaiChangesAsyncMessageResult = AsyncMessage<AsyncMessageTypes.APPLY_UXAI_CHANGES, { applied: number; errors: string[] }>;

export type AsyncMessages =
  CreateStylesAsyncMessage
  | RenameStylesAsyncMessage
  | RemoveStylesAsyncMessage
  | CredentialsAsyncMessage
  | ChangedTabsAsyncMessage
  | RemoveSingleCredentialAsyncMessage
  | SetStorageTypeAsyncMessage
  | SetOnboardingExplainerSetsAsyncMessage
  | SetOnboardingExplainerExportSetsAsyncMessage
  | SetOnboardingExplainerInspectAsyncMessage
  | SetOnboardingExplainerSyncProvidersAsyncMessage
  | SetNodeDataAsyncMessage
  | RemoveTokensByValueAsyncMessage
  | RemapTokensAsyncMessage
  | BulkRemapTokensAsyncMessage
  | GotoNodeAsyncMessage
  | SelectNodesAsyncMessage
  | PullStylesAsyncMessage
  | PullVariablesAsyncMessage
  | NotifyAsyncMessage
  | ResizeWindowAsyncMessage
  | CancelOperationAsyncMessage
  | SetShowEmptyGroupsAsyncMessage
  | SetUiAsyncMessage
  | CreateAnnotationAsyncMessage
  | CreateLivingDocumentationAsyncMessage
  | UpdateAsyncMessage
  | UpdateCheckForChangesAsyncMessage
  | GetThemeInfoMessage
  | SetLicenseKeyMessage
  | SetInitialLoadMessage
  | StartupMessage
  | AttachLocalStylesToTheme
  | ResolveStyleInfo
  | SetNoneValuesOnNodeAsyncMessage
  | GetFigmaFontsMessage
  | GetAvailableVariableCollectionsMessage
  | SetAuthDataMessage
  | SetUsedEmailMessage
  | CreateLocalVariablesAsyncMessage
  | CreateLocalVariablesWithoutModesAsyncMessage
  | ResolveVariableInfo
  | AttachLocalVariablesToTheme
  | RenameVariablesAsyncMessage
  | UpdateVariablesAsyncMessage
  | PreviewRequestStartupAsyncMessage
  | RemoveRelaunchDataMessage
  | RemoveStylesWithoutConnectionMessage
  | SetVariableExportSettingsMessage
  | SetSelectedExportThemesMessage
  | SearchVariableUsageAsyncMessage
  | SetVariableExportSettingsMessage
  | SetSelectedExportThemesMessage
  | SearchVariableUsageAsyncMessage
  | SetVariablesAsyncMessage
  | CreateChangeLogFrameAsyncMessage
  | ExtractVariablesToCanvasAsyncMessage
  | GetUxaiHistoryAsyncMessage
  | SetUxaiHistoryAsyncMessage
  | ApplyUxaiChangesAsyncMessage
  | CalculateVariablesImpactAsyncMessage
  | GenerateStyleGuideAsyncMessage
  | UpdateStyleGuideAsyncMessage
  | GenerateStyleGuideFromVariablesAsyncMessage
  | GetSelectionVisualizationAsyncMessage
  | GetNodeVariablesAsyncMessage
  | GetPagesAsyncMessage
  | GetComponentAsyncMessage;

export type AsyncMessageResults =
  CreateStylesAsyncMessageResult
  | RenameStylesAsyncMessageResult
  | RemoveStylesAsyncMessageResult
  | CredentialsAsyncMessageResult
  | ChangedTabsAsyncMessageResult
  | RemoveSingleCredentialAsyncMessageResult
  | SetStorageTypeAsyncMessageResult
  | SetOnboardingExplainerSetsAsyncMessageResult
  | SetOnboardingExplainerExportSetsAsyncMessageResult
  | SetOnboardingExplainerSyncProvidersAsyncMessageResult
  | SetOnboardingExplainerInspectAsyncMessageResult
  | SetNodeDataAsyncMessageResult
  | RemoveTokensByValueAsyncMessageResult
  | RemapTokensMessageAsyncResult
  | BulkRemapTokensMessageAsyncResult
  | GotoNodeMessageAsyncResult
  | SelectNodesMessageAsyncResult
  | PullStylesAsyncMessageResult
  | PullVariablesMessageResult
  | NotifyAsyncMessageResult
  | ResizeWindowAsyncMessageResult
  | CancelOperationAsyncMessage
  | SetShowEmptyGroupsAsyncMessageResult
  | SetUiAsyncMessageResult
  | CreateAnnotationAsyncMessageResult
  | CreateLivingDocumentationAsyncMessageResult
  | UpdateAsyncMessageResult
  | UpdateCheckForChangesAsyncMessageResult
  | GetThemeInfoMessageResult
  | SetLicenseKeyMessageResult
  | SetInitialLoadMessageResult
  | StartupMessageResult
  | AttachLocalStylesToThemeResult
  | ResolveStyleInfoResult
  | SetNoneValuesOnNodeAsyncMessageResult
  | GetFigmaFontsMessageResult
  | GetAvailableVariableCollectionsMessageResult
  | SetAuthDataMessageResult
  | SetUsedEmailMessageResult
  | CreateLocalVariablesAsyncMessageResult
  | CreateLocalVariablesWithoutModesAsyncMessageResult
  | ResolveVariableInfoResult
  | AttachLocalVariablesToThemeResult
  | RenameVariablesAsyncMessageResult
  | UpdateVariablesAsyncMessageResult
  | PreviewRequestStartupAsyncMessageResult
  | RemoveRelaunchDataMessageResult
  | RemoveStylesWithoutConnectionResult
  | SetVariableExportSettingsMessageResult
  | SetSelectedExportThemesMessageResult
  | SearchVariableUsageAsyncMessageResult
  | SetSelectedExportThemesMessageResult
  | SearchVariableUsageAsyncMessageResult
  | SetVariablesAsyncMessageResult
  | CreateChangeLogFrameAsyncMessageResult
  | ExtractVariablesToCanvasAsyncMessageResult
  | GetUxaiHistoryAsyncMessageResult
  | SetUxaiHistoryAsyncMessageResult
  | ApplyUxaiChangesAsyncMessageResult
  | CalculateVariablesImpactAsyncMessageResult
  | GenerateStyleGuideAsyncMessageResult
  | UpdateStyleGuideAsyncMessageResult
  | GenerateStyleGuideFromVariablesAsyncMessageResult
  | GetSelectionVisualizationAsyncMessageResult
  | GetNodeVariablesAsyncMessageResult
  | GetPagesAsyncMessageResult
  | GetComponentAsyncMessageResult;

export type AsyncMessagesMap = {
  [K in AsyncMessageTypes]: Extract<AsyncMessages, { type: K }>
};
export type AsyncMessageResultsMap = {
  [K in AsyncMessageTypes]: Extract<AsyncMessageResults, { type: K }>
};
