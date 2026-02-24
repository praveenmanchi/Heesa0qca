const fs = require('fs');

const oldVars = [
  { id: '1', name: 'var1', collectionName: 'col1', type: 'COLOR', valuesByMode: { 'mode1': 'old' } },
  { id: '2', name: 'var2', collectionName: 'col1', type: 'COLOR', valuesByMode: { 'mode1': 'keep' } }
];

const newVars = [
  { id: '2', name: 'var2', collectionName: 'col1', type: 'COLOR', valuesByMode: { 'mode1': 'keep' } },
  { id: '1', name: 'var1', collectionName: 'col1', type: 'COLOR', valuesByMode: { 'mode1': 'new' } },
  { id: '3', name: 'var3', collectionName: 'col1', type: 'COLOR', valuesByMode: { 'mode1': 'add' } }
];

function compareVariables(oldV, newV) {
  const oldMap = new Map(oldV.map((v) => [v.id || `${v.collectionName}/${v.name}`, v]));
  const newMap = new Map(newV.map((v) => [v.id || `${v.collectionName}/${v.name}`, v]));

  const added = [];
  const removed = [];
  const changed = [];

  for (const [key, newVar] of newMap.entries()) {
    const oldVar = oldMap.get(key);
    if (!oldVar) {
      added.push(newVar);
    } else {
      if (
        oldVar.description !== newVar.description ||
        oldVar.type !== newVar.type ||
        JSON.stringify(oldVar.valuesByMode) !== JSON.stringify(newVar.valuesByMode)
      ) {
        changed.push({ old: oldVar, new: newVar });
      }
    }
  }

  for (const [key, oldVar] of oldMap.entries()) {
    if (!newMap.has(key)) {
      removed.push(oldVar);
    }
  }

  return { added, removed, changed };
}

const diff = compareVariables(oldVars, newVars);
console.log('Added:', diff.added.length);
console.log('Removed:', diff.removed.length);
console.log('Modified:', diff.changed.length);
