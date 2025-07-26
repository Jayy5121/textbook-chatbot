#!/usr/bin/env python3
"""
FAISS Search Script for Textbook Chatbot

This script loads a FAISS index and searches for the most relevant textbook chunks
based on user queries using semantic similarity.

Usage:
    python search_faiss.py
    python search_faiss.py --query "What is machine learning?"
    python search_faiss.py --query "neural networks" --top_k 3
    python search_faiss.py --interactive
"""

import argparse
import pickle
import sys
import os
import json
from pathlib import Path
from typing import List, Dict, Any, Tuple

try:
    import faiss
except ImportError:
    print(json.dumps({"error": "faiss is required. Install it with: pip install faiss-cpu"}))
    sys.exit(1)

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    print(json.dumps({"error": "sentence-transformers is required. Install it with: pip install sentence-transformers"}))
    sys.exit(1)

import numpy as np


class TextbookSearcher:
    """FAISS-based semantic search for textbook chunks."""
    
    def __init__(
        self, 
        index_path: str = "intro_ml_index.faiss",
        metadata_path: str = "intro_ml_metadata.pkl",
        model_name: str = "all-MiniLM-L6-v2",
        json_mode: bool = False
    ):
        """
        Initialize the textbook searcher.
        
        Args:
            index_path: Path to FAISS index file
            metadata_path: Path to metadata pickle file
            model_name: Sentence transformer model name
            json_mode: If True, suppress all non-JSON output
        """
        self.index_path = index_path
        self.metadata_path = metadata_path
        self.model_name = model_name
        self.json_mode = json_mode
        
        self.index = None
        self.metadata = None
        self.model = None
        
        # Load components
        self._load_index()
        self._load_metadata()
        self._load_model()
        
        if not self.json_mode:
            print(f"SUCCESS: Searcher initialized with {self.index.ntotal} chunks")
    
    def _log(self, message: str):
        """Log message only if not in JSON mode."""
        if not self.json_mode:
            print(message)
    
    def _load_index(self):
        """Load FAISS index from file."""
        try:
            # Check if file exists
            if not os.path.exists(self.index_path):
                error_msg = f"FAISS index not found: {self.index_path}"
                if self.json_mode:
                    print(json.dumps({"error": error_msg, "current_dir": os.getcwd(), "files": os.listdir('.')}))
                else:
                    print(f"ERROR: {error_msg}")
                    print(f"Current working directory: {os.getcwd()}")
                    print(f"Files in directory: {os.listdir('.')}")
                sys.exit(1)
            
            self.index = faiss.read_index(self.index_path)
            self._log(f"SUCCESS: Loaded FAISS index: {self.index_path}")
            
        except Exception as e:
            error_msg = f"Loading FAISS index failed: {str(e)}"
            if self.json_mode:
                print(json.dumps({"error": error_msg}))
            else:
                print(f"ERROR: {error_msg}")
            sys.exit(1)
    
    def _load_metadata(self):
        """Load metadata mapping from pickle file."""
        try:
            if not os.path.exists(self.metadata_path):
                error_msg = f"Metadata file not found: {self.metadata_path}"
                if self.json_mode:
                    print(json.dumps({"error": error_msg, "current_dir": os.getcwd(), "files": os.listdir('.')}))
                else:
                    print(f"ERROR: {error_msg}")
                    print(f"Current working directory: {os.getcwd()}")
                    print(f"Files in directory: {os.listdir('.')}")
                sys.exit(1)
            
            with open(self.metadata_path, 'rb') as file:
                self.metadata = pickle.load(file)
            
            if not isinstance(self.metadata, list):
                error_msg = "Metadata must be a list"
                if self.json_mode:
                    print(json.dumps({"error": error_msg}))
                else:
                    print(f"ERROR: {error_msg}")
                sys.exit(1)
            
            self._log(f"SUCCESS: Loaded metadata: {len(self.metadata)} entries")
            
        except Exception as e:
            error_msg = f"Loading metadata failed: {str(e)}"
            if self.json_mode:
                print(json.dumps({"error": error_msg}))
            else:
                print(f"ERROR: {error_msg}")
            sys.exit(1)
    
    def _load_model(self):
        """Load sentence transformer model."""
        try:
            self._log(f"INFO: Loading model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            self._log(f"SUCCESS: Model loaded successfully")
            
        except Exception as e:
            error_msg = f"Loading model failed: {str(e)}"
            if self.json_mode:
                print(json.dumps({"error": error_msg, "hint": "Make sure you're using the same model used for indexing"}))
            else:
                print(f"ERROR: {error_msg}")
                print("HINT: Make sure you're using the same model used for indexing")
            sys.exit(1)
    
    def search(self, query: str, top_k: int = 5) -> List[Tuple[float, Dict[str, Any]]]:
        """
        Search for similar chunks using semantic similarity.
        
        Args:
            query: Search query string
            top_k: Number of top results to return
            
        Returns:
            List of (distance, metadata) tuples sorted by similarity
        """
        if not query.strip():
            raise ValueError("Query cannot be empty")
        
        if top_k <= 0:
            raise ValueError("top_k must be positive")
        
        # Limit top_k to available chunks
        top_k = min(top_k, len(self.metadata))
        
        try:
            # Encode the query
            query_embedding = self.model.encode([query.strip()])
            
            # Search FAISS index
            distances, indices = self.index.search(
                query_embedding.astype(np.float32), 
                top_k
            )
            
            # Prepare results
            results = []
            for distance, idx in zip(distances[0], indices[0]):
                if idx < len(self.metadata):  # Valid index
                    metadata = self.metadata[idx]
                    results.append((float(distance), metadata))
            
            return results
            
        except Exception as e:
            raise Exception(f"Search failed: {str(e)}")
    
    def format_results_json(
        self, 
        results: List[Tuple[float, Dict[str, Any]]], 
        query: str
    ) -> Dict[str, Any]:
        """
        Format search results as JSON for API responses.
        
        Args:
            results: List of (distance, metadata) tuples
            query: Original query string
            
        Returns:
            JSON-serializable dictionary
        """
        if not results:
            return {
                "query": query,
                "total_results": 0,
                "results": [],
                "message": "No relevant results found for your query."
            }
        
        formatted_results = []
        for rank, (distance, metadata) in enumerate(results, 1):
            result_item = {
                "rank": rank,
                "score": round(1 / (1 + distance), 4),  # Convert distance to similarity score
                "distance": round(distance, 4),
                "chunk_id": metadata.get('chunk_id', 'Unknown'),
                "content": metadata.get('text', 'No text available'),
                "word_count": metadata.get('word_count', 0)
            }
            formatted_results.append(result_item)
        
        return {
            "query": query,
            "total_results": len(results),
            "results": formatted_results
        }
    
    def format_results(
        self, 
        results: List[Tuple[float, Dict[str, Any]]], 
        query: str,
        show_distances: bool = False
    ) -> str:
        """
        Format search results for display (human-readable).
        
        Args:
            results: List of (distance, metadata) tuples
            query: Original query string
            show_distances: Whether to show distance scores
            
        Returns:
            Formatted results string
        """
        if not results:
            return "No results found."
        
        output = []
        output.append("=" * 60)
        output.append(f"QUERY: \"{query}\"")
        output.append(f"FOUND: {len(results)} relevant chunks")
        output.append("=" * 60)
        
        for rank, (distance, metadata) in enumerate(results, 1):
            output.append(f"\nRANK {rank}")
            
            # Show distance if requested
            if show_distances:
                output.append(f"DISTANCE: {distance:.4f}")
                output.append(f"SIMILARITY: {1/(1+distance):.4f}")
            
            # Show chunk ID and word count
            chunk_id = metadata.get('chunk_id', 'Unknown')
            word_count = metadata.get('word_count', 'Unknown')
            output.append(f"ID: {chunk_id} | WORDS: {word_count}")
            
            # Show chunk text with proper formatting
            text = metadata.get('text', 'No text available')
            # Truncate very long texts for readability
            if len(text) > 500:
                text = text[:500] + "..."
            
            output.append("TEXT:")
            output.append(f"   {text}")
            
            # Add separator between results
            if rank < len(results):
                output.append("-" * 40)
        
        return "\n".join(output)


def interactive_search(searcher: TextbookSearcher, default_top_k: int = 5):
    """Run interactive search mode."""
    print("\nINTERACTIVE: Textbook Search")
    print("=" * 40)
    print("Type your questions about machine learning!")
    print("Commands:")
    print("  - 'quit' or 'exit' to stop")
    print("  - 'help' for more options")
    print("=" * 40)
    
    while True:
        try:
            # Get user input
            query = input("\nQUESTION: ").strip()
            
            # Handle special commands
            if query.lower() in ['quit', 'exit', 'q']:
                print("GOODBYE!")
                break
            
            if query.lower() == 'help':
                print("\nHELP:")
                print("  - Ask questions about machine learning concepts")
                print("  - Examples: 'What is overfitting?', 'neural network types'")
                print("  - Type 'quit' to exit")
                continue
            
            if not query:
                print("WARNING: Please enter a question.")
                continue
            
            # Perform search
            print("SEARCHING...")
            results = searcher.search(query, default_top_k)
            
            # Display results
            formatted_results = searcher.format_results(results, query, show_distances=True)
            print(formatted_results)
            
        except KeyboardInterrupt:
            print("\nGOODBYE!")
            break
        except Exception as e:
            print(f"ERROR: {str(e)}")


def main():
    parser = argparse.ArgumentParser(
        description="Search textbook chunks using FAISS and semantic similarity",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python search_faiss.py
  python search_faiss.py --query "What is machine learning?"
  python search_faiss.py --query "neural networks" --top_k 3
  python search_faiss.py --interactive --top_k 10
  python search_faiss.py --query "test" --json
        """
    )
    
    parser.add_argument(
        '--query', '-q',
        help='Search query string'
    )
    
    parser.add_argument(
        '--top_k', '-k',
        type=int,
        default=5,
        help='Number of top results to return (default: 5)'
    )
    
    parser.add_argument(
        '--interactive', '-i',
        action='store_true',
        help='Run in interactive mode'
    )
    
    parser.add_argument(
        '--show_distances',
        action='store_true',
        help='Show distance scores in results'
    )
    
    parser.add_argument(
        '--json',
        action='store_true',
        help='Output results in JSON format'
    )
    
    parser.add_argument(
        '--index_path',
        default='intro_ml_index.faiss',
        help='Path to FAISS index file (default: intro_ml_index.faiss)'
    )
    
    parser.add_argument(
        '--metadata_path',
        default='intro_ml_metadata.pkl',
        help='Path to metadata pickle file (default: intro_ml_metadata.pkl)'
    )
    
    parser.add_argument(
        '--model',
        default='all-MiniLM-L6-v2',
        help='Sentence transformer model name (default: all-MiniLM-L6-v2)'
    )
    
    args = parser.parse_args()
    
    # Validate arguments
    if args.top_k <= 0:
        if args.json:
            print(json.dumps({"error": "top_k must be positive"}))
        else:
            parser.error("ERROR: top_k must be positive")
        return 1
    
    try:
        # Initialize searcher with JSON mode flag
        searcher = TextbookSearcher(
            index_path=args.index_path,
            metadata_path=args.metadata_path,
            model_name=args.model,
            json_mode=args.json  # Pass JSON mode to searcher
        )
        
        # Run appropriate mode
        if args.interactive:
            # Interactive mode (never JSON)
            interactive_search(searcher, args.top_k)
        
        elif args.query:
            # Single query mode
            if not args.json:
                print(f"INFO: Searching for: \"{args.query}\"")
            
            results = searcher.search(args.query, args.top_k)
            
            if args.json:
                # JSON output for API - ONLY output JSON
                json_results = searcher.format_results_json(results, args.query)
                print(json.dumps(json_results, indent=2, ensure_ascii=False))
            else:
                # Human-readable output
                formatted_results = searcher.format_results(
                    results, 
                    args.query, 
                    args.show_distances
                )
                print(formatted_results)
        
        else:
            # Default: prompt for single query
            if args.json:
                print(json.dumps({"error": "No query provided. Use --query parameter for JSON mode."}))
                return 1
            
            query = input("QUESTION: Enter your question about machine learning: ").strip()
            
            if not query:
                print("WARNING: No query provided. Exiting.")
                return 1
            
            print(f"INFO: Searching for: \"{query}\"")
            results = searcher.search(query, args.top_k)
            formatted_results = searcher.format_results(
                results, 
                query, 
                args.show_distances
            )
            print(formatted_results)
        
        return 0
    
    except Exception as e:
        if args.json:
            print(json.dumps({"error": str(e)}))
        else:
            print(f"ERROR: {str(e)}")
        return 1


if __name__ == "__main__":
    exit(main())