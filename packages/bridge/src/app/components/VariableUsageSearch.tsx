import React, {
  useCallback, useEffect, useRef, useState, startTransition,
} from 'react';
import {
  TextInput, Badge, Spinner, Button, DropdownMenu,
} from '@tokens-studio/ui';
import { Search, Xmark, MultiWindow, Clock } from 'iconoir-react';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import Box from './Box';
import Stack from './Stack';
import { TabRoot } from '@/app/components/ui';
import { AsyncMessageChannel } from '@/AsyncMessageChannel';
import { AsyncMessageTypes, VariableUsageResult, TextStyleUsageResult } from '@/types/AsyncMessages';

// ─── Sub-components ──────────────────────────────────────────────────────────

const ComponentUsageItem = React.memo(({
  componentName,
  nodeIds,
  onSelect,
}: {
  componentName: string;
  nodeIds: string[];
  onSelect: (ids: string[]) => void;
}) => {
  const handleClick = useCallback(() => {
    onSelect(nodeIds);
  }, [onSelect, nodeIds]);

  return (
    <Box
      as="button"
      onClick={handleClick}
      css={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '$2 $3',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        '&:hover': { background: '$bgSubtle' },
        gap: '$2',
      }}
    >
      <Box css={{
        fontSize: '$bodySm', color: '$fgDefault', flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}
      >
        {componentName}
      </Box>
      <Badge>
        {nodeIds.length}
        {' '}
        {nodeIds.length === 1 ? 'node' : 'nodes'}
      </Badge>
    </Box>
  );
});
ComponentUsageItem.displayName = 'ComponentUsageItem';

// ─── Suggestion Dropdown ──────────────────────────────────────────────────────

const SuggestionDropdown = React.memo(({
  suggestions,
  onSelect,
}: {
  suggestions: string[];
  onSelect: (s: string) => void;
}) => {
  if (suggestions.length === 0) return null;
  return (
    <Box css={{
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      zIndex: 100,
      background: '$bgCanvas',
      border: '1px solid $borderMuted',
      borderRadius: '$medium',
      boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
      maxHeight: '180px',
      overflowY: 'auto',
      marginTop: '2px',
      '&::-webkit-scrollbar': { width: '4px' },
      '&::-webkit-scrollbar-track': { background: 'var(--colors-bgSubtle)' },
      '&::-webkit-scrollbar-thumb': { background: 'var(--colors-borderMuted)', borderRadius: '10px' },
    }}
    >
      {suggestions.map((s) => (
        <Box
          key={s}
          as="button"
          onClick={() => onSelect(s)}
          css={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '$2 $3',
            fontSize: '$bodySm',
            color: '$fgDefault',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            '&:hover': { background: '$bgSubtle' },
          }}
        >
          {s}
        </Box>
      ))}
    </Box>
  );
});
SuggestionDropdown.displayName = 'SuggestionDropdown';

// ─── Filter type ──────────────────────────────────────────────────────────────
type FilterType = 'all' | 'components' | 'frames';

// ─── Main Component ───────────────────────────────────────────────────────────

type SearchResultItem = (VariableUsageResult & { itemType: 'variable' }) | (TextStyleUsageResult & { itemType: 'textStyle' });

function VariableUsageSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [allPages, setAllPages] = useState(true); // true means "All Pages"
  const [availablePages, setAvailablePages] = useState<{ id: string; name: string }[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [showPageDropdown, setShowPageDropdown] = useState(false);
  const pageDropdownRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [displayCount, setDisplayCount] = useState(50);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [progressText, setProgressText] = useState('');

  // Recent searches
  const RECENT_KEY = 'variable-search-recent';
  const MAX_RECENT = 8;
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const addRecentSearch = useCallback((q: string) => {
    if (!q.trim()) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s !== q);
      const updated = [q, ...filtered].slice(0, MAX_RECENT);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, []);

  const removeRecentSearch = useCallback((q: string) => {
    setRecentSearches((prev) => {
      const updated = prev.filter((s) => s !== q);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, []);

  const clearAllRecent = useCallback(() => {
    setRecentSearches([]);
    try { localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pageDropdownRef.current && !pageDropdownRef.current.contains(event.target as Node)) {
        setShowPageDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live suggestions state
  const [allVarNames, setAllVarNames] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLDivElement>(null);

  // Load variable and text style names on mount for suggestions (plugin provides them via search with empty query)
  useEffect(() => {
    let cancelled = false;
    AsyncMessageChannel.ReactInstance.message({
      type: AsyncMessageTypes.SEARCH_VARIABLE_USAGE,
      query: '',
      allPages: true,
      suggestionsOnly: true,
    }).then((resp: any) => {
      if (!cancelled) {
        const varNames = resp.variables.map((v: any) => v.variableName);
        const styleNames = (resp.textStyles || []).map((s: any) => s.styleName);
        setAllVarNames([...varNames, ...styleNames]);
      }
    }).catch(() => { /* ignore */ });

    AsyncMessageChannel.ReactInstance.message({
      type: AsyncMessageTypes.GET_PAGES,
    }).then((resp: any) => {
      if (!cancelled && resp.pages) {
        setAvailablePages(resp.pages);
      }
    }).catch(() => { /* ignore */ });

    return () => { cancelled = true; };
  }, []);

  // Listen for progress updates from plugin
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { pluginMessage } = event.data;
      if (pluginMessage && pluginMessage.type === 'scan-progress') {
        setProgressText(pluginMessage.text);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Debounced full search
  const runSearch = useCallback(async (q: string, pages: boolean, pageIds: string[]) => {
    console.log(`[UI] runSearch triggered with query: "${q}", allPages: ${pages}`);
    setIsLoading(true);
    setHasSearched(true);
    setProgressText('');
    setDisplayCount(50);
    try {
      const response = await AsyncMessageChannel.ReactInstance.message({
        type: AsyncMessageTypes.SEARCH_VARIABLE_USAGE,
        query: q,
        allPages: pages,
        pageIds,
      });
      const variableItems: SearchResultItem[] = (response.variables || []).map((v: any) => ({ ...v, itemType: 'variable' }));
      const textStyleItems: SearchResultItem[] = (response.textStyles || []).map((s: any) => ({ ...s, itemType: 'textStyle' }));
      const sorted = [...variableItems, ...textStyleItems].sort((a: any, b: any) => (b.totalCount || 0) - (a.totalCount || 0));
      setIsLoading(false);
      startTransition(() => setResults(sorted));
    } catch (err) {
      setResults([]);
      setIsLoading(false);
    }
  }, []);

  const handleSearch = useCallback(() => {
    runSearch(searchQuery, allPages, selectedPageIds);
    setShowSuggestions(false);
    addRecentSearch(searchQuery);
  }, [runSearch, searchQuery, allPages, selectedPageIds, addRecentSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }, [handleSearch]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    // Live suggestions: fuzzy filter local var names
    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    suggestDebounceRef.current = setTimeout(() => {
      if (val.trim().length === 0) {
        setSuggestions([]);
        setShowSuggestions(false);
      } else {
        const q = val.toLowerCase();
        const matched = allVarNames
          .filter((n) => n.toLowerCase().includes(q))
          .slice(0, 10);
        setSuggestions(matched);
        setShowSuggestions(matched.length > 0);
      }
    }, 150);
  }, [allVarNames]);

  const handleClear = useCallback(() => {
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setResults([]);
    setHasSearched(false);
  }, []);

  const handleSuggestionSelect = useCallback((s: string) => {
    setSearchQuery(s);
    setShowSuggestions(false);
    runSearch(s, allPages, selectedPageIds);
    addRecentSearch(s);
  }, [allPages, selectedPageIds, runSearch, addRecentSearch]);

  const handleRecentSelect = useCallback((q: string) => {
    setSearchQuery(q);
    runSearch(q, allPages, selectedPageIds);
    addRecentSearch(q);
  }, [allPages, selectedPageIds, runSearch, addRecentSearch]);

  const toggleAllPages = useCallback(() => {
    setAllPages(true);
    setSelectedPageIds([]);
    setShowPageDropdown(false);
  }, []);

  const handlePageSelect = useCallback((id: string) => {
    setAllPages(false);
    setSelectedPageIds((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id];
      // If toggling off the last one, revert to All Pages
      if (next.length === 0) {
        setAllPages(true);
      }
      return next;
    });
  }, []);

  const handleSelectNodes = useCallback(async (nodeIds: string[]) => {
    try {
      await AsyncMessageChannel.ReactInstance.message({
        type: AsyncMessageTypes.SELECT_NODES,
        ids: nodeIds,
      });
    } catch (_) { /* ignore */ }
  }, []);

  const handleLoadMore = useCallback(() => {
    setDisplayCount((prev) => prev + 50);
  }, []);

  // Apply component-type filter
  const filteredResults = results.filter((v: any) => {
    if (filter === 'all') return true;
    const hasComponents = v.components.some((c: any) => c.componentName !== '(Unstyled / Frame)');
    if (filter === 'components') return hasComponents;
    if (filter === 'frames') return !hasComponents && v.totalCount > 0;
    return true;
  });

  const getItemId = (item: SearchResultItem) => (item.itemType === 'variable' ? item.variableId : item.styleId);
  const getItemName = (item: SearchResultItem) => (item.itemType === 'variable' ? item.variableName : item.styleName);

  const visibleResults = filteredResults.slice(0, displayCount);

  return (
    <TabRoot css={{ gap: '$2' }}>

      {/* ── Search Header ─────────────────────────────── */}
      <Box css={{
        padding: '$2 $4', borderBottom: '1px solid $borderMuted', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', gap: '$3',
      }}
      >
        {/* Pages Dropdown */}
        <Box css={{ position: 'relative' }} ref={pageDropdownRef}>
          <Button
            variant="secondary"
            onClick={() => setShowPageDropdown((p) => !p)}
            css={{ display: 'flex', gap: '$1', alignItems: 'center', minWidth: 'max-content' }}
          >
            {allPages ? 'All Pages' : `${selectedPageIds.length} Pages`}
            <ChevronDownIcon />
          </Button>

          {showPageDropdown && (
            <Box css={{
              position: 'absolute',
              top: '100%',
              left: 0,
              zIndex: 200,
              background: '$bgCanvas',
              border: '1px solid $borderMuted',
              borderRadius: '$medium',
              boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
              minWidth: '200px',
              maxHeight: '240px',
              overflowY: 'auto',
              marginTop: '4px',
              display: 'flex',
              flexDirection: 'column',
              padding: '$2',
              gap: '4px',
              '&::-webkit-scrollbar': { width: '4px' },
              '&::-webkit-scrollbar-track': { background: 'var(--colors-bgSubtle)' },
              '&::-webkit-scrollbar-thumb': { background: 'var(--colors-borderMuted)', borderRadius: '10px' },
            }}
            >
              <Box
                as="button"
                onClick={toggleAllPages}
                css={{
                  textAlign: 'left',
                  padding: '$1 $2',
                  fontSize: '$bodyXs',
                  color: allPages ? '$fgOnEmphasis' : '$fgDefault',
                  background: allPages ? '$accentDefault' : 'transparent',
                  border: 'none',
                  borderRadius: '$small',
                  cursor: 'pointer',
                  '&:hover': { background: allPages ? '$accentDefault' : '$bgSubtle' },
                }}
              >
                Select All Pages
              </Box>
              <Box css={{
                height: '1px', background: '$borderMuted', margin: '4px 0', flexShrink: 0,
              }}
              />
              {availablePages.map((page) => {
                const isSelected = selectedPageIds.includes(page.id);
                return (
                  <Box
                    key={page.id}
                    as="button"
                    onClick={() => handlePageSelect(page.id)}
                    css={{
                      textAlign: 'left',
                      padding: '$1 $2',
                      fontSize: '$bodyXs',
                      color: isSelected ? '$fgOnEmphasis' : '$fgDefault',
                      background: isSelected ? '$accentDefault' : 'transparent',
                      border: 'none',
                      borderRadius: '$small',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '$2',
                      '&:hover': { background: isSelected ? '$accentDefault' : '$bgSubtle' },
                    }}
                  >
                    <Box css={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '2px',
                      border: isSelected ? 'none' : '1px solid $borderMuted',
                      background: isSelected ? 'currentColor' : 'transparent',
                      position: 'relative',
                    }}
                    >
                      {isSelected && (
                        <Box css={{
                          position: 'absolute',
                          top: '1px',
                          left: '4px',
                          width: '4px',
                          height: '8px',
                          border: 'solid $bgCanvas',
                          borderWidth: '0 2px 2px 0',
                          transform: 'rotate(45deg)',
                        }}
                        />
                      )}
                    </Box>
                    {page.name}
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>

        {/* Filter / Components Dropdown (Matches mockup "Components" button) */}
        <DropdownMenu>
          <DropdownMenu.Trigger asChild>
            <Button variant="secondary" css={{ display: 'flex', gap: '$1', alignItems: 'center', minWidth: 'max-content', textTransform: 'capitalize' }}>
              {filter}
              <ChevronDownIcon />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            {(['all', 'components', 'frames'] as FilterType[]).map((f) => (
              <DropdownMenu.Item
                key={f}
                onSelect={() => setFilter(f)}
                css={{ textTransform: 'capitalize' }}
              >
                {f}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu>

        {/* Search row */}
        <Box css={{ display: 'flex', alignItems: 'center', gap: '$2', flexGrow: 1 }}>
          {/* Input wrapper for suggestions positioning */}
          <Box css={{ flexGrow: 1, position: 'relative' }} ref={searchInputRef}>
            <TextInput
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              type="text"
              placeholder="Search variables..."
              leadingVisual={<Search />}
              trailingAction={
                searchQuery
                  ? (
                    <Box
                      as="button"
                      onClick={handleClear}
                      css={{
                        background: 'none', border: 'none', cursor: 'pointer', color: '$fgSubtle', display: 'flex', alignItems: 'center', padding: '0 $1', '&:hover': { color: '$fgDefault' },
                      }}
                    >
                      <Xmark width={12} height={12} />
                    </Box>
                  )
                  : undefined
              }
            />
            {/* Live suggestions */}
            {showSuggestions && (
              <SuggestionDropdown
                suggestions={suggestions}
                onSelect={handleSuggestionSelect}
              />
            )}
          </Box>

          {/* Search button */}
          <Button
            variant="primary"
            onClick={handleSearch}
            disabled={isLoading}
            css={{
              flexShrink: 0,
              gap: '$1',
              backgroundColor: '$accentDefault',
              color: '$fgOnEmphasis',
              borderRadius: '$medium',
              padding: '$2 $4',
              '&:hover': { backgroundColor: '$accentHover' }
            }}
          >
            <Search width={14} height={14} />
            {isLoading ? '…' : 'Search'}
          </Button>
        </Box>
      </Box>

      {/* ── Recent Searches ────────────────────────────── */}
      {recentSearches.length > 0 && !hasSearched && (
        <Box css={{
          padding: '$2 $3',
          display: 'flex',
          flexDirection: 'column',
          gap: '$2',
        }}>
          <Box css={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <Box css={{ display: 'flex', alignItems: 'center', gap: '$1', color: '$fgMuted' }}>
              <Clock width={12} height={12} />
              <span style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.3px', textTransform: 'uppercase' }}>Recent Searches</span>
            </Box>
            <Box
              as="button"
              onClick={clearAllRecent}
              css={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '10px',
                color: '$fgSubtle',
                '&:hover': { color: '$fgDefault' },
                padding: 0,
              }}
            >
              Clear all
            </Box>
          </Box>
          <Box css={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {recentSearches.map((q) => (
              <Box
                key={q}
                css={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '100px',
                  border: '1px solid $borderMuted',
                  background: '$bgSubtle',
                  fontSize: '11px',
                  color: '$fgDefault',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    background: '$bgEmphasis',
                    borderColor: '$accentDefault',
                    color: '$fgOnEmphasis',
                  },
                }}
              >
                <Box
                  as="button"
                  onClick={() => handleRecentSelect(q)}
                  css={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'inherit',
                    padding: 0,
                    fontSize: 'inherit',
                    fontFamily: 'inherit',
                  }}
                >
                  {q}
                </Box>
                <Box
                  as="button"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    removeRecentSearch(q);
                  }}
                  css={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '$fgSubtle',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    '&:hover': { color: '$dangerFg' },
                  }}
                >
                  <Xmark width={10} height={10} />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* ── Results ───────────────────────────────────── */}
      <Box
        css={{
          flexGrow: 1,
          overflowY: 'auto',
          padding: '$2',
          '&::-webkit-scrollbar': { width: '4px' },
          '&::-webkit-scrollbar-track': { background: 'var(--colors-bgSubtle)' },
          '&::-webkit-scrollbar-thumb': { background: 'var(--colors-borderMuted)', borderRadius: '10px' },
          '&::-webkit-scrollbar-thumb:hover': { background: 'var(--colors-borderDefault)' },
        }}
      >
        {/* Loading */}
        {isLoading && (
          <Box
            css={{
              padding: '$6 $4',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '$2',
              color: '$fgSubtle',
              fontSize: '$bodySm',
              backgroundColor: '$bgSubtle',
              borderRadius: '$medium',
              margin: '$4',
              border: '1px solid $borderMuted',
            }}
          >
            <Spinner />
            <Box css={{ color: '$fgDefault', fontWeight: '$sansBold', marginTop: '$2' }}>
              Scanning document…
            </Box>
            <Box>
              {progressText || (allPages ? 'Preparing to scan all pages…' : 'Scanning current page…')}
            </Box>
            <Box css={{ marginTop: '$1', fontSize: '$bodyXs', color: '$fgMuted' }}>
              This may take a moment for large files, but you can keep working in Figma.
            </Box>
          </Box>
        )}

        {/* Empty states */}
        {!isLoading && hasSearched && filteredResults.length === 0 && (
          <Box css={{
            padding: '$8',
            textAlign: 'center',
            color: '$fgSubtle',
            fontSize: '$bodySm',
            backgroundColor: '$bgSubtle',
            borderRadius: '$medium',
            margin: '$4',
            border: '1px solid $borderMuted',
          }}
          >
            <Box css={{ color: '$fgDefault', fontWeight: '$sansBold', marginBottom: '$2' }}>No variables found</Box>
            Try searching for a different term or adjust your filters.
            {filter !== 'all' && (
              <Button
                variant="invisible"
                onClick={() => setFilter('all')}
                css={{
                  display: 'block', margin: '$3 auto 0', color: '$accentDefault', fontSize: '$bodySm', textDecoration: 'underline',
                }}
              >
                Clear filter
              </Button>
            )}
          </Box>
        )}

        {!isLoading && !hasSearched && (
          <Box css={{
            padding: '$8',
            textAlign: 'center',
            color: '$fgSubtle',
            fontSize: '$bodySm',
            backgroundColor: '$bgSubtle',
            borderRadius: '$medium',
            margin: '$4',
            border: '1px solid $borderMuted',
          }}
          >
            <Box css={{ color: '$fgDefault', fontWeight: '$sansBold', marginBottom: '$2' }}>Search Variables</Box>
            Type a variable name to search.
            {allPages && (
              <Box css={{ marginTop: '$2', color: '$fgSubtle', fontSize: '$bodyXs' }}>
                All-pages mode: scanning every page in the document.
              </Box>
            )}
          </Box>
        )}

        {/* Result cards */}
        {!isLoading && visibleResults.map((item) => {
          const componentsToShow = item.components.filter((c) => c.componentName !== '(Unstyled / Frame)');
          const framesOnly = item.components.filter((c) => c.componentName === '(Unstyled / Frame)');
          const itemId = getItemId(item);
          const itemName = getItemName(item);
          const collectionLabel = item.itemType === 'variable' ? item.collectionName : 'Local';

          const isExpanded = !!expandedItems[itemId];
          const MAX_COMPONENTS = 20;
          const componentsVisible = isExpanded ? componentsToShow : componentsToShow.slice(0, MAX_COMPONENTS);
          const hiddenCount = componentsToShow.length - MAX_COMPONENTS;

          return (
            <Box
              key={itemId}
              css={{
                border: '1px solid $borderMuted', borderRadius: '$medium', marginBottom: '$2', overflow: 'hidden',
              }}
            >
              {/* Header row */}
              <Box
                data-id={itemId}
                css={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '$3',
                  background: item.totalCount > 0 ? '$bgSubtle' : 'transparent',
                  border: 'none',
                  textAlign: 'left',
                }}
              >
                <Stack direction="column" gap={1} css={{ flexGrow: 1, overflow: 'hidden' }}>
                  <Box css={{
                    fontSize: '$small', fontWeight: '$sansBold', color: '$fgDefault', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                  >
                    {itemName}
                  </Box>
                  <Box css={{
                    fontSize: '$label', color: '$fgSubtle', display: 'flex', gap: '$2', alignItems: 'center', flexWrap: 'wrap',
                  }}
                  >
                    <Badge variant={item.itemType === 'textStyle' ? 'accent' : undefined} css={{ fontSize: '$label' }}>
                      {item.itemType === 'variable' ? 'Variable' : 'Text Style'}
                    </Badge>
                    <span>{collectionLabel}</span>
                    <span title="Used by N components">
                      <strong>Used by</strong>
                      {' '}
                      {componentsToShow.length}
                      {' '}
                      {componentsToShow.length === 1 ? 'component' : 'components'}
                    </span>
                    {item.itemType === 'variable' && (item as VariableUsageResult).modeCount != null && (item as VariableUsageResult).modeCount! > 0 && (
                      <span title={(item as VariableUsageResult).modeNames?.join(', ') || ''}>
                        <strong>Affects</strong>
                        {' '}
                        {(item as VariableUsageResult).modeCount}
                        {' '}
                        {(item as VariableUsageResult).modeCount === 1 ? 'mode' : 'modes'}
                      </span>
                    )}
                    {item.pageName && allPages && (
                      <Badge variant="accent" css={{ fontSize: '$label' }}>
                        {item.pageName}
                      </Badge>
                    )}
                  </Box>
                </Stack>
                <Stack direction="row" gap={2} align="center" css={{ flexShrink: 0 }}>
                  <Badge variant={item.totalCount > 0 ? 'accent' : undefined} title="Total node instances">
                    {item.totalCount}
                    {' '}
                    {item.totalCount === 1 ? 'use' : 'uses'}
                  </Badge>
                  {item.itemType === 'variable' && (item as VariableUsageResult).modeCount != null && (item as VariableUsageResult).modeCount! > 0 && (
                    <Badge title={`Affects ${(item as VariableUsageResult).modeNames?.join(', ') || 'these modes'}`}>
                      {(item as VariableUsageResult).modeCount}
                      {' '}
                      {(item as VariableUsageResult).modeCount === 1 ? 'mode' : 'modes'}
                    </Badge>
                  )}
                </Stack>
              </Box>

              {/* Component list */}
              <Box css={{ borderTop: '1px solid $borderMuted' }}>
                {componentsToShow.length > 0 && (
                  <Box>
                    <Box css={{
                      padding: '$1 $3', fontSize: '$bodyXs', color: '$fgSubtle', fontWeight: '$sansBold', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid $borderMuted', background: '$bgCanvas',
                    }}
                    >
                      Components (
                      {componentsToShow.length}
                      )
                    </Box>
                    {componentsVisible.map((comp) => (
                      <ComponentUsageItem
                        key={comp.componentName}
                        componentName={comp.componentName}
                        nodeIds={comp.nodeIds}
                        onSelect={handleSelectNodes}
                      />
                    ))}
                    {!isExpanded && hiddenCount > 0 && (
                      <Button
                        variant="invisible"
                        onClick={() => setExpandedItems((prev) => ({ ...prev, [itemId]: true }))}
                        css={{ width: '100%', padding: '$2', fontSize: '$bodySm', color: '$accentDefault', textDecoration: 'underline' }}
                      >
                        Show {hiddenCount} more components
                      </Button>
                    )}
                  </Box>
                )}

                {framesOnly.length > 0 && (
                  <Box>
                    <Box css={{
                      padding: '$1 $3', fontSize: '$bodyXs', color: '$fgSubtle', fontWeight: '$sansBold', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid $borderMuted', background: '$bgCanvas', borderTop: componentsToShow.length > 0 ? '1px solid $borderMuted' : 'none',
                    }}
                    >
                      Frames / Groups (
                      {framesOnly[0].nodeIds.length}
                      {' '}
                      nodes)
                    </Box>
                    <Box css={{
                      padding: '$2 $3', fontSize: '$bodySm', color: '$fgMuted', display: 'flex', alignItems: 'center', gap: '$2',
                    }}
                    >
                      Used in unstyled frames or groups.
                      <Button
                        variant="invisible"
                        onClick={() => handleSelectNodes(framesOnly[0].nodeIds)}
                        css={{
                          color: '$accentDefault', fontSize: '$bodySm', textDecoration: 'underline', padding: 0, height: 'auto', minHeight: 'auto',
                        }}
                      >
                        Select all
                      </Button>
                    </Box>
                  </Box>
                )}

                {componentsToShow.length === 0 && framesOnly.length === 0 && (
                  <Box css={{ padding: '$2 $3', fontSize: '$bodySm', color: '$fgSubtle' }}>
                    No usage found on this page.
                  </Box>
                )}
              </Box>
            </Box>
          );
        })}

        {/* Load more */}
        {
          !isLoading && filteredResults.length > displayCount && (
            <Button
              variant="secondary"
              onClick={handleLoadMore}
              css={{
                display: 'block',
                width: '100%',
                marginTop: '$2',
              }}
            >
              Load more (showing
              {' '}
              {displayCount}
              {' '}
              of
              {' '}
              {filteredResults.length}
              )
            </Button>
          )
        }
      </Box>

      {/* ── Footer Summary ────────────────────────────── */}
      {
        !isLoading && hasSearched && results.length > 0 && (
          <Box css={{
            padding: '$2 $4', borderTop: '1px solid $borderMuted', fontSize: '$bodySm', color: '$fgSubtle', display: 'flex', justifyContent: 'space-between', flexShrink: 0,
          }}
          >
            <span>
              {filteredResults.length}
              {filter !== 'all' ? ` ${filter}` : ''}
              {' '}
              variable
              {filteredResults.length !== 1 ? 's' : ''}
              {allPages ? ' (all pages)' : ''}
            </span>
            <span>
              {results.reduce((sum, v) => sum + v.totalCount, 0)}
              {' '}
              total uses
            </span>
          </Box>
        )
      }
    </TabRoot>
  );
}

export default VariableUsageSearch;
