export interface Brand {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    display: string;
    body: string;
  };
  logo: string; // URL or placeholder text
}

export const brands: Record<string, Brand> = {
  gap: {
    id: 'gap',
    name: 'Gap',
    colors: {
      primary: '#00205B', // Gap Navy
      secondary: '#FFFFFF',
      accent: '#00205B',
      background: '#FFFFFF',
      text: '#00205B',
    },
    fonts: {
      display: '"Bodoni Moda", serif', // Approximation
      body: '"Inter", sans-serif',
    },
    logo: 'Gap',
  },
  oldnavy: {
    id: 'oldnavy',
    name: 'Old Navy',
    colors: {
      primary: '#003764', // Old Navy Blue
      secondary: '#C0132D', // Red accent
      accent: '#C0132D',
      background: '#FFFFFF',
      text: '#1F2937',
    },
    fonts: {
      display: '"Inter", sans-serif', // Approximation
      body: '"Inter", sans-serif',
    },
    logo: 'Old Navy',
  },
  bananarepublic: {
    id: 'bananarepublic',
    name: 'Banana Republic',
    colors: {
      primary: '#1C1C1C', // Black/Dark Grey
      secondary: '#F4F4F4',
      accent: '#9CA3AF',
      background: '#F9FAFB',
      text: '#111827',
    },
    fonts: {
      display: '"Playfair Display", serif',
      body: '"Inter", sans-serif',
    },
    logo: 'BR',
  },
  athleta: {
    id: 'athleta',
    name: 'Athleta',
    colors: {
      primary: '#4A2C40', // Deep Purple/Mauve
      secondary: '#F3EFEA',
      accent: '#E5D6C8',
      background: '#FFFFFF',
      text: '#4A2C40',
    },
    fonts: {
      display: '"Inter", sans-serif',
      body: '"Inter", sans-serif',
    },
    logo: 'Athleta',
  },
  gapfactory: {
    id: 'gapfactory',
    name: 'Gap Factory',
    colors: {
      primary: '#00205B', // Similar to Gap
      secondary: '#FFC107', // Yellow accent often seen
      accent: '#FFC107',
      background: '#FFFFFF',
      text: '#00205B',
    },
    fonts: {
      display: '"Inter", sans-serif',
      body: '"Inter", sans-serif',
    },
    logo: 'Gap Factory',
  },
};
