/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Introduction } from './pages/Introduction';
import { Color } from './pages/Color';
import { Typography } from './pages/Typography';
import { Iconography } from './pages/Iconography';
import { Logo } from './pages/Logo';
import { Spacing } from './pages/Spacing';
import { GridSystem } from './pages/GridSystem';
import { Shape } from './pages/Shape';
import { Buttons } from './pages/Buttons';
import { ProductCards } from './pages/ProductCards';
import { Tokens } from './pages/Tokens';
import { Accessibility } from './pages/Accessibility';
import { FigmaLibrary } from './pages/FigmaLibrary';
import { Playbook } from './pages/Playbook';
import { BrandProvider } from './context/BrandContext';
import { Home } from './pages/Home';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home onNavigate={setCurrentPage} />;
      case 'introduction':
        return <Introduction />;
      case 'figma-library':
        return <FigmaLibrary />;
      case 'playbook':
        return <Playbook />;
      case 'color':
        return <Color />;
      case 'typography':
        return <Typography />;
      case 'iconography':
        return <Iconography />;
      case 'logo':
        return <Logo />;
      case 'spacing':
        return <Spacing />;
      case 'grid':
        return <GridSystem />;
      case 'shape':
        return <Shape />;
      case 'buttons':
        return <Buttons />;
      case 'product-card':
        return <ProductCards />;
      case 'tokens':
        return <Tokens />;
      case 'accessibility':
        return <Accessibility />;
      default:
        return <Introduction />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <BrandProvider>
      <AppContent />
    </BrandProvider>
  );
}
