export async function getEffectStylesIdMap() {
  const effectStyles = await figma.getLocalEffectStylesAsync();
  const effectStylesToIdMap = new Map<string, EffectStyle>();
  effectStyles.forEach((style) => effectStylesToIdMap.set(style.id, style));
  return effectStylesToIdMap;
}
