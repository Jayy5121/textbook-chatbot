#!/usr/bin/env python3
"""
FAISS Embedding Indexer for Textbook Chatbot Project

This script loads text chunks, generates embeddings using sentence-transformers,
and creates a FAISS index for efficient similarity search.

Usage:
    python embedding_indexer.py
    python embedding_indexer.py --input custom_chunks.json --model all-mpnet-base-v2
"""

import argparse
import json
import pickle
import os
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Tuple

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    print("Error: sentence-transformers is required. Install it with:")
    print("pip install sentence-transformers")
    exit(1)

try:
    import faiss
except ImportError:
    print("Error: faiss is required. Install it with:")
    print("pip install faiss-cpu  # or faiss-gpu for GPU support")
    exit(1)

try:
    from tqdm import tqdm
except ImportError:
    print("Error: tqdm is required. Install it with:")
    print("pip install tqdm")
    exit(1)


def load_chunks_json(file_path: str) -> List[Dict[str, Any]]:
    """Load chunks from JSON file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            chunks = json.load(file)
        
        if not isinstance(chunks, list):
            raise ValueError("JSON file must contain an array of chunks")
        
        print(f"✅ Loaded {len(chunks)} chunks from {file_path}")
        return chunks
    
    except FileNotFoundError:
        raise FileNotFoundError(f"Chunks file not found: {file_path}")
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in {file_path}: {str(e)}")
    except Exception as e:
        raise Exception(f"Error loading chunks from {file_path}: {str(e)}")


def validate_chunks(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Validate and clean chunks, filtering out invalid ones."""
    valid_chunks = []
    skipped_count = 0
    
    for i, chunk in enumerate(chunks):
        # Check required fields
        if not isinstance(chunk, dict):
            print(f"⚠️  Skipping chunk {i}: not a dictionary")
            skipped_count += 1
            continue
        
        if 'id' not in chunk:
            print(f"⚠️  Skipping chunk {i}: missing 'id' field")
            skipped_count += 1
            continue
        
        if 'text' not in chunk:
            print(f"⚠️  Skipping chunk {chunk.get('id', 'unknown')}: missing 'text' field")
            skipped_count += 1
            continue
        
        # Check text content
        text = chunk['text']
        if not isinstance(text, str):
            print(f"⚠️  Skipping chunk {chunk['id']}: 'text' is not a string")
            skipped_count += 1
            continue
        
        if not text.strip():
            print(f"⚠️  Skipping chunk {chunk['id']}: empty or whitespace-only text")
            skipped_count += 1
            continue
        
        # Text is too short (less than 10 characters)
        if len(text.strip()) < 10:
            print(f"⚠️  Skipping chunk {chunk['id']}: text too short ({len(text.strip())} chars)")
            skipped_count += 1
            continue
        
        valid_chunks.append(chunk)
    
    if skipped_count > 0:
        print(f"⚠️  Skipped {skipped_count} invalid chunks")
    
    print(f"✅ {len(valid_chunks)} valid chunks ready for embedding")
    return valid_chunks


def load_embedding_model(model_name: str) -> SentenceTransformer:
    """Load the sentence transformer model."""
    print(f"🔄 Loading embedding model: {model_name}")
    
    try:
        model = SentenceTransformer(model_name)
        print(f"✅ Model loaded successfully")
        print(f"📏 Embedding dimension: {model.get_sentence_embedding_dimension()}")
        return model
    
    except Exception as e:
        print(f"❌ Error loading model {model_name}: {str(e)}")
        print("💡 Available lightweight models:")
        print("   - all-MiniLM-L6-v2 (384 dim, fast)")
        print("   - all-MiniLM-L12-v2 (384 dim, better quality)")
        print("   - all-mpnet-base-v2 (768 dim, best quality)")
        raise


def generate_embeddings(
    model: SentenceTransformer, 
    chunks: List[Dict[str, Any]], 
    batch_size: int = 32
) -> np.ndarray:
    """Generate embeddings for all chunk texts."""
    print(f"🔄 Generating embeddings for {len(chunks)} chunks...")
    
    # Extract texts
    texts = [chunk['text'] for chunk in chunks]
    
    # Generate embeddings with progress bar
    embeddings = []
    
    for i in tqdm(range(0, len(texts), batch_size), desc="Embedding batches"):
        batch_texts = texts[i:i + batch_size]
        batch_embeddings = model.encode(
            batch_texts,
            convert_to_numpy=True,
            show_progress_bar=False  # We have our own progress bar
        )
        embeddings.append(batch_embeddings)
    
    # Concatenate all embeddings
    all_embeddings = np.vstack(embeddings)
    
    print(f"✅ Generated embeddings: {all_embeddings.shape}")
    return all_embeddings


def create_faiss_index(embeddings: np.ndarray, index_type: str = "flat") -> faiss.Index:
    """Create and populate FAISS index."""
    print(f"🔄 Creating FAISS index ({index_type})...")
    
    dimension = embeddings.shape[1]
    
    if index_type.lower() == "flat":
        # L2 (Euclidean) distance
        index = faiss.IndexFlatL2(dimension)
    elif index_type.lower() == "ip":
        # Inner Product (cosine similarity after normalization)
        index = faiss.IndexFlatIP(dimension)
        # Normalize embeddings for cosine similarity
        faiss.normalize_L2(embeddings)
    else:
        raise ValueError(f"Unsupported index type: {index_type}")
    
    # Add embeddings to index
    index.add(embeddings.astype(np.float32))
    
    print(f"✅ FAISS index created with {index.ntotal} vectors")
    return index


def create_metadata_mapping(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Create metadata mapping for FAISS index positions."""
    mapping = []
    
    for i, chunk in enumerate(chunks):
        metadata = {
            'faiss_id': i,
            'chunk_id': chunk['id'],
            'text': chunk['text'],
            'char_count': len(chunk['text']),
            'word_count': len(chunk['text'].split())
        }
        
        # Include additional fields if they exist
        for field in ['index', 'source_file', 'method', 'sentence_count']:
            if field in chunk:
                metadata[field] = chunk[field]
        
        mapping.append(metadata)
    
    return mapping


def save_faiss_index(index: faiss.Index, file_path: str):
    """Save FAISS index to file."""
    try:
        faiss.write_index(index, file_path)
        print(f"✅ FAISS index saved to: {file_path}")
    except Exception as e:
        raise Exception(f"Error saving FAISS index to {file_path}: {str(e)}")


def save_metadata_mapping(mapping: List[Dict[str, Any]], file_path: str):
    """Save metadata mapping to pickle file."""
    try:
        with open(file_path, 'wb') as file:
            pickle.dump(mapping, file)
        print(f"✅ Metadata mapping saved to: {file_path}")
    except Exception as e:
        raise Exception(f"Error saving metadata mapping to {file_path}: {str(e)}")


def save_metadata_json(mapping: List[Dict[str, Any]], file_path: str):
    """Save metadata mapping to JSON file (for human readability)."""
    try:
        with open(file_path, 'w', encoding='utf-8') as file:
            json.dump(mapping, file, indent=2, ensure_ascii=False)
        print(f"✅ Metadata mapping (JSON) saved to: {file_path}")
    except Exception as e:
        raise Exception(f"Error saving metadata JSON to {file_path}: {str(e)}")


def main():
    parser = argparse.ArgumentParser(
        description="Generate embeddings and create FAISS index for textbook chunks",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python embedding_indexer.py
  python embedding_indexer.py --input custom_chunks.json
  python embedding_indexer.py --model all-mpnet-base-v2 --index_type ip
        """
    )
    
    parser.add_argument(
        '--input', '-i',
        default='Intro_to_ml_cleaned_chunks_sliding.json',
        help='Input JSON file with chunks (default: Intro_to_ml_cleaned_chunks_sliding.json)'
    )
    
    parser.add_argument(
        '--model', '-m',
        default='all-MiniLM-L6-v2',
        help='Sentence transformer model name (default: all-MiniLM-L6-v2)'
    )
    
    parser.add_argument(
        '--index_type',
        choices=['flat', 'ip'],
        default='flat',
        help='FAISS index type: flat (L2) or ip (inner product/cosine) (default: flat)'
    )
    
    parser.add_argument(
        '--batch_size',
        type=int,
        default=32,
        help='Batch size for embedding generation (default: 32)'
    )
    
    parser.add_argument(
        '--output_prefix',
        default='intro_ml',
        help='Output file prefix (default: intro_ml)'
    )
    
    args = parser.parse_args()
    
    try:
        # Load and validate chunks
        print("=" * 50)
        print("🚀 Starting FAISS Index Creation")
        print("=" * 50)
        
        chunks = load_chunks_json(args.input)
        valid_chunks = validate_chunks(chunks)
        
        if not valid_chunks:
            print("❌ No valid chunks found. Exiting.")
            return 1
        
        # Load embedding model
        model = load_embedding_model(args.model)
        
        # Generate embeddings
        embeddings = generate_embeddings(model, valid_chunks, args.batch_size)
        
        # Create FAISS index
        index = create_faiss_index(embeddings, args.index_type)
        
        # Create metadata mapping
        metadata_mapping = create_metadata_mapping(valid_chunks)
        
        # Generate output filenames
        index_file = f"{args.output_prefix}_index.faiss"
        metadata_pickle = f"{args.output_prefix}_metadata.pkl"
        metadata_json = f"{args.output_prefix}_metadata.json"
        
        # Save files
        save_faiss_index(index, index_file)
        save_metadata_mapping(metadata_mapping, metadata_pickle)
        save_metadata_json(metadata_mapping, metadata_json)
        
        # Print summary
        print("\n" + "=" * 50)
        print("✅ INDEXING COMPLETE!")
        print("=" * 50)
        print(f"📊 Processed: {len(valid_chunks)} chunks")
        print(f"📏 Embedding dimension: {embeddings.shape[1]}")
        print(f"🔍 Index type: {args.index_type.upper()}")
        print(f"🤖 Model: {args.model}")
        print("\n📁 Output files:")
        print(f"   • FAISS index: {index_file}")
        print(f"   • Metadata (pickle): {metadata_pickle}")
        print(f"   • Metadata (JSON): {metadata_json}")
        
        return 0
    
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        return 1


if __name__ == "__main__":
    exit(main())