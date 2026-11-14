#!/usr/bin/env python3
"""Compute Precision@K, Recall@K and MRR from recorded search judgments.
Input JSONL rows: {"relevant_ids": [..], "retrieved_ids": [..]}.
No metrics are generated until real API retrieval IDs are supplied.
"""
import argparse, json
from pathlib import Path


def evaluate(rows, k):
    precisions, recalls, reciprocal_ranks = [], [], []
    for index, row in enumerate(rows, 1):
        relevant = set(row.get("relevant_ids", []))
        retrieved = row.get("retrieved_ids", [])[:k]
        hits = [item for item in retrieved if item in relevant]
        precisions.append(len(hits) / k if k else 0.0)
        recalls.append(len(hits) / len(relevant) if relevant else 0.0)
        rank = next((i for i, item in enumerate(retrieved, 1) if item in relevant), None)
        reciprocal_ranks.append(1 / rank if rank else 0.0)
        print(f"Case {index}: P@{k}={precisions[-1]:.3f}, R@{k}={recalls[-1]:.3f}, RR={reciprocal_ranks[-1]:.3f}")
    count = len(rows) or 1
    print(f"\nQueries: {len(rows)}")
    print(f"Precision@{k}: {sum(precisions)/count:.4f}")
    print(f"Recall@{k}:    {sum(recalls)/count:.4f}")
    print(f"MRR:           {sum(reciprocal_ranks)/count:.4f}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("results", type=Path, help="JSONL file containing judged API results")
    parser.add_argument("-k", type=int, default=5)
    args = parser.parse_args()
    if args.k < 1:
        parser.error("k must be >= 1")
    rows = [json.loads(line) for line in args.results.read_text(encoding="utf-8").splitlines() if line.strip()]
    if not rows:
        parser.error("No evaluation rows found")
    evaluate(rows, args.k)

if __name__ == "__main__":
    main()
