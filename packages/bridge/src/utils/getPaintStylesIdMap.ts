export async function getPaintStylesIdMap() {
  const paints = await figma.getLocalPaintStylesAsync();
  const paintToIdMap = new Map<string, PaintStyle>();
  paints.forEach((style) => paintToIdMap.set(style.id, style));
  return paintToIdMap;
}
