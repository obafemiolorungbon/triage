import { compareRetrievalModes } from './retrieval-comparison';

describe('retrieval mode comparison', () => {
  it('only declares fusion superior when its measured recall beats both modes', () => {
    expect(
      compareRetrievalModes({
        relevantIds: ['a', 'b', 'c'],
        lexicalIds: ['a'],
        vectorIds: ['b'],
        fusedIds: ['a', 'b', 'c'],
      }),
    ).toEqual({
      lexicalRecall: 1 / 3,
      vectorRecall: 1 / 3,
      fusedRecall: 1,
      fusedIsSuperior: true,
    });

    expect(
      compareRetrievalModes({
        relevantIds: ['a'],
        lexicalIds: ['a'],
        vectorIds: [],
        fusedIds: ['a'],
      }).fusedIsSuperior,
    ).toBe(false);
  });
});
