import { figmaRGBToHex } from '@figma-plugin/helpers';
import { convertToFigmaColor } from '../figmaTransforms/colors';
import type { StyleGuideGroupsConfig, StyleGuideVariableData } from '@/types/AsyncMessages';

const white = { r: 1, g: 1, b: 1 };
const black = { r: 0, g: 0, b: 0 };
const muted = { r: 0.5, g: 0.5, b: 0.5 };

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
    { family: 'Geist Mono', style: 'Bold' },
  ];
  for (const font of toLoad) {
    try {
      await figma.loadFontAsync(font);
    } catch {
      if (font.family === 'Geist Mono') {
        monoFontFamily = FALLBACK_MONO;
        try {
          await figma.loadFontAsync({ family: FALLBACK_MONO, style: font.style });
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

function isVariableAlias(val: any): val is { type: 'VARIABLE_ALIAS'; id: string } {
  return !!val && typeof val === 'object' && val.type === 'VARIABLE_ALIAS' && typeof val.id === 'string';
}

function getValueFromMapForMode(valuesByMode: Record<string, any> | undefined, modeId?: string) {
  if (!valuesByMode || Object.keys(valuesByMode).length === 0) return undefined;
  if (modeId && modeId in valuesByMode) return valuesByMode[modeId];
  const firstKey = Object.keys(valuesByMode)[0];
  return valuesByMode[firstKey];
}

async function resolveAliasChain(input: any, modeId?: string, depth: number = 0): Promise<any> {
  if (!isVariableAlias(input) || depth > 5) return input;

  try {
    const variable = await figma.variables.getVariableByIdAsync(input.id);
    if (!variable) return input;
    const raw = getValueFromMapForMode(variable.valuesByMode as Record<string, any>, modeId);
    if (!raw) return input;
    if (isVariableAlias(raw)) {
      return resolveAliasChain(raw, modeId, depth + 1);
    }
    return raw;
  } catch {
    return input;
  }
}

async function getResolvedValueForMode(v: StyleGuideVariableData, modeId?: string): Promise<any> {
  const base = getValueFromMapForMode(v.valuesByMode, modeId);
  if (!base) return v.resolvedValue;
  if (isVariableAlias(base)) {
    return resolveAliasChain(base, modeId);
  }
  return base;
}

function resolveColorValue(val: any): { color: RGB; opacity: number } | null {
  if (!val) return null;
  if (typeof val === 'object' && 'r' in val && 'g' in val && 'b' in val) {
    const r = Math.max(0, Math.min(1, val.r));
    const g = Math.max(0, Math.min(1, val.g));
    const b = Math.max(0, Math.min(1, val.b));
    const a = val.a !== undefined ? Math.max(0, Math.min(1, val.a)) : 1;
    return { color: { r, g, b }, opacity: a };
  }
  if (typeof val === 'string') {
    try {
      const { color, opacity } = convertToFigmaColor(val);
      return { color, opacity };
    } catch {
      return null;
    }
  }
  return null;
}

function groupVariablesByPath(variables: StyleGuideVariableData[]): Record<string, StyleGuideVariableData[]> {
  const groups: Record<string, StyleGuideVariableData[]> = {};
  for (const v of variables) {
    const parts = v.name.split('/');
    const topKey = parts[0] || 'Other';
    if (!groups[topKey]) groups[topKey] = [];
    groups[topKey].push(v);
  }
  return groups;
}

function getOrderedPathGroups(
  pathGroups: Record<string, StyleGuideVariableData[]>,
  groupsConfig?: StyleGuideGroupsConfig,
): [string, StyleGuideVariableData[]][] {
  let entries = Object.entries(pathGroups);
  if (!groupsConfig) {
    return entries.sort(([a], [b]) => a.localeCompare(b));
  }

  const hiddenSet = new Set(groupsConfig.hidden || []);
  entries = entries.filter(([name]) => !hiddenSet.has(name));

  const order = groupsConfig.order || [];
  if (!order.length) {
    return entries.sort(([a], [b]) => a.localeCompare(b));
  }

  const indexMap = new Map(order.map((name, idx) => [name, idx]));
  return entries.sort(([aName], [bName]) => {
    const ia = indexMap.has(aName) ? indexMap.get(aName)! : Number.MAX_SAFE_INTEGER;
    const ib = indexMap.has(bName) ? indexMap.get(bName)! : Number.MAX_SAFE_INTEGER;
    if (ia !== ib) return ia - ib;
    return aName.localeCompare(bName);
  });
}

async function createColorSwatchFromVariable(v: StyleGuideVariableData): Promise<FrameNode | null> {
  const resolved = resolveColorValue(v.resolvedValue);
  if (!resolved) return null;

  const container = figma.createFrame();
  container.name = `Swatch: ${v.name}`;
  container.layoutMode = 'VERTICAL';
  container.itemSpacing = 4;
  container.fills = [];
  container.layoutSizingHorizontal = 'FIXED';
  container.layoutSizingVertical = 'HUG';
  container.resize(70, 100);

  const swatch = figma.createRectangle();
  swatch.resize(70, 70);
  swatch.cornerRadius = 8;
  swatch.fills = [{ type: 'SOLID', color: resolved.color, opacity: resolved.opacity }];
  swatch.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
  swatch.strokeWeight = 1;

  try {
    const variable = await figma.variables.getVariableByIdAsync(v.id);
    if (variable && variable.resolvedType === 'COLOR') {
      const paint = swatch.fills[0];
      if (paint && paint.type === 'SOLID') {
        const boundPaint = figma.variables.setBoundVariableForPaint(paint, 'color', variable);
        swatch.fills = [boundPaint];
      }
    }
  } catch (_) { /* use static color */ }

  container.appendChild(swatch);

  const label = await createTextNode(v.name.split('/').pop() || v.name, 10, 'Medium', black, monoFontFamily);
  container.appendChild(label);
  label.layoutSizingHorizontal = 'FILL';

  const hexLabel = typeof v.resolvedValue === 'object' && v.resolvedValue?.r !== undefined
    ? figmaRGBToHex(v.resolvedValue)
    : String(v.resolvedValue ?? '—');
  const hexText = await createTextNode(hexLabel, 8, 'Regular', muted, monoFontFamily);
  container.appendChild(hexText);
  hexText.layoutSizingHorizontal = 'FILL';

  return container;
}

async function generateGroupSection(
  groupName: string,
  variables: StyleGuideVariableData[],
  container: FrameNode,
  modeName: string,
) {
  const section = figma.createFrame();
  section.name = `${groupName} Section`;
  section.layoutMode = 'VERTICAL';
  section.itemSpacing = 40;
  section.paddingTop = 40;
  section.paddingBottom = 40;
  section.fills = [];
  container.appendChild(section);
  section.layoutSizingHorizontal = 'FILL';
  section.layoutSizingVertical = 'HUG';

  section.appendChild(await createTextNode(groupName, 40, 'Bold'));
  const desc = await createTextNode(
    `${groupName} variables for ${modeName}.`,
    16,
    'Regular',
    muted,
  );
  section.appendChild(desc);
  desc.layoutSizingHorizontal = 'FILL';

  const subGroups: Record<string, StyleGuideVariableData[]> = {};
  for (const v of variables) {
    const parts = v.name.split('/');
    const subKey = parts.length > 1 ? parts.slice(0, -1).join('/') : groupName;
    if (!subGroups[subKey]) subGroups[subKey] = [];
    subGroups[subKey].push(v);
  }

  for (const [subGroupName, subGroupVars] of Object.entries(subGroups).sort(([a], [b]) => a.localeCompare(b))) {
    const topFrame = figma.createFrame();
    topFrame.layoutMode = 'VERTICAL';
    topFrame.itemSpacing = 16;
    topFrame.fills = [];
    section.appendChild(topFrame);
    topFrame.layoutSizingHorizontal = 'FILL';
    topFrame.layoutSizingVertical = 'HUG';

    topFrame.appendChild(await createTextNode(subGroupName, 20, 'Bold'));

    const wrapContainer = figma.createFrame();
    wrapContainer.layoutMode = 'HORIZONTAL';
    wrapContainer.layoutWrap = 'WRAP';
    wrapContainer.itemSpacing = 16;
    wrapContainer.counterAxisSpacing = 16;
    wrapContainer.fills = [];
    topFrame.appendChild(wrapContainer);
    wrapContainer.layoutSizingHorizontal = 'FILL';
    wrapContainer.layoutSizingVertical = 'HUG';

    for (const v of subGroupVars) {
      if (v.type === 'COLOR') {
        const swatch = await createColorSwatchFromVariable(v);
        if (swatch) wrapContainer.appendChild(swatch);
      } else if (v.type === 'FLOAT' || v.type === 'BOOLEAN') {
        let valStr = String(v.resolvedValue ?? '—');
        if (typeof v.resolvedValue === 'number') {
          valStr = String(v.resolvedValue % 1 === 0 ? v.resolvedValue : v.resolvedValue.toFixed(2));
        }
        const cell = figma.createFrame();
        cell.layoutMode = 'VERTICAL';
        cell.itemSpacing = 4;
        cell.paddingTop = 8;
        cell.paddingBottom = 8;
        cell.paddingLeft = 12;
        cell.paddingRight = 12;
        cell.cornerRadius = 8;
        cell.fills = [{ type: 'SOLID', color: { r: 0.97, g: 0.97, b: 0.97 } }];
        wrapContainer.appendChild(cell);
        cell.layoutSizingHorizontal = 'HUG';
        cell.layoutSizingVertical = 'HUG';

        const label = await createTextNode(v.name.split('/').pop() || v.name, 10, 'Medium', black, monoFontFamily);
        cell.appendChild(label);
        const valueText = await createTextNode(valStr, 14, 'Bold', black, monoFontFamily);
        cell.appendChild(valueText);
      } else {
        // STRING
        const val = String(v.resolvedValue ?? '—');
        const isFont = v.name.toLowerCase().includes('font') || v.name.toLowerCase().includes('family');
        const row = figma.createFrame();
        row.layoutMode = 'HORIZONTAL';
        row.itemSpacing = 16;
        row.paddingTop = 8;
        row.paddingBottom = 8;
        row.paddingLeft = 12;
        row.paddingRight = 12;
        row.cornerRadius = 8;
        row.fills = [{ type: 'SOLID', color: { r: 0.97, g: 0.97, b: 0.97 } }];
        wrapContainer.appendChild(row);
        row.layoutSizingHorizontal = 'HUG';
        row.layoutSizingVertical = 'HUG';

        try {
          if (isFont) await figma.loadFontAsync({ family: val, style: 'Regular' });
          const sample = await createTextNode(`Aa — ${val}`, 12, 'Regular', black, isFont ? val : undefined);
          row.appendChild(sample);
        } catch {
          const sample = await createTextNode(`Aa — ${val}`, 12, 'Regular', black);
          row.appendChild(sample);
        }
        const label = await createTextNode(v.name.split('/').pop() || v.name, 10, 'Regular', muted, monoFontFamily);
        row.appendChild(label);
      }
    }
  }
}

async function generateTabularTypographySection(
  variables: StyleGuideVariableData[],
  container: FrameNode,
  modeName: string,
  groupsConfig?: StyleGuideGroupsConfig,
) {
  if (variables.length === 0) return;

  const section = figma.createFrame();
  section.name = 'Tabular Typography Section';
  section.layoutMode = 'VERTICAL';
  section.itemSpacing = 0;
  section.paddingTop = 80;
  section.paddingBottom = 80;
  section.fills = [];
  container.appendChild(section);
  section.layoutSizingHorizontal = 'FILL';
  section.layoutSizingVertical = 'HUG';

  section.appendChild(await createTextNode('Non-Branded Text Styles', 40, 'Bold'));

  const pinkColor = { r: 1, g: 0, b: 0.4 }; // #FF0066 approx

  const headerRow = figma.createFrame();
  headerRow.layoutMode = 'HORIZONTAL';
  headerRow.itemSpacing = 24;
  headerRow.paddingTop = 16;
  headerRow.paddingBottom = 8;
  headerRow.fills = [];
  section.appendChild(headerRow);
  headerRow.layoutSizingHorizontal = 'FILL';
  headerRow.layoutSizingVertical = 'HUG';

  // Columns: Style Name (300), Usage (FILL), Font (150), Size (100), Space (80), Weight (80)
  const columns = [
    { name: 'Style Name', width: 300 },
    { name: 'Usage', width: 0, fill: true },
    { name: 'Font', width: 150 },
    { name: 'Size', width: 100 },
    { name: 'Space', width: 80 },
    { name: 'Weight', width: 80 },
  ];

  for (const col of columns) {
    const textNode = await createTextNode(col.name, 12, 'Bold', black, monoFontFamily);
    headerRow.appendChild(textNode);
    if (col.fill) {
      textNode.layoutSizingHorizontal = 'FILL';
    } else {
      textNode.layoutSizingHorizontal = 'FIXED';
      textNode.resize(col.width, textNode.height);
    }
  }

  const pathGroups = groupVariablesByPath(variables);
  const orderedGroups = getOrderedPathGroups(pathGroups, groupsConfig);

  for (const [groupName, groupVars] of orderedGroups) {
    // Divider + Group Name
    const groupHeader = figma.createFrame();
    groupHeader.layoutMode = 'HORIZONTAL';
    groupHeader.itemSpacing = 8;
    groupHeader.paddingTop = 24;
    groupHeader.paddingBottom = 16;
    groupHeader.primaryAxisAlignItems = 'MIN';
    groupHeader.counterAxisAlignItems = 'CENTER';
    groupHeader.fills = [];
    section.appendChild(groupHeader);
    groupHeader.layoutSizingHorizontal = 'FILL';
    groupHeader.layoutSizingVertical = 'HUG';

    const line = figma.createRectangle();
    line.resize(24, 1);
    line.fills = [{ type: 'SOLID', color: pinkColor }];
    groupHeader.appendChild(line);

    const groupTitle = await createTextNode(groupName, 12, 'Bold', black, monoFontFamily);
    groupHeader.appendChild(groupTitle);

    const line2 = figma.createRectangle();
    line2.resize(100, 1);
    line2.fills = [{ type: 'SOLID', color: pinkColor }];
    groupHeader.appendChild(line2);
    line2.layoutSizingHorizontal = 'FILL';

    for (const v of groupVars) {
      const row = figma.createFrame();
      row.layoutMode = 'HORIZONTAL';
      row.itemSpacing = 24;
      row.paddingTop = 16;
      row.paddingBottom = 16;
      row.fills = [];
      section.appendChild(row);
      row.layoutSizingHorizontal = 'FILL';
      row.layoutSizingVertical = 'HUG';

      // 1. Style Name Preview
      const val = typeof v.resolvedValue === 'object' ? v.resolvedValue : null;
      const previewCell = figma.createFrame();
      previewCell.layoutMode = 'VERTICAL';
      previewCell.fills = [];
      row.appendChild(previewCell);
      previewCell.layoutSizingHorizontal = 'FIXED';
      previewCell.resize(300, previewCell.height);

      const displayName = v.name.split('/').pop() || v.name;
      const fontSize = val?.fontSize ? Number(val.fontSize) : 16;
      const previewText = await createTextNode(displayName, fontSize, 'Bold', black, val?.family || 'Inter');
      previewCell.appendChild(previewText);

      // 2. Usage
      const usageText = await createTextNode(v.description || '—', 12, 'Regular', pinkColor, monoFontFamily);
      row.appendChild(usageText);
      usageText.layoutSizingHorizontal = 'FILL';

      // 3. Font
      const fontText = await createTextNode(val?.family || 'Mixed', 12, 'Regular', pinkColor, monoFontFamily);
      row.appendChild(fontText);
      fontText.layoutSizingHorizontal = 'FIXED';
      fontText.resize(150, fontText.height);

      // 4. Size (Size / Line Height)
      let lp = 'Auto';
      if (val?.lineHeight?.unit === 'PIXELS') {
        lp = String(Math.round(val.lineHeight.value));
      } else if (val?.lineHeight?.unit === 'PERCENT') {
        lp = `${val.lineHeight.value}%`;
      }
      const sizeStr = val ? `${val.fontSize} / ${lp}` : '—';
      const sizeText = await createTextNode(sizeStr, 12, 'Regular', pinkColor, monoFontFamily);
      row.appendChild(sizeText);
      sizeText.layoutSizingHorizontal = 'FIXED';
      sizeText.resize(100, sizeText.height);

      // 5. Space
      const ls = val?.letterSpacing?.value !== undefined ? val.letterSpacing.value : 0;
      const spaceText = await createTextNode(String(ls), 12, 'Regular', pinkColor, monoFontFamily);
      row.appendChild(spaceText);
      spaceText.layoutSizingHorizontal = 'FIXED';
      spaceText.resize(80, spaceText.height);

      // 6. Weight
      const weightMap: Record<string, string> = {
        Thin: '100',
        ExtraLight: '200',
        Light: '300',
        Regular: '400',
        Medium: '500',
        SemiBold: '600',
        Bold: '700',
        ExtraBold: '800',
        Black: '900',
      };
      const wStr = val?.style ? (weightMap[val.style.replace(/\s+/g, '')] || val.style) : '400';
      const weightText = await createTextNode(wStr, 12, 'Regular', pinkColor, monoFontFamily);
      row.appendChild(weightText);
      weightText.layoutSizingHorizontal = 'FIXED';
      weightText.resize(80, weightText.height);
    }
  }
}

export async function generateStyleGuideFromVariables(
  variables: StyleGuideVariableData[],
  collectionName: string,
  modeName: string,
  modeId?: string,
  groupsConfig?: StyleGuideGroupsConfig,
) {
  try {
    if (!variables || variables.length === 0) {
      figma.notify('No variables provided for style guide generation.');
      return;
    }
    await loadFonts();

    // Fetch local text styles explicitly to always include them
    const localTextStyles = await figma.getLocalTextStylesAsync();
    const textStyleVariables: StyleGuideVariableData[] = localTextStyles.map((style) => ({
      id: style.id,
      name: style.name,
      description: style.description,
      type: 'STRING',
      collectionId: 'local-text-styles',
      collectionName: 'Text Styles',
      resolvedValue: style.name,
      valuesByMode: {
        [modeId || 'default']: {
          family: style.fontName.family,
          style: style.fontName.style,
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          letterSpacing: style.letterSpacing,
        },
      },
    }));

    const normalizedVariables: StyleGuideVariableData[] = [];
    const textStyleNames = new Set(variables.map((v) => v.name));

    for (const v of variables) {
      const resolved = await getResolvedValueForMode(v, modeId);
      normalizedVariables.push({
        ...v,
        resolvedValue: resolved ?? v.resolvedValue,
      });
    }

    if (collectionName !== 'Text Styles') {
      for (const tsVar of textStyleVariables) {
        if (!textStyleNames.has(tsVar.name)) {
          normalizedVariables.push(tsVar);
        }
      }
    }

    const regularVars = normalizedVariables.filter((v) => v.collectionName !== 'Text Styles');
    const textStyleVars = normalizedVariables.filter((v) => v.collectionName === 'Text Styles');

    const groupVariables = groupVariablesByPath(regularVars);
    const orderedGroups = getOrderedPathGroups(groupVariables, groupsConfig);

    if (textStyleVars.length > 0) {
      orderedGroups.push(['Text Styles', textStyleVars]);
    }

    const { splitArtboards } = groupsConfig || {};
    let xOffset = figma.viewport.center.x;
    const yOffset = figma.viewport.center.y;
    const framesToZoom: FrameNode[] = [];

    const initializeContainer = async (frameName: string, x: number, title: string) => {
      let container = figma.currentPage.findOne((n) => n.name === frameName && n.type === 'FRAME') as FrameNode;
      if (!container) {
        container = figma.createFrame();
        container.name = frameName;
        container.x = x;
        container.y = yOffset;
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
      heroLeft.appendChild(await createTextNode(title, 16, 'Medium', muted));
      heroLeft.appendChild(await createTextNode(`${modeName}\nStyle Guide`, 56, 'Bold'));

      return container;
    };

    const addFooter = async (container: FrameNode) => {
      const footer = figma.createFrame();
      footer.layoutMode = 'VERTICAL';
      footer.paddingTop = 100;
      footer.fills = [];
      footer.appendChild(await createTextNode(`© ${new Date().getFullYear()} Design System — ${modeName}`, 10, 'Regular', muted));
      container.appendChild(footer);
    };

    if (splitArtboards) {
      for (const [groupName, groupVars] of orderedGroups) {
        const frameName = `${groupName} — ${collectionName} (${modeName})`;
        const title = `${collectionName} / ${groupName}`;
        const container = await initializeContainer(frameName, xOffset, title);

        if (groupName === 'Text Styles') {
          await generateTabularTypographySection(groupVars, container, modeName, groupsConfig);
        } else {
          await generateGroupSection(groupName, groupVars, container, modeName);
        }

        await addFooter(container);
        framesToZoom.push(container);
        xOffset += container.width + 200; // Increment xOffset for the next frame
      }
    } else {
      const frameName = `Style Guide — ${collectionName} (${modeName})`;
      const container = await initializeContainer(frameName, xOffset, collectionName);

      if (collectionName === 'Text Styles') {
        const tsVars = textStyleVars.length > 0 ? textStyleVars : normalizedVariables;
        await generateTabularTypographySection(tsVars, container, modeName, groupsConfig);
      } else {
        for (const [groupName, groupVars] of orderedGroups) {
          if (groupName === 'Text Styles') {
            await generateTabularTypographySection(groupVars, container, modeName, groupsConfig);
          } else {
            await generateGroupSection(groupName, groupVars, container, modeName);
          }
        }
      }

      await addFooter(container);
      framesToZoom.push(container);
    }

    figma.viewport.scrollAndZoomIntoView(framesToZoom);
    figma.notify(`Style guide generated for ${modeName}!`);
  } catch (err) {
    figma.notify('Failed to generate style guide. Check console.');
    console.error(err);
  }
}
