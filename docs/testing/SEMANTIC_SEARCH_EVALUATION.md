# Semantic search evaluation

`database/seeds/demo_search_evaluation.jsonl` contains five paraphrased query cases and relevant complaint titles for the development seed. It is a relevance-judgment starter set, not a measured benchmark.

## Procedure

1. Run the development seed and start MySQL, the Node API, the FastAPI embedding service and Qdrant.
2. Ensure all sample complaints have been embedded and indexed.
3. Execute each query through `POST /api/search/complaints` separately under a role with an active assignment to the relevant hostel.
4. Record the returned complaint IDs and manually verify relevance. Convert the judgments to JSONL rows with `relevant_ids` and `retrieved_ids`.
5. Run `python scripts/evaluate-semantic-search.py path/to/judged-results.jsonl --k 5`.

The script computes Precision@K, Recall@K and MRR. Do not report scores until the API has actually been queried and the returned IDs have been judged. Run role-isolation checks separately; a high relevance score does not establish authorization correctness.
