export function rebaseHydratedReportFormat(previousSerialized, format, persist) {
  const serialized = JSON.stringify(format);
  const changed = serialized !== previousSerialized;
  if (changed && typeof persist === "function") persist(serialized);
  return { changed, serialized };
}
