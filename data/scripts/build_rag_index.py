from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from data_layer_common import FEATURES_DIR, keywords_from_text, read_jsonl, utc_now, write_json, write_jsonl


RAG_DIR = FEATURES_DIR / "rag_index"
CHUNKS_PATH = FEATURES_DIR / "chunks" / "document_chunks.jsonl"


def build_rag_index(limit: int | None = None, with_embeddings: bool = False) -> dict[str, Any]:
    RAG_DIR.mkdir(parents=True, exist_ok=True)
    chunks = [row for row in read_jsonl(CHUNKS_PATH) if row.get("is_content_document")]
    if limit:
        chunks = chunks[: max(0, limit)]

    rag_rows = [_rag_row(row) for row in chunks]
    keyword_index: dict[str, list[str]] = defaultdict(list)
    for row in rag_rows:
        for keyword in row["keywords"]:
            keyword_index[keyword].append(row["chunk_id"])

    embedding_status = _try_build_embeddings(rag_rows) if with_embeddings else _skip_embeddings()
    manifest = {
        "generated_at": utc_now(),
        "index_type": "local_keyword_plus_optional_embeddings",
        "chunks_indexed": len(rag_rows),
        "documents_indexed": len({row["document_id"] for row in rag_rows}),
        "keyword_terms": len(keyword_index),
        "keyword_index_ready": True,
        "embedding_status": embedding_status["status"],
        "embedding_model": embedding_status.get("model"),
        "embedding_note": embedding_status.get("note"),
        "vector_db_status": "roadmap",
        "files": {
            "chunks_for_rag": "data/features/rag_index/chunks_for_rag.jsonl",
            "simple_keyword_index": "data/features/rag_index/simple_keyword_index.json",
            "embeddings": "data/features/rag_index/embeddings.npy",
            "embeddings_meta": "data/features/rag_index/embeddings_meta.json",
        },
    }
    write_jsonl(RAG_DIR / "chunks_for_rag.jsonl", rag_rows)
    write_json(RAG_DIR / "simple_keyword_index.json", dict(sorted(keyword_index.items())))
    write_json(RAG_DIR / "rag_index_manifest.json", manifest)
    return manifest


def _rag_row(row: dict[str, Any]) -> dict[str, Any]:
    text = str(row.get("text") or "")
    keywords = keywords_from_text(text, limit=16)
    return {
        "chunk_id": row.get("chunk_id"),
        "document_id": row.get("document_id"),
        "chunk_index": row.get("chunk_index"),
        "title": row.get("title"),
        "source_url": row.get("source_url"),
        "category": row.get("category"),
        "file_type": row.get("file_type"),
        "char_count": row.get("char_count"),
        "word_count": row.get("word_count"),
        "keywords": keywords,
        "text": text,
        "text_preview": text[:500],
    }


def _try_build_embeddings(rows: list[dict[str, Any]]) -> dict[str, str]:
    try:
        from sentence_transformers import SentenceTransformer  # type: ignore
        import numpy as np  # type: ignore
    except Exception:
        write_json(
            RAG_DIR / "embeddings_meta.json",
            {
                "generated_at": utc_now(),
                "status": "unavailable",
                "note": "sentence-transformers or numpy is not installed; keyword index is ready.",
            },
        )
        return {"status": "unavailable", "note": "sentence-transformers/numpy not installed; using keyword index fallback"}
    try:
        model_name = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
        model = SentenceTransformer(model_name)
        texts = [row["text"][:2000] for row in rows]
        embeddings = model.encode(texts, show_progress_bar=False, normalize_embeddings=True)
        np.save(RAG_DIR / "embeddings.npy", embeddings)
        write_json(
            RAG_DIR / "embeddings_meta.json",
            {
                "generated_at": utc_now(),
                "status": "ready",
                "model": model_name,
                "rows": len(rows),
                "dimensions": int(embeddings.shape[1]) if len(rows) else 0,
            },
        )
        return {"status": "ready", "model": model_name, "note": "local sentence-transformers embeddings generated"}
    except Exception as exc:
        write_json(
            RAG_DIR / "embeddings_meta.json",
            {
                "generated_at": utc_now(),
                "status": "failed",
                "error": type(exc).__name__,
                "note": "keyword index remains available",
            },
        )
        return {"status": "failed", "note": f"embedding generation failed: {type(exc).__name__}"}


def _skip_embeddings() -> dict[str, str]:
    write_json(
        RAG_DIR / "embeddings_meta.json",
        {
            "generated_at": utc_now(),
            "status": "skipped",
            "note": "Embeddings are optional. Run build_rag_index.py --with-embeddings if a local sentence-transformers model is available.",
        },
    )
    return {"status": "skipped", "note": "keyword index ready; embeddings skipped by default for lightweight demo"}


def main() -> None:
    parser = argparse.ArgumentParser(description="Build local RAG-ready keyword index and optional embeddings.")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--with-embeddings", action="store_true", help="Try local sentence-transformers embeddings. Default keeps demo lightweight.")
    args = parser.parse_args()
    manifest = build_rag_index(args.limit, args.with_embeddings)
    print(json.dumps({"chunks_indexed": manifest["chunks_indexed"], "keyword_terms": manifest["keyword_terms"], "embedding_status": manifest["embedding_status"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
