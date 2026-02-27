
export interface FigmaVariable {
  id: string;
  name: string;
  description: string;
  type: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  valuesByMode: Record<string, any>;
  resolvedType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
}

export interface FigmaApiResponse {
  status: number;
  error: boolean;
  meta: {
    variables: Record<string, FigmaVariable>;
    variableCollections: Record<string, any>;
  };
}

export async function fetchFigmaVariables(fileKey: string, token: string): Promise<FigmaVariable[]> {
  try {
    const response = await fetch(`https://api.figma.com/v1/files/${fileKey}/variables/local`, {
      headers: {
        'X-Figma-Token': token
      }
    });

    if (!response.ok) {
      throw new Error(`Figma API Error: ${response.status} ${response.statusText}`);
    }

    const data: FigmaApiResponse = await response.json();
    
    // Convert the object map to an array for our table
    const variablesArray = Object.values(data.meta.variables).map(v => ({
      ...v,
      // Ensure we have a consistent type field
      type: v.resolvedType
    }));

    return variablesArray;
  } catch (error) {
    console.error('Failed to fetch Figma variables:', error);
    throw error;
  }
}
