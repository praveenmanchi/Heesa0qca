import { TokenTypes } from '@tokens-studio/types';
import { SingleToken } from '@/types/tokens';
import { ThemeObject } from '@/types/ThemeObject';
import { StyleGuideThemeData } from '@/types/AsyncMessages';
import { convertToFigmaColor } from '../figmaTransforms/colors';

const white = { r: 1, g: 1, b: 1 };
const black = { r: 0, g: 0, b: 0 };
const muted = { r: 0.5, g: 0.5, b: 0.5 };
const linkColor = { r: 0, g: 0.4, b: 1 };

const FALLBACK_MONO = 'Inter';

let monoFontFamily = 'Geist Mono';

async function loadFonts() {
    const toLoad = [
        { family: 'Inter', style: 'Regular' },
        { family: 'Inter', style: 'Medium' },
        { family: 'Inter', style: 'Semi Bold' },
        { family: 'Inter', style: 'Bold' },
        { family: 'Geist Mono', style: 'Regular' },
        { family: 'Geist Mono', style: 'Medium' },
    ];
    for (const font of toLoad) {
        try {
            await figma.loadFontAsync(font);
        } catch {
            if (font.family === 'Geist Mono') {
                monoFontFamily = FALLBACK_MONO;
                try {
                    await figma.loadFontAsync({ family: FALLBACK_MONO, style: font.style === 'Medium' ? 'Medium' : 'Regular' });
                } catch (_) {
                    await figma.loadFontAsync({ family: FALLBACK_MONO, style: 'Regular' });
                }
            }
        }
    }
}

async function createTextNode(
    characters: string,
    fontSize: number = 12,
    fontStyle: string = 'Regular',
    color: RGB = black,
    fontFamily: string = 'Inter',
): Promise<TextNode> {
    const text = figma.createText();
    text.fontName = { family: fontFamily, style: fontStyle };
    text.fontSize = fontSize;
    text.characters = characters || ' ';
    text.fills = [{ type: 'SOLID', color }];
    return text;
}

async function createColorSwatch(token: SingleToken, theme: ThemeObject): Promise<FrameNode> {
    const container = figma.createFrame();
    container.name = `Swatch: ${token.name}`;
    container.layoutMode = 'VERTICAL';
    container.itemSpacing = 4;
    container.fills = [];
    container.layoutSizingHorizontal = 'FIXED';
    container.layoutSizingVertical = 'HUG';
    container.resize(70, 100);

    const swatch = figma.createRectangle();
    swatch.resize(70, 70);
    swatch.cornerRadius = 8;
    const { color, opacity } = convertToFigmaColor(String(token.value));
    swatch.fills = [{ type: 'SOLID', color, opacity }];
    swatch.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
    swatch.strokeWeight = 1;

    if (theme.$figmaVariableReferences?.[token.name]) {
        try {
            const variable = await figma.variables.getVariableByIdAsync(theme.$figmaVariableReferences[token.name]);
            if (variable) swatch.setBoundVariable('fills' as any, variable.id);
        } catch (e) {
            // Logic for error handling without console warning
        }
    }
    container.appendChild(swatch);

    const label = await createTextNode(token.name.split('.').pop() || token.name, 10, 'Medium', black, monoFontFamily);
    container.appendChild(label);
    label.layoutSizingHorizontal = 'FILL';

    const hexLabel = await createTextNode(String(token.value), 8, 'Regular', muted, monoFontFamily);
    container.appendChild(hexLabel);
    hexLabel.layoutSizingHorizontal = 'FILL';

    return container;
}

async function generateColorSystem(themeData: StyleGuideThemeData[], container: FrameNode) {
    try {
        const section = figma.createFrame();
        section.name = 'Colors Section';
        section.layoutMode = 'VERTICAL';
        section.itemSpacing = 40;
        section.paddingTop = 80;
        section.paddingBottom = 80;
        section.fills = [];
        container.appendChild(section);
        section.layoutSizingHorizontal = 'FILL';
        section.layoutSizingVertical = 'HUG';

        section.appendChild(await createTextNode('Colors', 40, 'Bold'));
        const desc = await createTextNode('Colors are the foundation of our design system. We use a curated palette for consistent branding.', 16, 'Regular', muted);
        section.appendChild(desc);
        desc.layoutSizingHorizontal = 'FILL';

        const firstTheme = themeData[0];
        const colorTokens = firstTheme.resolvedTokens.filter((t) => String(t.type).toLowerCase() === 'color' || t.type === (TokenTypes.COLOR as any));

        if (colorTokens.length === 0) {
            section.appendChild(await createTextNode('No color tokens found. Please ensure your theme has tokens and they are assigned the correct type.', 14, 'Regular', muted));
            return;
        }

        const topGroups = colorTokens.reduce((acc, t) => {
            const parts = t.name.split('.');
            const key = parts[1] || parts[0] || 'Global';
            if (!acc[key]) acc[key] = [];
            acc[key].push(t);
            return acc;
        }, {} as Record<string, SingleToken[]>);

        for (const [topGroup, tokens] of Object.entries(topGroups)) {
            const topFrame = figma.createFrame();
            topFrame.layoutMode = 'VERTICAL';
            topFrame.itemSpacing = 32;
            topFrame.fills = [];
            section.appendChild(topFrame);
            topFrame.layoutSizingHorizontal = 'FILL';
            topFrame.layoutSizingVertical = 'HUG';

            topFrame.appendChild(await createTextNode(`${topGroup.charAt(0).toUpperCase() + topGroup.slice(1)} colors`, 20, 'Bold'));

            const subGroups = tokens.reduce((acc, t) => {
                const parts = t.name.split('.');
                parts.pop();
                const key = parts.join('.');
                if (!acc[key]) acc[key] = [];
                acc[key].push(t);
                return acc;
            }, {} as Record<string, SingleToken[]>);

            for (const [subGroupName, subTokens] of Object.entries(subGroups)) {
                const rowContainer = figma.createFrame();
                rowContainer.layoutMode = 'HORIZONTAL';
                rowContainer.itemSpacing = 60;
                rowContainer.fills = [];
                topFrame.appendChild(rowContainer);
                rowContainer.layoutSizingHorizontal = 'FILL';
                rowContainer.layoutSizingVertical = 'HUG';

                const info = figma.createFrame();
                info.layoutMode = 'VERTICAL';
                info.itemSpacing = 8;
                info.fills = [];
                info.resize(200, 100);
                info.appendChild(await createTextNode(subGroupName.split('.').pop() || subGroupName, 14, 'Semi Bold'));
                const subDesc = await createTextNode('A descriptive palette range for consistent usage.', 11, 'Regular', muted);
                info.appendChild(subDesc);
                subDesc.layoutSizingHorizontal = 'FILL';
                rowContainer.appendChild(info);

                const swatches = figma.createFrame();
                swatches.layoutMode = 'HORIZONTAL';
                swatches.itemSpacing = 16;
                swatches.fills = [];
                rowContainer.appendChild(swatches);
                swatches.layoutSizingHorizontal = 'FILL';
                swatches.layoutSizingVertical = 'HUG';

                for (const token of subTokens) {
                    swatches.appendChild(await createColorSwatch(token, firstTheme.theme));
                }
            }
        }
    } catch (err) {
        figma.notify('Error generating color system. Check console for details.');
    }
}

async function generateTypographySystem(themeData: StyleGuideThemeData[], container: FrameNode) {
    try {
        const section = figma.createFrame();
        section.name = 'Typography Section';
        section.layoutMode = 'VERTICAL';
        section.itemSpacing = 60;
        section.paddingTop = 80;
        section.paddingBottom = 80;
        section.fills = [];
        container.appendChild(section);
        section.layoutSizingHorizontal = 'FILL';
        section.layoutSizingVertical = 'HUG';

        section.appendChild(await createTextNode('Typography', 40, 'Bold'));

        const hero = figma.createFrame();
        hero.layoutMode = 'VERTICAL';
        hero.itemSpacing = 24;
        hero.fills = [];
        section.appendChild(hero);
        hero.layoutSizingHorizontal = 'FILL';
        hero.layoutSizingVertical = 'HUG';

        hero.appendChild(await createTextNode('Inter', 20, 'Medium', muted));
        hero.appendChild(await createTextNode('Ag', 140, 'Medium'));
        hero.appendChild(await createTextNode('ABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz\n0123456789 !@#$%^&*()', 18, 'Regular', muted));

        const firstTheme = themeData[0];
        const typoTokens = firstTheme.resolvedTokens.filter((t) => String(t.type).toLowerCase() === 'typography' || t.type === (TokenTypes.TYPOGRAPHY as any));

        if (typoTokens.length === 0) {
            section.appendChild(await createTextNode('No typography tokens found in the selected theme.', 14, 'Regular', muted));
            return;
        }

        const sizeGroups = typoTokens.reduce((acc, t) => {
            const parts = t.name.split('.');
            const weight = parts.pop();
            const sizeName = parts.join('.') || 'Root';
            if (!acc[sizeName]) acc[sizeName] = {};
            acc[sizeName][weight || 'Regular'] = t;
            return acc;
        }, {} as Record<string, Record<string, SingleToken>>);

        for (const [sizeName, weights] of Object.entries(sizeGroups)) {
            const rowGroup = figma.createFrame();
            rowGroup.layoutMode = 'VERTICAL';
            rowGroup.itemSpacing = 24;
            rowGroup.fills = [];
            section.appendChild(rowGroup);
            rowGroup.layoutSizingHorizontal = 'FILL';
            rowGroup.layoutSizingVertical = 'HUG';

            const rowTitle = await createTextNode(sizeName.split('.').pop() || sizeName, 12, 'Semi Bold', muted);
            rowGroup.appendChild(rowTitle);

            const grid = figma.createFrame();
            grid.layoutMode = 'HORIZONTAL';
            grid.itemSpacing = 80;
            grid.fills = [];
            rowGroup.appendChild(grid);
            grid.layoutSizingHorizontal = 'FILL';
            grid.layoutSizingVertical = 'HUG';

            const weightOrder = ['Regular', 'Medium', 'Semi Bold', 'Bold'];
            const availableWeights = Object.keys(weights).sort((a, b) => weightOrder.indexOf(a) - weightOrder.indexOf(b));

            for (const w of availableWeights) {
                const token = weights[w];
                const val = token.value as any;
                const family = val.fontFamily || 'Inter';
                const size = parseFloat(val.fontSize) || 16;
                const style = val.fontWeight || w;

                const col = figma.createFrame();
                col.layoutMode = 'VERTICAL';
                col.itemSpacing = 8;
                col.fills = [];
                grid.appendChild(col);
                col.layoutSizingHorizontal = 'FILL';
                col.layoutSizingVertical = 'HUG';

                const specimenText = sizeName.split('.').pop() || 'Sample';
                try {
                    await figma.loadFontAsync({ family, style });
                    const specimen = await createTextNode(specimenText, size, style, black, family);
                    col.appendChild(specimen);
                    col.appendChild(await createTextNode(style, 12, 'Regular', muted));
                } catch (e) {
                    col.appendChild(await createTextNode('Font Missing', 12, 'Regular', { r: 1, g: 0, b: 0 }));
                }
            }
        }
    } catch (err) {
        figma.notify('Error generating typography system.');
    }
}

export async function generateStyleGuide(themeData: StyleGuideThemeData[]) {
    try {
        if (!themeData || themeData.length === 0) {
            figma.notify('No theme data provided to generate style guide.');
            return;
        }
        await loadFonts();

        let container = figma.currentPage.findOne((n) => n.name === 'Style Guide' && n.type === 'FRAME') as FrameNode;
        if (!container) {
            container = figma.createFrame();
            container.name = 'Style Guide';
            container.x = figma.viewport.center.x;
            container.y = figma.viewport.center.y;
            figma.currentPage.appendChild(container);
        } else {
            while (container.children.length > 0) {
                container.children[0].remove();
            }
        }

        container.layoutMode = 'VERTICAL';
        container.resize(1600, container.height);
        container.paddingTop = 120;
        container.paddingBottom = 120;
        container.paddingLeft = 120;
        container.paddingRight = 120;
        container.itemSpacing = 0;
        container.layoutSizingHorizontal = 'FIXED';
        container.layoutSizingVertical = 'HUG';
        container.fills = [{ type: 'SOLID', color: white }];

        const heroRow = figma.createFrame();
        heroRow.name = 'Hero Row';
        heroRow.layoutMode = 'HORIZONTAL';
        heroRow.itemSpacing = 200;
        heroRow.fills = [];
        container.appendChild(heroRow);
        heroRow.layoutSizingHorizontal = 'FILL';
        heroRow.layoutSizingVertical = 'HUG';

        const heroLeft = figma.createFrame();
        heroLeft.layoutMode = 'VERTICAL';
        heroLeft.itemSpacing = 12;
        heroLeft.fills = [];
        heroRow.appendChild(heroLeft);
        heroLeft.layoutSizingHorizontal = 'FILL';
        heroLeft.layoutSizingVertical = 'HUG';
        heroLeft.appendChild(await createTextNode('Foundations', 16, 'Medium', muted));
        heroLeft.appendChild(await createTextNode('Design System\nStyle Guide', 56, 'Bold'));

        const heroRight = figma.createFrame();
        heroRight.layoutMode = 'VERTICAL';
        heroRight.itemSpacing = 16;
        heroRight.fills = [];
        heroRight.resize(300, 100);
        heroRight.appendChild(await createTextNode('Resources', 14, 'Bold'));
        heroRight.appendChild(await createTextNode('• Design Guidelines', 11, 'Regular', linkColor));
        heroRight.appendChild(await createTextNode('• Figma Library', 11, 'Regular', linkColor));
        heroRight.appendChild(await createTextNode('• Developer Portal', 11, 'Regular', linkColor));
        heroRow.appendChild(heroRight);

        await generateColorSystem(themeData, container);
        await generateTypographySystem(themeData, container);

        const footer = figma.createFrame();
        footer.layoutMode = 'VERTICAL';
        footer.paddingTop = 100;
        footer.fills = [];
        footer.appendChild(await createTextNode(`© ${new Date().getFullYear()} Design System Team`, 10, 'Regular', muted));
        container.appendChild(footer);

        figma.viewport.scrollAndZoomIntoView([container]);
        figma.notify('Style guide generated successfully!');
    } catch (err) {
        figma.notify('Failed to generate style guide. Check console.');
    }
}

export async function updateStyleGuide(themeData: StyleGuideThemeData[]) {
    await generateStyleGuide(themeData);
}
