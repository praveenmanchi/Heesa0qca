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

async function generateColorsSection(
  variables: StyleGuideVariableData[],
  container: FrameNode,
  modeName: string,
  groupsConfig?: StyleGuideGroupsConfig,
) {
  const colorVars = variables.filter((v) => v.type === 'COLOR');
  if (colorVars.length === 0) return;

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
  const desc = await createTextNode(
    `Color palette for ${modeName}. These variables power the design system.`,
    16,
    'Regular',
    muted,
  );
  section.appendChild(desc);
  desc.layoutSizingHorizontal = 'FILL';

  const pathGroups = groupVariablesByPath(colorVars);
  const orderedGroups = getOrderedPathGroups(pathGroups, groupsConfig);
  for (const [groupName, groupVars] of orderedGroups) {
    const topFrame = figma.createFrame();
    topFrame.layoutMode = 'VERTICAL';
    topFrame.itemSpacing = 24;
    topFrame.fills = [];
    section.appendChild(topFrame);
    topFrame.layoutSizingHorizontal = 'FILL';
    topFrame.layoutSizingVertical = 'HUG';

    topFrame.appendChild(await createTextNode(`${groupName} colors`, 20, 'Bold'));

    const rowContainer = figma.createFrame();
    rowContainer.layoutMode = 'HORIZONTAL';
    rowContainer.itemSpacing = 16;
    rowContainer.fills = [];
    topFrame.appendChild(rowContainer);
    rowContainer.layoutSizingHorizontal = 'FILL';
    rowContainer.layoutSizingVertical = 'HUG';

    for (const v of groupVars) {
      const swatch = await createColorSwatchFromVariable(v);
      if (swatch) rowContainer.appendChild(swatch);
    }
  }
}

async function generateTypographySection(
  variables: StyleGuideVariableData[],
  container: FrameNode,
  modeName: string,
  groupsConfig?: StyleGuideGroupsConfig,
) {
  const stringVars = variables.filter((v) => v.type === 'STRING');
  const fontVars = stringVars.filter(
    (v) => v.name.toLowerCase().includes('font') || v.name.toLowerCase().includes('family') || v.name.toLowerCase().includes('typography'),
  );
  if (fontVars.length === 0) return;

  const section = figma.createFrame();
  section.name = 'Typography Section';
  section.layoutMode = 'VERTICAL';
  section.itemSpacing = 40;
  section.paddingTop = 80;
  section.paddingBottom = 80;
  section.fills = [];
  container.appendChild(section);
  section.layoutSizingHorizontal = 'FILL';
  section.layoutSizingVertical = 'HUG';

  section.appendChild(await createTextNode('Typography', 40, 'Bold'));
  const desc = await createTextNode(
    `Font families and typography for ${modeName}.`,
    16,
    'Regular',
    muted,
  );
  section.appendChild(desc);
  desc.layoutSizingHorizontal = 'FILL';

  const pathGroups = groupVariablesByPath(fontVars);
  const orderedGroups = getOrderedPathGroups(pathGroups, groupsConfig);
  for (const [groupName, groupVars] of orderedGroups) {
    const topFrame = figma.createFrame();
    topFrame.layoutMode = 'VERTICAL';
    topFrame.itemSpacing = 16;
    topFrame.fills = [];
    section.appendChild(topFrame);
    topFrame.layoutSizingHorizontal = 'FILL';
    topFrame.layoutSizingVertical = 'HUG';

    topFrame.appendChild(await createTextNode(groupName, 18, 'Bold'));

    for (const v of groupVars) {
      const val = String(v.resolvedValue ?? '—');
      const row = figma.createFrame();
      row.layoutMode = 'HORIZONTAL';
      row.itemSpacing = 16;
      row.fills = [];
      row.paddingTop = 8;
      row.paddingBottom = 8;
      row.paddingLeft = 12;
      row.paddingRight = 12;
      row.cornerRadius = 8;
      row.fills = [{ type: 'SOLID', color: { r: 0.97, g: 0.97, b: 0.97 } }];
      topFrame.appendChild(row);
      row.layoutSizingHorizontal = 'FILL';
      row.layoutSizingVertical = 'HUG';

      try {
        await figma.loadFontAsync({ family: val, style: 'Regular' });
        const sample = await createTextNode(`Aa — ${val}`, 12, 'Regular', black, val);
        row.appendChild(sample);
      } catch {
        const sample = await createTextNode(`Aa — ${val}`, 12, 'Regular', black);
        row.appendChild(sample);
      }
      const label = await createTextNode(v.name.split('/').pop() || v.name, 10, 'Regular', muted, monoFontFamily);
      row.appendChild(label);
      label.layoutSizingHorizontal = 'FILL';
    }
  }
}

async function generateNumbersSection(
  variables: StyleGuideVariableData[],
  container: FrameNode,
  modeName: string,
  groupsConfig?: StyleGuideGroupsConfig,
) {
  const floatVars = variables.filter((v) => v.type === 'FLOAT');
  if (floatVars.length === 0) return;

  const section = figma.createFrame();
  section.name = 'Numbers Section';
  section.layoutMode = 'VERTICAL';
  section.itemSpacing = 24;
  section.paddingTop = 80;
  section.paddingBottom = 80;
  section.fills = [];
  container.appendChild(section);
  section.layoutSizingHorizontal = 'FILL';
  section.layoutSizingVertical = 'HUG';

  section.appendChild(await createTextNode('Spacing & Numbers', 40, 'Bold'));
  const desc = await createTextNode(
    `Numeric and spacing variables for ${modeName}.`,
    16,
    'Regular',
    muted,
  );
  section.appendChild(desc);
  desc.layoutSizingHorizontal = 'FILL';

  const pathGroups = groupVariablesByPath(floatVars);
  const orderedGroups = getOrderedPathGroups(pathGroups, groupsConfig);
  for (const [groupName, groupVars] of orderedGroups) {
    const topFrame = figma.createFrame();
    topFrame.layoutMode = 'VERTICAL';
    topFrame.itemSpacing = 12;
    topFrame.fills = [];
    section.appendChild(topFrame);
    topFrame.layoutSizingHorizontal = 'FILL';
    topFrame.layoutSizingVertical = 'HUG';

    topFrame.appendChild(await createTextNode(groupName, 18, 'Bold'));

    const grid = figma.createFrame();
    grid.layoutMode = 'HORIZONTAL';
    grid.itemSpacing = 12;
    grid.fills = [];
    topFrame.appendChild(grid);
    grid.layoutSizingHorizontal = 'FILL';
    grid.layoutSizingVertical = 'HUG';

    for (const v of groupVars) {
      const val = typeof v.resolvedValue === 'number'
        ? (v.resolvedValue % 1 === 0 ? v.resolvedValue : v.resolvedValue.toFixed(2))
        : String(v.resolvedValue ?? '—');
      const cell = figma.createFrame();
      cell.layoutMode = 'VERTICAL';
      cell.itemSpacing = 4;
      cell.paddingTop = 8;
      cell.paddingBottom = 8;
      cell.paddingLeft = 12;
      cell.paddingRight = 12;
      cell.cornerRadius = 8;
      cell.fills = [{ type: 'SOLID', color: { r: 0.97, g: 0.97, b: 0.97 } }];
      grid.appendChild(cell);
      cell.layoutSizingHorizontal = 'HUG';
      cell.layoutSizingVertical = 'HUG';

      const label = await createTextNode(v.name.split('/').pop() || v.name, 10, 'Medium', black, monoFontFamily);
      cell.appendChild(label);
      const valueText = await createTextNode(String(val), 14, 'Bold', black, monoFontFamily);
      cell.appendChild(valueText);
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

    // Normalize values so aliases are fully resolved for the current mode
    const normalizedVariables: StyleGuideVariableData[] = [];
    for (const v of variables) {
      const resolved = await getResolvedValueForMode(v, modeId);
      normalizedVariables.push({
        ...v,
        resolvedValue: resolved ?? v.resolvedValue,
      });
    }

    const frameName = `Style Guide — ${collectionName} (${modeName})`;
    let container = figma.currentPage.findOne((n) => n.name === frameName && n.type === 'FRAME') as FrameNode;
    if (!container) {
      container = figma.createFrame();
      container.name = frameName;
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
    heroLeft.appendChild(await createTextNode(collectionName, 16, 'Medium', muted));
    heroLeft.appendChild(await createTextNode(`${modeName}\nStyle Guide`, 56, 'Bold'));

    await generateColorsSection(normalizedVariables, container, modeName, groupsConfig);
    await generateTypographySection(normalizedVariables, container, modeName, groupsConfig);
    await generateNumbersSection(normalizedVariables, container, modeName, groupsConfig);

    const footer = figma.createFrame();
    footer.layoutMode = 'VERTICAL';
    footer.paddingTop = 100;
    footer.fills = [];
    footer.appendChild(await createTextNode(`© ${new Date().getFullYear()} Design System — ${modeName}`, 10, 'Regular', muted));
    container.appendChild(footer);

    figma.viewport.scrollAndZoomIntoView([container]);
    figma.notify(`Style guide generated for ${modeName}!`);
  } catch (err) {
    figma.notify('Failed to generate style guide. Check console.');
    console.error(err);
  }
}
