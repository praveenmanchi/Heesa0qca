export interface VariableExport {
  id: string; // Figma UUID
  name: string;
  description: string;
  type: string;
  collectionId: string;
  collectionName: string;
  valuesByMode: Record<string, any>;
}

export interface VariableDiff {
  added: VariableExport[];
  removed: VariableExport[];
  changed: { old: VariableExport; new: VariableExport }[];
}

function isDeepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key)) return false;

    const v1 = obj1[key];
    const v2 = obj2[key];

    if (typeof v1 === 'number' && typeof v2 === 'number') {
      // Tolerate floating point variance up to 3 decimal places
      if (Math.abs(v1 - v2) > 0.001) return false;
    } else if (typeof v1 === 'object' && v1 !== null && typeof v2 === 'object' && v2 !== null) {
      if (!isDeepEqual(v1, v2)) return false;
    } else if (v1 !== v2) {
      return false;
    }
  }

  return true;
}

export function compareVariables(oldVars: VariableExport[], newVars: VariableExport[]): VariableDiff {
  // Use a composite key, since IDs between differently generated files might be unreliable,
  // but if it's the same Figma file, ID is best.
  // However, older JSON commits likely have the same ID.
  // Let's use ID if available, fallback to collectionName/name.

  const oldMap = new Map(oldVars.map((v) => [v.id || `${v.collectionName}/${v.name}`, v]));
  const newMap = new Map(newVars.map((v) => [v.id || `${v.collectionName}/${v.name}`, v]));

  const added: VariableExport[] = [];
  const removed: VariableExport[] = [];
  const changed: { old: VariableExport; new: VariableExport }[] = [];

  for (const [key, newVar] of newMap.entries()) {
    const oldVar = oldMap.get(key);
    if (!oldVar) {
      added.push(newVar);
    } else if (
      oldVar.description !== newVar.description ||
      oldVar.type !== newVar.type ||
      !isDeepEqual(oldVar.valuesByMode, newVar.valuesByMode)
    ) {
      changed.push({ old: oldVar, new: newVar });
    }
  }

  for (const [key, oldVar] of oldMap.entries()) {
    if (!newMap.has(key)) {
      removed.push(oldVar);
    }
  }

  return { added, removed, changed };
}
