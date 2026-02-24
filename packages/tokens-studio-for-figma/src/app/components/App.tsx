import React from 'react';
import { useSelector } from 'react-redux';
import { IconoirProvider } from 'iconoir-react';
import Settings from './Settings';
import Inspector from './Inspector';
import Tokens from './Tokens';
import VariableUsageSearch from './VariableUsageSearch';
import StartScreen from './StartScreen';
import Navbar from './Navbar';
import FigmaLoading from './FigmaLoading';
import SecondSceen from './SecondScreen';
import Footer from './Footer';
import Box from './Box';
import { activeTabSelector } from '@/selectors';
import { ICON_SIZE } from '@/constants/UIConstants';
import PluginResizerWrapper from './PluginResizer';
import LoadingBar from './LoadingBar';
import { ConvertToDTCGModal } from './ConvertToDTCGModal';
import ChangeLog from './ChangeLog';
import ExtractTab from './ExtractTab';
import StyleGuideTab from './StyleGuideTab';

function App() {
  const activeTab = useSelector(activeTabSelector);

  return (
    <Box css={{ isolation: 'isolate' }}>
      <IconoirProvider
        iconProps={{
          color: '$fgDefault',
          strokeWidth: 1.5,
          width: `${ICON_SIZE.lg}px`,
          height: `${ICON_SIZE.lg}px`,
        }}
      >
        {activeTab !== 'loading' && <LoadingBar />}
        <PluginResizerWrapper>
          <Box
            css={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden',
            }}
          >
          <Box
            css={{
              display: 'flex',
              flexDirection: 'column',
              flexGrow: 1,
              height: '100%',
              overflow: 'hidden',
              backgroundColor: '$bgDefault',
            }}
          >
              {activeTab === 'loading' && <FigmaLoading />}
              {activeTab !== 'start' && activeTab !== 'loading' && <Navbar />}
              {activeTab === 'start' && <StartScreen />}
              <Tokens isActive={activeTab === 'tokens'} />
              {activeTab === 'inspector' && <Inspector />}
              {activeTab === 'secondscreen' && <SecondSceen />}
              {activeTab === 'variables' && <VariableUsageSearch />}
              {activeTab === 'changelog' && <ChangeLog />}
              {activeTab === 'extract' && <ExtractTab />}
              {activeTab === 'settings' && <Settings />}
              {activeTab === 'styleguide' && <StyleGuideTab />}
            </Box>
            {activeTab !== 'loading' && activeTab !== 'start' && <Footer />}
          </Box>

        </PluginResizerWrapper>
        <ConvertToDTCGModal />
      </IconoirProvider>
    </Box>
  );
}

export default App;
