export async function getTextStylesIdMap() {
  const textStyles = await figma.getLocalTextStylesAsync();
  const textStyleToIdMap = new Map<string, TextStyle>();
  textStyles.forEach((style) => textStyleToIdMap.set(style.id, style));
  return textStyleToIdMap;
}
