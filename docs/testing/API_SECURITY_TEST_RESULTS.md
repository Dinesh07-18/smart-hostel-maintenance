# Semantic Search Authorization Integration Test Results

## 1. Execution Details

- Date: 2026-11-14
- Test file: `tests/integration/semantic-search-authorization.test.js`
- Test type: Live API integration test
- Test runner: Node.js built-in test runner
- Environment: Local development environment with demo accounts
- Authentication endpoint: `POST /api/auth/login`
- Search endpoint: `POST /api/search/complaints`
- Embedding service: FastAPI on `127.0.0.1:8001`
- Embedding model: `sentence-transformers/all-MiniLM-L6-v2`
- Vector dimension: 384

## 2. Execution Command

Run from the backend directory:

```powershell
$env:RUN_SEMANTIC_SEARCH_INTEGRATION = "1"
npm test -- ..\tests\integration\semantic-search-authorization.test.js
```

## 3. Automated Authorization Test Results

| Test case | Expected result | Actual result | Status |
|---|---|---|---|
| Unauthenticated search | HTTP 401 | HTTP 401 | PASS |
| Student forged-scope request | Same results as baseline | Same results | PASS |
| Maintenance Staff forged-scope request | Same results as baseline | Same results | PASS |
| Warden forged-scope request | Same results as baseline | Same results | PASS |
| Administrator forged-scope request | Same results as baseline | Same results | PASS |

## 4. Forged Request Fields

The test submitted these client-controlled fields:

- `hostel_id: 999999`
- `hostel_ids: [1, 2, 3, 999999]`
- `user_id: 999999`
- `role: "ADMINISTRATOR"`

For each authenticated demo role, forged request results were compared with a baseline request using the same query and limit.

## 5. Latest Automated Execution Summary

| Metric | Result |
|---|---:|
| Tests passed | 6 |
| Tests failed | 0 |
| Tests skipped | 0 |
| Total tests | 6 |
| Duration | Approximately 4.30 seconds |

**Overall automated authorization result: PASS**

## 6. Semantic Similarity Threshold Verification

The embedding service applies a minimum raw cosine-similarity threshold of `0.50`. Matches below this threshold are excluded.

### Manual UI verification

| Test query | Observed result | Status |
|---|---|---|
| `water leaking under bathroom sink` | Two relevant results displayed: 79.9% and 63.6% | PASS |
| `lost my mobile phone in the college parking area` | No similar complaints found | PASS |

These checks were performed through the Student complaint form. No complaint was submitted during these checks.

**Important:** The displayed similarity score is raw cosine similarity expressed as a percentage. A threshold of `0.50` is not a calibrated 50% probability that a result is correct.

## 7. Scope and Limitations

- Tested the running local API using four configured demo accounts.
- Verified that forged identity and hostel fields did not change the tested accounts search results.
- Verified that unauthenticated semantic search is rejected.
- Manually verified relevant and unrelated search behavior with the 0.50 cosine-similarity threshold.
- Did not independently verify every possible cross-hostel boundary, inactive-assignment scenario, or every database account.
- The tests did not modify complaint or assignment records.
- Manual threshold checks do not replace automated boundary tests for scores immediately below, at, and above 0.50.

## 8. Conclusion

All six tests reported by the latest live semantic-search authorization integration run passed, with zero failures and zero skipped tests.

The manual UI checks also demonstrated that relevant results above the configured 0.50 cosine-similarity threshold were displayed and an unrelated query returned no similar complaints.

These results support the tested authorization and similarity-filtering behavior. Additional authorization edge cases and automated threshold-boundary tests should be performed before claiming complete security or search-quality verification.
