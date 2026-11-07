// UI-independent editing state: inputs survive errors, conflicts require explicit rebase.
export function beginCharacterEdit(character) {
  const version = character.versions.at(-1);
  return { characterId: character.characterId, expectedVersion: version.version,
    input: { name: version.name, surfaceParameters: [...version.surfaceParameters] },
    unsaved: false, conflict: null, errorCode: null };
}
export function changeCharacterEdit(state, input) {
  return { ...state, input: structuredClone(input), unsaved: true, errorCode: null };
}
export function characterSaveFailed(state, errorCode) {
  return { ...state, errorCode, unsaved: true };
}
export function compareCharacterEdit(state, latest) {
  if (latest.characterId !== state.characterId) throw new Error('CHARACTER_ID_MISMATCH');
  return { ...state, conflict: structuredClone(latest), errorCode: 'CHARACTER_CONFLICT' };
}
export function rebaseCharacterEdit(state, chosenInput) {
  if (!state.conflict) throw new Error('CHARACTER_CONFLICT_REQUIRED');
  const version = state.conflict.versions.at(-1);
  return { ...state, expectedVersion: version.version, input: structuredClone(chosenInput), conflict: null, errorCode: null, unsaved: true };
}
