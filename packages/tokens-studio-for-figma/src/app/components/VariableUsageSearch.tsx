import React, {
    useCallback, useEffect, useRef, useState,
} from 'react';
import { TextInput, Badge, Select } from '@tokens-studio/ui';
import { Search, Xmark, MultiWindow } from 'iconoir-react';
import Box from './Box';
import Stack from './Stack';
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
            <Box css={{ fontSize: '$xsmall', color: '$fgDefault', flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
            border: '1px solid $borderSubtle',
            borderRadius: '$medium',
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            maxHeight: '180px',
            overflowY: 'auto',
            marginTop: '2px',
            '&::-webkit-scrollbar': { width: '4px' },
            '&::-webkit-scrollbar-track': { background: 'var(--colors-bgSubtle)' },
            '&::-webkit-scrollbar-thumb': { background: 'var(--colors-borderMuted)', borderRadius: '10px' },
        }}>
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
                        fontSize: '$xsmall',
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
    const [expandedVars, setExpandedVars] = useState<Set<string>>(new Set());
    const [allPages, setAllPages] = useState(false);
    const [filter, setFilter] = useState<FilterType>('all');
    const [displayCount, setDisplayCount] = useState(50);

    // Live suggestions state
    const [allVarNames, setAllVarNames] = useState<string[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchInputRef = useRef<HTMLDivElement>(null);

    // Load variable and text style names on mount for suggestions (plugin provides them via search with empty query)
    useEffect(() => {
        let cancelled = false;
        AsyncMessageChannel.ReactInstance.message({
            type: AsyncMessageTypes.SEARCH_VARIABLE_USAGE,
            query: '',
            allPages: false,
        }).then((resp) => {
            if (!cancelled) {
                const varNames = resp.variables.map((v) => v.variableName);
                const styleNames = (resp.textStyles || []).map((s) => s.styleName);
                setAllVarNames([...varNames, ...styleNames]);
            }
        }).catch(() => { /* ignore */ });
        return () => { cancelled = true; };
    }, []);

    // Debounced full search
    const runSearch = useCallback(async (q: string, pages: boolean) => {
        setIsLoading(true);
        setHasSearched(true);
        setDisplayCount(50);
        try {
            const response = await AsyncMessageChannel.ReactInstance.message({
                type: AsyncMessageTypes.SEARCH_VARIABLE_USAGE,
                query: q,
                allPages: pages,
            });
            const variableItems: SearchResultItem[] = (response.variables || []).map((v) => ({ ...v, itemType: 'variable' }));
            const textStyleItems: SearchResultItem[] = (response.textStyles || []).map((s) => ({ ...s, itemType: 'textStyle' }));
            setResults([...variableItems, ...textStyleItems].sort((a, b) => (b.totalCount || 0) - (a.totalCount || 0)));
        } catch (err) {
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleSearch = useCallback(() => {
        runSearch(searchQuery, allPages);
        setShowSuggestions(false);
    }, [runSearch, searchQuery, allPages]);

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

        // Debounced auto-search after 400ms of no typing
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            if (val.trim().length >= 2) {
                runSearch(val, allPages);
            } else if (val.trim().length === 0) {
                setResults([]);
                setHasSearched(false);
            }
        }, 400);
    }, [allVarNames, allPages, runSearch]);

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
        runSearch(s, allPages);
    }, [allPages, runSearch]);

    const toggleAllPages = useCallback(() => {
        setAllPages((prev) => {
            const next = !prev;
            if (hasSearched) runSearch(searchQuery, next);
            return next;
        });
    }, [hasSearched, runSearch, searchQuery]);

    const toggleExpand = useCallback((varId: string) => {
        setExpandedVars((prev) => {
            const next = new Set(prev);
            if (next.has(varId)) next.delete(varId);
            else next.add(varId);
            return next;
        });
    }, []);

    const handleToggleExpand = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const id = e.currentTarget.dataset.id;
        if (id) toggleExpand(id);
    }, [toggleExpand]);

    const handleSelectNodes = useCallback(async (nodeIds: string[]) => {
        try {
            await AsyncMessageChannel.ReactInstance.message({
                type: AsyncMessageTypes.SELECT_NODES,
                ids: nodeIds,
            });
        } catch (_) { /* ignore */ }
    }, []);

    const handleExpandAll = useCallback(() => {
        setExpandedVars(new Set(results.map((r) => getItemId(r))));
    }, [results]);

    const handleCollapseAll = useCallback(() => {
        setExpandedVars(new Set());
    }, []);

    const handleLoadMore = useCallback(() => {
        setDisplayCount((prev) => prev + 50);
    }, []);

    // Apply component-type filter
    const filteredResults = results.filter((v) => {
        if (filter === 'all') return true;
        const hasComponents = v.components.some((c) => c.componentName !== '(Unstyled / Frame)');
        if (filter === 'components') return hasComponents;
        if (filter === 'frames') return !hasComponents && v.totalCount > 0;
        return true;
    });

    const getItemId = (item: SearchResultItem) => (item.itemType === 'variable' ? item.variableId : item.styleId);
    const getItemName = (item: SearchResultItem) => (item.itemType === 'variable' ? item.variableName : item.styleName);

    const visibleResults = filteredResults.slice(0, displayCount);

    return (
        <Box css={{ gap: '$2', flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

            {/* ── Search Header ─────────────────────────────── */}
            <Box css={{ padding: '$3', borderBottom: '1px solid $borderMuted', display: 'flex', flexDirection: 'column', gap: '$2' }}>

                {/* Search row */}
                <Box css={{ display: 'flex', alignItems: 'center', gap: '$2' }}>
                    {/* Input wrapper for suggestions positioning */}
                    <Box css={{ flexGrow: 1, position: 'relative' }} ref={searchInputRef}>
                        <TextInput
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onKeyDown={handleKeyDown}
                            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                            type="text"
                            placeholder="Search variables and text styles…"
                            leadingVisual={<Search />}
                            trailingAction={
                                searchQuery
                                    ? (
                                        <Box
                                            as="button"
                                            onClick={handleClear}
                                            css={{ background: 'none', border: 'none', cursor: 'pointer', color: '$fgSubtle', display: 'flex', alignItems: 'center', padding: '0 $1', '&:hover': { color: '$fgDefault' } }}
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
                    <Box
                        as="button"
                        onClick={handleSearch}
                        css={{
                            padding: '$2 $4',
                            background: '$accentDefault',
                            color: '$fgOnEmphasis',
                            border: 'none',
                            borderRadius: '$small',
                            cursor: 'pointer',
                            fontSize: '$xsmall',
                            fontWeight: '$sansBold',
                            flexShrink: 0,
                            '&:hover': { opacity: 0.9 },
                            '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
                        }}
                    >
                        {isLoading ? '…' : 'Search'}
                    </Box>
                </Box>

                {/* Control row: All Pages toggle + Filter dropdown */}
                <Box css={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '$2' }}>
                    {/* All Pages toggle */}
                    <Box
                        as="button"
                        onClick={toggleAllPages}
                        css={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '$1',
                            padding: '$1 $2',
                            borderRadius: '$small',
                            border: '1px solid',
                            borderColor: allPages ? '$accentDefault' : '$borderMuted',
                            background: allPages ? '$accentMuted' : 'transparent',
                            color: allPages ? '$accentDefault' : '$fgMuted',
                            fontSize: '10px',
                            cursor: 'pointer',
                            fontWeight: allPages ? '$sansBold' : '$sans',
                            transition: 'all 0.15s',
                            '&:hover': { borderColor: '$accentDefault', color: '$accentDefault' },
                        }}
                    >
                        <MultiWindow width={12} height={12} />
                        All Pages
                    </Box>

                    {/* Filter: All / Components / Frames */}
                    {hasSearched && results.length > 0 && (
                        <Box css={{ display: 'flex', gap: '2px' }}>
                            {(['all', 'components', 'frames'] as FilterType[]).map((f) => (
                                <Box
                                    key={f}
                                    as="button"
                                    onClick={() => setFilter(f)}
                                    css={{
                                        padding: '$1 $2',
                                        fontSize: '10px',
                                        border: '1px solid',
                                        borderRadius: '$small',
                                        cursor: 'pointer',
                                        background: filter === f ? '$accentDefault' : 'transparent',
                                        color: filter === f ? '$fgOnEmphasis' : '$fgMuted',
                                        borderColor: filter === f ? '$accentDefault' : '$borderMuted',
                                        transition: 'all 0.1s',
                                        textTransform: 'capitalize',
                                        '&:hover': { borderColor: '$accentDefault' },
                                    }}
                                >
                                    {f}
                                </Box>
                            ))}
                        </Box>
                    )}
                </Box>
            </Box>

            {/* ── Results ───────────────────────────────────── */}
            <Box css={{
                flexGrow: 1,
                overflowY: 'auto',
                padding: '$2',
                '&::-webkit-scrollbar': { width: '4px' },
                '&::-webkit-scrollbar-track': { background: 'var(--colors-bgSubtle)' },
                '&::-webkit-scrollbar-thumb': { background: 'var(--colors-borderMuted)', borderRadius: '10px' },
                '&::-webkit-scrollbar-thumb:hover': { background: 'var(--colors-borderDefault)' },
            }}>
                {/* Loading */}
                {isLoading && (
                    <Box css={{ padding: '$4', textAlign: 'center', color: '$fgSubtle', fontSize: '$xsmall' }}>
                        {allPages ? 'Scanning all pages…' : 'Scanning page…'}
                    </Box>
                )}

                {/* Empty states */}
                {!isLoading && hasSearched && filteredResults.length === 0 && (
                    <Box css={{ padding: '$4', textAlign: 'center', color: '$fgSubtle', fontSize: '$xsmall' }}>
                        No variables found.
                        {filter !== 'all' && (
                            <Box
                                as="button"
                                onClick={() => setFilter('all')}
                                css={{ display: 'block', margin: '$2 auto 0', color: '$accentDefault', fontSize: '$xsmall', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                                Clear filter
                            </Box>
                        )}
                    </Box>
                )}

                {!isLoading && !hasSearched && (
                    <Box css={{ padding: '$4', textAlign: 'center', color: '$fgSubtle', fontSize: '$xsmall' }}>
                        Type a variable name to search.
                        {allPages && (
                            <Box css={{ marginTop: '$1', color: '$fgSubtle', fontSize: '10px' }}>
                                All-pages mode: scanning every page in the document.
                            </Box>
                        )}
                    </Box>
                )}

                {/* Expand / Collapse controls */}
                {!isLoading && visibleResults.length > 1 && (
                    <Box css={{ display: 'flex', justifyContent: 'flex-end', gap: '$2', marginBottom: '$2' }}>
                        <Box as="button" onClick={handleExpandAll} css={{ fontSize: '10px', color: '$accentDefault', background: 'none', border: 'none', cursor: 'pointer' }}>Expand all</Box>
                        <Box as="button" onClick={handleCollapseAll} css={{ fontSize: '10px', color: '$fgMuted', background: 'none', border: 'none', cursor: 'pointer' }}>Collapse all</Box>
                    </Box>
                )}

                {/* Result cards */}
                {!isLoading && visibleResults.map((item) => {
                    const componentsToShow = item.components.filter((c) => c.componentName !== '(Unstyled / Frame)');
                    const framesOnly = item.components.filter((c) => c.componentName === '(Unstyled / Frame)');
                    const isExpanded = expandedVars.has(getItemId(item));
                    const itemId = getItemId(item);
                    const itemName = getItemName(item);
                    const collectionLabel = item.itemType === 'variable' ? item.collectionName : 'Local';

                    return (
                        <Box
                            key={itemId}
                            css={{ border: '1px solid $borderMuted', borderRadius: '$medium', marginBottom: '$2', overflow: 'hidden' }}
                        >
                            {/* Header row */}
                            <Box
                                as="button"
                                data-id={itemId}
                                onClick={handleToggleExpand}
                                css={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    width: '100%',
                                    padding: '$3',
                                    background: item.totalCount > 0 ? '$bgSubtle' : 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    '&:hover': { background: '$bgSubtle' },
                                }}
                            >
                                <Stack direction="column" gap={1} css={{ flexGrow: 1, overflow: 'hidden' }}>
                                    <Box css={{ fontSize: '$small', fontWeight: '$sansBold', color: '$fgDefault', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {itemName}
                                    </Box>
                                    <Box css={{ fontSize: '$xxsmall', color: '$fgSubtle', display: 'flex', gap: '$2', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <Badge variant={item.itemType === 'textStyle' ? 'accent' : undefined} css={{ fontSize: '9px' }}>
                                            {item.itemType === 'variable' ? 'Variable' : 'Text Style'}
                                        </Badge>
                                        <span>{collectionLabel}</span>
                                        {item.pageName && allPages && (
                                            <Badge variant="accent" css={{ fontSize: '9px' }}>
                                                {item.pageName}
                                            </Badge>
                                        )}
                                        <span>
                                            {componentsToShow.length}
                                            {' '}
                                            {componentsToShow.length === 1 ? 'component' : 'components'}
                                        </span>
                                    </Box>
                                </Stack>
                                <Stack direction="row" gap={2} align="center" css={{ flexShrink: 0 }}>
                                    <Badge variant={item.totalCount > 0 ? 'accent' : undefined}>
                                        {item.totalCount}
                                        {' '}
                                        {item.totalCount === 1 ? 'use' : 'uses'}
                                    </Badge>
                                    <Box css={{ fontSize: '$xsmall', color: '$fgSubtle', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                                        ▼
                                    </Box>
                                </Stack>
                            </Box>

                            {/* Expanded: component list */}
                            {isExpanded && (
                                <Box css={{ borderTop: '1px solid $borderMuted' }}>
                                    {componentsToShow.length > 0 && (
                                        <Box>
                                            <Box css={{ padding: '$1 $3', fontSize: '10px', color: '$fgSubtle', fontWeight: '$sansBold', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid $borderMuted', background: '$bgCanvas' }}>
                                                Components ({componentsToShow.length})
                                            </Box>
                                            {componentsToShow.map((comp) => (
                                                <ComponentUsageItem
                                                    key={comp.componentName}
                                                    componentName={comp.componentName}
                                                    nodeIds={comp.nodeIds}
                                                    onSelect={handleSelectNodes}
                                                />
                                            ))}
                                        </Box>
                                    )}

                                    {framesOnly.length > 0 && (
                                        <Box>
                                            <Box css={{ padding: '$1 $3', fontSize: '10px', color: '$fgSubtle', fontWeight: '$sansBold', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid $borderMuted', background: '$bgCanvas', borderTop: componentsToShow.length > 0 ? '1px solid $borderMuted' : 'none' }}>
                                                Frames / Groups ({framesOnly[0].nodeIds.length} nodes)
                                            </Box>
                                            <Box css={{ padding: '$2 $3', fontSize: '$xsmall', color: '$fgMuted' }}>
                                                Used in unstyled frames or groups.
                                                {' '}
                                                <Box
                                                    as="button"
                                                    onClick={() => handleSelectNodes(framesOnly[0].nodeIds)}
                                                    css={{ background: 'none', border: 'none', color: '$accentDefault', cursor: 'pointer', fontSize: '$xsmall', textDecoration: 'underline' }}
                                                >
                                                    Select all
                                                </Box>
                                            </Box>
                                        </Box>
                                    )}

                                    {componentsToShow.length === 0 && framesOnly.length === 0 && (
                                        <Box css={{ padding: '$2 $3', fontSize: '$xsmall', color: '$fgSubtle' }}>
                                            No usage found on this page.
                                        </Box>
                                    )}
                                </Box>
                            )}
                        </Box>
                    );
                })}

                {/* Load more */}
                {!isLoading && filteredResults.length > displayCount && (
                    <Box
                        as="button"
                        onClick={handleLoadMore}
                        css={{
                            display: 'block',
                            width: '100%',
                            padding: '$2',
                            textAlign: 'center',
                            fontSize: '$xsmall',
                            color: '$accentDefault',
                            background: 'transparent',
                            border: '1px solid $borderMuted',
                            borderRadius: '$small',
                            cursor: 'pointer',
                            marginTop: '$2',
                            '&:hover': { background: '$bgSubtle' },
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
                    </Box>
                )}
            </Box>

            {/* ── Footer Summary ────────────────────────────── */}
            {!isLoading && hasSearched && results.length > 0 && (
                <Box css={{ padding: '$2 $3', borderTop: '1px solid $borderMuted', fontSize: '$xsmall', color: '$fgSubtle', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
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
            )}
        </Box>
    );
}

export default VariableUsageSearch;
