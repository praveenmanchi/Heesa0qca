import { checkVariableAliasEquality } from './checkVariableAliasEquality';
import { isVariableWithAliasReference } from '@/utils/isAliasReference';
import { normalizeVariableName } from '@/utils/normalizeVariableName';

// Mock the dependencies
jest.mock('@/utils/isAliasReference');
jest.mock('@/utils/normalizeVariableName');

// Mock figma globals
global.figma = {
  variables: {
    getVariableByIdAsync: jest.fn(),
  },
} as any;

describe('checkVariableAliasEquality', () => {
  const mockIsVariableWithAliasReference = isVariableWithAliasReference as jest.MockedFunction<
    typeof isVariableWithAliasReference
  >;
  const mockNormalizeVariableName = normalizeVariableName as jest.MockedFunction<typeof normalizeVariableName>;
  const mockGetVariableByIdAsync = figma.variables.getVariableByIdAsync as jest.MockedFunction<
    typeof figma.variables.getVariableByIdAsync
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when existingValue is not an alias reference', async () => {
    mockIsVariableWithAliasReference.mockReturnValue(false);

    const result = await checkVariableAliasEquality(
      {
        r: 1,
        g: 0,
        b: 0,
        a: 1,
      },
      '{accent.default}',
    );

    expect(result).toBe(false);
    expect(mockGetVariableByIdAsync).not.toHaveBeenCalled();
  });

  it('should return false when rawValue is not provided', async () => {
    mockIsVariableWithAliasReference.mockReturnValue(true);

    const aliasValue = { type: 'VARIABLE_ALIAS', id: 'VariableID:1:9' };
    const result = await checkVariableAliasEquality(aliasValue);

    expect(result).toBe(false);
    expect(mockGetVariableByIdAsync).not.toHaveBeenCalled();
  });

  it('should return false when rawValue does not have reference syntax', async () => {
    mockIsVariableWithAliasReference.mockReturnValue(true);

    const aliasValue = { type: 'VARIABLE_ALIAS', id: 'VariableID:1:9' };
    const result = await checkVariableAliasEquality(aliasValue, 'accent.default');

    expect(result).toBe(false);
    expect(mockGetVariableByIdAsync).not.toHaveBeenCalled();
  });

  it('should return false when referenced variable is not found', async () => {
    mockIsVariableWithAliasReference.mockReturnValue(true);
    mockGetVariableByIdAsync.mockResolvedValue(null);

    const aliasValue = { type: 'VARIABLE_ALIAS', id: 'VariableID:1:9' };
    const result = await checkVariableAliasEquality(aliasValue, '{accent.default}');

    expect(result).toBe(false);
    expect(mockGetVariableByIdAsync).toHaveBeenCalledWith('VariableID:1:9');
  });

  it('should return true when alias points to the correct variable', async () => {
    mockIsVariableWithAliasReference.mockReturnValue(true);
    mockGetVariableByIdAsync.mockResolvedValue({ name: 'accent/default' } as any);
    mockNormalizeVariableName.mockImplementation((name) => name.replace('/', '.'));

    const aliasValue = { type: 'VARIABLE_ALIAS', id: 'VariableID:1:9' };
    const result = await checkVariableAliasEquality(aliasValue, '{accent.default}');

    expect(result).toBe(true);
    expect(mockGetVariableByIdAsync).toHaveBeenCalledWith('VariableID:1:9');
    expect(mockNormalizeVariableName).toHaveBeenCalledWith('accent/default');
    expect(mockNormalizeVariableName).toHaveBeenCalledWith('accent.default');
  });

  it('should return false when alias points to a different variable', async () => {
    mockIsVariableWithAliasReference.mockReturnValue(true);
    mockGetVariableByIdAsync.mockResolvedValue({ name: 'primary/default' } as any);
    mockNormalizeVariableName.mockImplementation((name) => name.replace('/', '.'));

    const aliasValue = { type: 'VARIABLE_ALIAS', id: 'VariableID:1:9' };
    const result = await checkVariableAliasEquality(aliasValue, '{accent.default}');

    expect(result).toBe(false);
    expect(mockGetVariableByIdAsync).toHaveBeenCalledWith('VariableID:1:9');
    expect(mockNormalizeVariableName).toHaveBeenCalledWith('primary/default');
    expect(mockNormalizeVariableName).toHaveBeenCalledWith('accent.default');
  });

  it('should handle errors gracefully', async () => {
    mockIsVariableWithAliasReference.mockReturnValue(true);
    mockGetVariableByIdAsync.mockRejectedValue(new Error('Test error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const aliasValue = { type: 'VARIABLE_ALIAS', id: 'VariableID:1:9' };
    const result = await checkVariableAliasEquality(aliasValue, '{accent.default}');

    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('Error checking variable alias equality:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('should extract reference name correctly from complex paths', async () => {
    mockIsVariableWithAliasReference.mockReturnValue(true);
    mockGetVariableByIdAsync.mockResolvedValue({ name: 'colors/semantic/accent/default' } as any);
    mockNormalizeVariableName.mockImplementation((name) => name.replace(/\//g, '.'));

    const aliasValue = { type: 'VARIABLE_ALIAS', id: 'VariableID:1:9' };
    const result = await checkVariableAliasEquality(aliasValue, '{colors.semantic.accent.default}');

    expect(result).toBe(true);
    expect(mockNormalizeVariableName).toHaveBeenCalledWith('colors/semantic/accent/default');
    expect(mockNormalizeVariableName).toHaveBeenCalledWith('colors.semantic.accent.default');
  });
});
