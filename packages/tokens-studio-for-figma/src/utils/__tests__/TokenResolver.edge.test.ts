import { TokenResolver } from '../TokenResolver';
import { SingleToken } from '@/types/tokens';
import { TokenTypes } from '@/constants/TokenTypes';

describe('TokenResolver Edge Cases', () => {
    let resolver: TokenResolver;

    beforeEach(() => {
        resolver = new TokenResolver([]);
    });

    it('should handle circular references gracefully', () => {
        const tokens: SingleToken[] = [
            {
                name: 'a',
                value: '{b}',
                type: TokenTypes.OTHER,
            },
            {
                name: 'b',
                value: '{a}',
                type: TokenTypes.OTHER,
            },
        ];
        resolver.setTokens(tokens);

        const resultA = resolver.resolveReferences(tokens[0]);
        expect(resultA.failedToResolve).toBe(true);
        expect(resultA.value).toBe('{b}');

        const resultB = resolver.resolveReferences(tokens[1]);
        expect(resultB.failedToResolve).toBe(true);
        expect(resultB.value).toBe('{a}');
    });

    it('should handle nested math transforms and aliased values', () => {
        const tokens: SingleToken[] = [
            {
                name: 'base',
                value: '10px',
                type: TokenTypes.DIMENSION,
            },
            {
                name: 'multiplier',
                value: '2',
                type: TokenTypes.OTHER,
            },
            {
                name: 'calc-result',
                value: 'calc({base} * {multiplier})',
                type: TokenTypes.DIMENSION,
            },
        ];
        resolver.setTokens(tokens);

        const result = resolver.resolveReferences(tokens[2]);
        // The resolver replaces aliases.
        expect(result.value).toBe('calc(10px * 2)');
    });

    it('should resolve deep alias chains', () => {
        const tokens: SingleToken[] = [
            { name: '1', value: '#ffffff', type: TokenTypes.COLOR },
            { name: '2', value: '{1}', type: TokenTypes.COLOR },
            { name: '3', value: '{2}', type: TokenTypes.COLOR },
            { name: '4', value: '{3}', type: TokenTypes.COLOR },
        ];
        resolver.setTokens(tokens);

        const result = resolver.resolveReferences(tokens[3]);
        expect(result.value).toBe('#ffffff');
    });
});
