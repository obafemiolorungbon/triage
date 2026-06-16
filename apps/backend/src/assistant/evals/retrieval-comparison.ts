export type RetrievalComparison = {
  lexicalRecall: number;
  vectorRecall: number;
  fusedRecall: number;
  fusedIsSuperior: boolean;
};

export function compareRetrievalModes(input: {
  relevantIds: string[];
  lexicalIds: string[];
  vectorIds: string[];
  fusedIds: string[];
}): RetrievalComparison {
  const relevant = new Set(input.relevantIds);
  const recall = (ids: string[]) => {
    if (relevant.size === 0) return 0;
    return new Set(ids.filter((id) => relevant.has(id))).size / relevant.size;
  };
  const lexicalRecall = recall(input.lexicalIds);
  const vectorRecall = recall(input.vectorIds);
  const fusedRecall = recall(input.fusedIds);
  return {
    lexicalRecall,
    vectorRecall,
    fusedRecall,
    fusedIsSuperior: fusedRecall > lexicalRecall && fusedRecall > vectorRecall,
  };
}
