import React from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  TextInput, ToggleGroup, DropdownMenu, Button,
} from '@tokens-studio/ui';
import { Search } from 'iconoir-react';
import Box from './Box';
import InspectorDebugView from './InspectorDebugView';
import InspectorMultiView from './InspectorMultiView';
import InspectorJsonView from './InspectorJsonView';
import InspectorVisualization from './InspectorVisualization';
import IconDebug from '@/icons/debug.svg';
import IconInspect from '@/icons/multiinspect.svg';
import IconJson from '@/icons/json.svg';
import { Dispatch } from '../store';
import { mergeTokenGroups } from '@/utils/tokenHelpers';
import { track } from '@/utils/analytics';
import { isEqual } from '@/utils/isEqual';
import {
  tokensSelector,
  usedTokenSetSelector,
  uiStateSelector,
} from '@/selectors';
import InspectSearchOptionDropdown from './InspectSearchOptionDropdown';
import Stack from './Stack';
import { defaultTokenResolver } from '@/utils/TokenResolver';

function Inspector() {
  const [inspectView, setInspectView] = React.useState<'multi' | 'debug' | 'json' | 'visualization'>('multi');
  const [selectedMode, setSelectedMode] = React.useState<string>('All Modes');
  const { t } = useTranslation(['inspect']);
  const [searchInputValue, setSearchInputValue] = React.useState<string>('');
  const uiState = useSelector(uiStateSelector, isEqual);
  const tokens = useSelector(tokensSelector);
  const usedTokenSet = useSelector(usedTokenSetSelector);
  // TODO: Put this into state in a performant way
  const resolvedTokens = React.useMemo(() => (
    defaultTokenResolver.setTokens(mergeTokenGroups(tokens, usedTokenSet))
  ), [tokens, usedTokenSet]);

  const availableModes = React.useMemo(() => {
    const modes = new Set<string>();
    uiState.selectionValues.forEach((group) => {
      if (group.modes) {
        Object.keys(group.modes).forEach((mode) => modes.add(mode));
      }
    });
    return Array.from(modes);
  }, [uiState.selectionValues]);

  const handleSetInspectView = React.useCallback((view: 'multi' | 'debug' | 'json') => {
    if (view) {
      track('setInspectView', { view });
      setInspectView(view);
    }
  }, []);

  function renderInspectView() {
    switch (inspectView) {
      case 'debug':
        return <InspectorDebugView resolvedTokens={resolvedTokens} _selectedMode={selectedMode} />;
      case 'json':
        return <InspectorJsonView resolvedTokens={resolvedTokens} selectedMode={selectedMode} />;
      case 'visualization':
        return <InspectorVisualization />;
      case 'multi':
      default:
        return <InspectorMultiView resolvedTokens={resolvedTokens} tokenToSearch={searchInputValue} selectedMode={selectedMode} />;
    }
  }

  const handleSearchInputChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInputValue(event.target.value);
  }, []);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchInputValue('');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <Box css={{
      gap: '$2', flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden',
    }}
    >
      <Box css={{
        display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '$3', padding: '$2 $4', borderBottom: '1px solid $borderSubtle', backgroundColor: 'transparent', flexShrink: 0,
      }}
      >
        <Stack direction="row" align="center" gap={2}>
          {availableModes.length > 0 && (
            <DropdownMenu>
              <DropdownMenu.Trigger asChild>
                <Button asDropdown size="small" variant="secondary">
                  {selectedMode}
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content>
                  <DropdownMenu.Item onSelect={() => setSelectedMode('All Modes')}>All Modes</DropdownMenu.Item>
                  {availableModes.map((mode) => (
                    <DropdownMenu.Item key={mode} onSelect={() => setSelectedMode(mode)}>{mode}</DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu>
          )}
          <ToggleGroup
            size="small"
            type="single"
            value={inspectView}
            onValueChange={handleSetInspectView}
            css={{
              backgroundColor: '$bgSubtle',
              padding: '2px',
              borderRadius: '$medium',
              border: 'none',
              gap: 0,
              '& [data-state="on"]': {
                backgroundColor: '$accentDefault',
                color: '$fgOnEmphasis',
                borderRadius: '$medium',
                boxShadow: 'none',
              },
              '& [data-state="off"]': {
                backgroundColor: 'transparent',
                color: '$fgMuted',
                '&:hover': {
                  color: '$fgDefault',
                }
              }
            }}
          >
            {/* Disabling tooltip for now due to https://github.com/radix-ui/primitives/issues/602
            <ToggleGroup.Item value="multi" tooltip={t('inspectLayers') as string} tooltipSide="bottom"> */}
            <ToggleGroup.Item value="multi" iconOnly={false}>
              <Box css={{
                display: 'flex', alignItems: 'center', gap: '$2', padding: '0 $1',
              }}
              >
                <IconInspect />
                <Box css={{ whiteSpace: 'nowrap' }}>{t('multiInspect')}</Box>
              </Box>
            </ToggleGroup.Item>
            {/* Disabling tooltip for now due to https://github.com/radix-ui/primitives/issues/602
              <ToggleGroup.Item value="debug" tooltip={t('debugAndAnnotate') as string} tooltipSide="bottom"> */}
            <ToggleGroup.Item value="debug" iconOnly={false}>
              <Box css={{
                display: 'flex', alignItems: 'center', gap: '$2', padding: '0 $1',
              }}
              >
                <IconDebug />
                <Box css={{ whiteSpace: 'nowrap' }}>{t('debug')}</Box>
              </Box>
            </ToggleGroup.Item>
            <ToggleGroup.Item value="json" iconOnly={false}>
              <Box css={{
                display: 'flex', alignItems: 'center', gap: '$2', padding: '0 $1',
              }}
              >
                <IconJson />
                <Box css={{ whiteSpace: 'nowrap' }}>{t('json')}</Box>
              </Box>
            </ToggleGroup.Item>
            <ToggleGroup.Item value="visualization" iconOnly={false}>
              <Box css={{
                display: 'flex', alignItems: 'center', gap: '$2', padding: '0 $1',
              }}
              >
                <Box css={{
                  width: 12, height: 12, borderRadius: 999, border: '1px solid $borderSubtle', backgroundColor: '$bgSubtle',
                }}
                />
                <Box css={{ whiteSpace: 'nowrap' }}>Visualization</Box>
              </Box>
            </ToggleGroup.Item>
          </ToggleGroup>
        </Stack>
        <Stack direction="row" align="center" gap={2}>
          <Box
            css={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '$3',
            }}
          >
            <TextInput
              value={searchInputValue}
              onChange={handleSearchInputChange}
              type="text"
              placeholder={`${t('search')}… (Esc to clear)`}
              leadingVisual={<Search />}
            />
          </Box>
          <InspectSearchOptionDropdown />
        </Stack>
      </Box>
      {renderInspectView()}
    </Box>
  );
}

export default Inspector;
