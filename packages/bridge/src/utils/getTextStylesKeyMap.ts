export async function getTextStylesKeyMap() {
  const textStyles = await figma.getLocalTextStylesAsync();
  const textStyleToKeyMap = new Map<string, TextStyle>();
  textStyles.forEach((style) => {
    const splitName = style.name.split('/').map((name) => name.trim());
    const trimmedName = splitName.join('/');
    return textStyleToKeyMap.set(trimmedName, style);
  });
  return textStyleToKeyMap;
}
