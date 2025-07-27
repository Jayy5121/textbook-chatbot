#!/usr/bin/env python3
"""
Multi-Textbook FAISS Search Script for Textbook Chatbot

This script loads FAISS indices for multiple textbooks and searches for the most 
relevant textbook chunks based on user queries using semantic similarity.

Usage:
    python search_faiss.py --textbook intro_ml
    python search_faiss.py --textbook deep_learning --query "What is backpropagation?"
    python search_faiss.py --textbook intro_ml --query "neural networks" --top_k 3
    python search_faiss.py --textbook intro_ml --interactive
    python search_faiss.py --list-textbooks
"""

import argparse
import pickle
import sys
import os
import json
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional

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


class MultiTextbookSearcher:
    """FAISS-based semantic search for multiple textbook collections."""
    
    def __init__(
        self, 
        textbook_id: str,
        model_name: str = "all-MiniLM-L6-v2",
        json_mode: bool = False,
        indices_dir: str = "indices"
    ):
        """
        Initialize the multi-textbook searcher.
        
        Args:
            textbook_id: ID of the textbook to search (e.g., 'intro_ml', 'deep_learning')
            model_name: Sentence transformer model name
            json_mode: If True, suppress all non-JSON output
            indices_dir: Directory containing FAISS indices and metadata
        """
        self.textbook_id = textbook_id
        self.model_name = model_name
        self.json_mode = json_mode
        self.indices_dir = Path(indices_dir)
        
        # File paths for this textbook
        self.index_path = self.indices_dir / f"{textbook_id}_index.faiss"
        self.metadata_path = self.indices_dir / f"{textbook_id}_metadata.pkl"
        self.config_path = self.indices_dir / f"{textbook_id}_config.json"
        
        self.index = None
        self.metadata = None
        self.config = None
        self.model = None
        
        # Load components
        self._load_config()
        self._load_index()
        self._load_metadata()
        self._load_model()
        
        if not self.json_mode:
            textbook_name = self.config.get('textbook_name', textbook_id)
            print(f"SUCCESS: Searcher initialized for '{textbook_name}' with {self.index.ntotal} chunks")
    
    def _log(self, message: str):
        """Log message only if not in JSON mode."""
        if not self.json_mode:
            print(message)
    
    def _load_config(self):
        """Load textbook configuration."""
        try:
            if not self.config_path.exists():
                error_msg = f"Config file not found: {self.config_path}"
                if self.json_mode:
                    print(json.dumps({"error": error_msg, "available_textbooks": self.list_available_textbooks()}))
                else:
                    print(f"ERROR: {error_msg}")
                    self._show_available_textbooks()
                sys.exit(1)
            
            with open(self.config_path, 'r', encoding='utf-8') as f:
                self.config = json.load(f)
            
            self._log(f"SUCCESS: Loaded config for {self.config.get('textbook_name', self.textbook_id)}")
            
        except Exception as e:
            error_msg = f"Loading config failed: {str(e)}"
            if self.json_mode:
                print(json.dumps({"error": error_msg}))
            else:
                print(f"ERROR: {error_msg}")
            sys.exit(1)
    
    def _load_index(self):
        """Load FAISS index from file."""
        try:
            if not self.index_path.exists():
                error_msg = f"FAISS index not found: {self.index_path}"
                if self.json_mode:
                    print(json.dumps({"error": error_msg, "available_textbooks": self.list_available_textbooks()}))
                else:
                    print(f"ERROR: {error_msg}")
                    self._show_available_textbooks()
                sys.exit(1)
            
            self.index = faiss.read_index(str(self.index_path))
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
            if not self.metadata_path.exists():
                error_msg = f"Metadata file not found: {self.metadata_path}"
                if self.json_mode:
                    print(json.dumps({"error": error_msg, "available_textbooks": self.list_available_textbooks()}))
                else:
                    print(f"ERROR: {error_msg}")
                    self._show_available_textbooks()
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
            # Check if config specifies a different model
            model_from_config = self.config.get('model_name', self.model_name)
            if model_from_config != self.model_name:
                self._log(f"INFO: Using model from config: {model_from_config}")
                self.model_name = model_from_config
            
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
    
    def list_available_textbooks(self) -> List[Dict[str, Any]]:
        """List all available textbooks with their metadata."""
        textbooks = []
        
        if not self.indices_dir.exists():
            return textbooks
        
        # Find all config files
        for config_file in self.indices_dir.glob("*_config.json"):
            try:
                textbook_id = config_file.stem.replace("_config", "")
                
                with open(config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                
                # Check if corresponding index and metadata files exist
                index_file = self.indices_dir / f"{textbook_id}_index.faiss"
                metadata_file = self.indices_dir / f"{textbook_id}_metadata.pkl"
                
                if index_file.exists() and metadata_file.exists():
                    textbooks.append({
                        "id": textbook_id,
                        "name": config.get('textbook_name', textbook_id),
                        "description": config.get('description', 'No description available'),
                        "chunks": config.get('total_chunks', 'Unknown'),
                        "created": config.get('created_at', 'Unknown')
                    })
            except Exception:
                continue  # Skip invalid config files
        
        return sorted(textbooks, key=lambda x: x['name'])
    
    def _show_available_textbooks(self):
        """Display available textbooks to the user."""
        textbooks = self.list_available_textbooks()
        
        if not textbooks:
            print("No textbooks found in the indices directory.")
            print(f"Make sure you have run the indexing script to create indices in: {self.indices_dir}")
            return
        
        print("\nAvailable textbooks:")
        print("=" * 50)
        for tb in textbooks:
            print(f"ID: {tb['id']}")
            print(f"Name: {tb['name']}")
            print(f"Chunks: {tb['chunks']}")
            print(f"Description: {tb['description']}")
            print("-" * 30)
    
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
                    metadata = self.metadata[idx].copy()
                    # Add textbook information to metadata
                    metadata['textbook_id'] = self.textbook_id
                    metadata['textbook_name'] = self.config.get('textbook_name', self.textbook_id)
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
                "textbook": {
                    "id": self.textbook_id,
                    "name": self.config.get('textbook_name', self.textbook_id)
                },
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
                "word_count": metadata.get('word_count', 0),
                "textbook_id": metadata.get('textbook_id', self.textbook_id),
                "textbook_name": metadata.get('textbook_name', self.textbook_id)
            }
            
            # Add chapter/section info if available
            if 'chapter' in metadata:
                result_item['chapter'] = metadata['chapter']
            if 'section' in metadata:
                result_item['section'] = metadata['section']
            
            formatted_results.append(result_item)
        
        return {
            "query": query,
            "textbook": {
                "id": self.textbook_id,
                "name": self.config.get('textbook_name', self.textbook_id)
            },
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
        
        textbook_name = self.config.get('textbook_name', self.textbook_id)
        
        output = []
        output.append("=" * 60)
        output.append(f"TEXTBOOK: {textbook_name}")
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
            
            # Show chapter/section if available
            chapter = metadata.get('chapter')
            section = metadata.get('section')
            if chapter or section:
                location = []
                if chapter:
                    location.append(f"Chapter: {chapter}")
                if section:
                    location.append(f"Section: {section}")
                output.append(f"LOCATION: {' | '.join(location)}")
            
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


def interactive_search(searcher: MultiTextbookSearcher, default_top_k: int = 5):
    """Run interactive search mode."""
    textbook_name = searcher.config.get('textbook_name', searcher.textbook_id)
    
    print(f"\nINTERACTIVE: {textbook_name} Search")
    print("=" * 50)
    print(f"Ask questions about '{textbook_name}'!")
    print("Commands:")
    print("  - 'quit' or 'exit' to stop")
    print("  - 'help' for more options")
    print("=" * 50)
    
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
                print(f"  - Ask questions about {textbook_name}")
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


def list_textbooks_command(indices_dir: str = "indices", json_output: bool = False):
    """List all available textbooks."""
    # Create a temporary searcher just to list textbooks
    searcher = MultiTextbookSearcher(
        textbook_id="dummy",
        json_mode=json_output,
        indices_dir=indices_dir
    )
    
    textbooks = searcher.list_available_textbooks()
    
    if json_output:
        print(json.dumps({"textbooks": textbooks}, indent=2))
    else:
        if not textbooks:
            print("No textbooks found.")
            print(f"Make sure you have run the indexing script to create indices in: {indices_dir}")
        else:
            print("Available textbooks:")
            print("=" * 50)
            for tb in textbooks:
                print(f"ID: {tb['id']}")
                print(f"Name: {tb['name']}")
                print(f"Chunks: {tb['chunks']}")
                print(f"Description: {tb['description']}")
                print(f"Created: {tb['created']}")
                print("-" * 30)


def main():
    parser = argparse.ArgumentParser(
        description="Search textbook chunks using FAISS and semantic similarity",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python search_faiss.py --list-textbooks
  python search_faiss.py --textbook intro_ml --query "What is machine learning?"
  python search_faiss.py --textbook deep_learning --query "backpropagation" --top_k 3
  python search_faiss.py --textbook intro_ml --interactive --top_k 10
  python search_faiss.py --textbook intro_ml --query "test" --json
        """
    )
    
    parser.add_argument(
        '--textbook', '-t',
        help='ID of the textbook to search (e.g., intro_ml, deep_learning)'
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
        '--list-textbooks',
        action='store_true',
        help='List all available textbooks'
    )
    
    parser.add_argument(
        '--indices_dir',
        default='indices',
        help='Directory containing FAISS indices and metadata (default: indices)'
    )
    
    parser.add_argument(
        '--model',
        default='all-MiniLM-L6-v2',
        help='Sentence transformer model name (default: all-MiniLM-L6-v2)'
    )
    
    args = parser.parse_args()
    
    # Handle list textbooks command
    if args.list_textbooks:
        list_textbooks_command(args.indices_dir, args.json)
        return 0
    
    # Validate textbook parameter
    if not args.textbook:
        if args.json:
            print(json.dumps({"error": "Textbook ID is required. Use --textbook parameter or --list-textbooks to see available options."}))
        else:
            parser.error("ERROR: Textbook ID is required. Use --textbook parameter or --list-textbooks to see available options.")
        return 1
    
    # Validate arguments
    if args.top_k <= 0:
        if args.json:
            print(json.dumps({"error": "top_k must be positive"}))
        else:
            parser.error("ERROR: top_k must be positive")
        return 1
    
    try:
        # Initialize searcher with JSON mode flag
        searcher = MultiTextbookSearcher(
            textbook_id=args.textbook,
            model_name=args.model,
            json_mode=args.json,
            indices_dir=args.indices_dir
        )
        
        # Run appropriate mode
        if args.interactive:
            # Interactive mode (never JSON)
            interactive_search(searcher, args.top_k)
        
        elif args.query:
            # Single query mode
            if not args.json:
                textbook_name = searcher.config.get('textbook_name', args.textbook)
                print(f"INFO: Searching '{textbook_name}' for: \"{args.query}\"")
            
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
            
            textbook_name = searcher.config.get('textbook_name', args.textbook)
            query = input(f"QUESTION: Enter your question about {textbook_name}: ").strip()
            
            if not query:
                print("WARNING: No query provided. Exiting.")
                return 1
            
            print(f"INFO: Searching '{textbook_name}' for: \"{query}\"")
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