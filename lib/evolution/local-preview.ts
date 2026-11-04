export function isEvolutionLocalPreview() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.EVOLUTION_LOCAL_PREVIEW === "true"
  );
}
