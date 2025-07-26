#!/usr/bin/env python3
"""
Sliding Window Text Chunker for College Textbook Chatbot Project

This script performs sliding window chunking on cleaned textbook files,
generating overlapping chunks with detailed metadata for chatbot training.

Usage:
    python sliding_chunker.py --input textbook.txt --output chunks.json --window_size 3
"""

import argparse
import json
import os
import re
from pathlib import Path
from typing import List, Dict, Any

try:
    import nltk
    from nltk.tokenize import sent_tokenize
except ImportError:
    print("Error: NLTK is required. Install it with: pip install nltk")
    exit(1)


def ensure_nltk_data():
    """Download required NLTK data if not already present."""
    try:
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        print("Downloading NLTK punkt tokenizer...")
        nltk.download('punkt', quiet=True)


def clean_sentence(sentence: str) -> str:
    """Clean and normalize a sentence."""
    # Remove extra whitespace and normalize
    sentence = re.sub(r'\s+', ' ', sentence.strip())
    return sentence


def load_text_file(file_path: str) -> str:
    """Load text file with proper UTF-8 encoding."""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
        
        if not content.strip():
            raise ValueError(f"File {file_path} is empty or contains only whitespace")
        
        print(f"Successfully loaded {file_path} ({len(content):,} characters)")
        return content
    
    except UnicodeDecodeError:
        print(f"Warning: UTF-8 decode failed, trying with 'latin-1' encoding...")
        with open(file_path, 'r', encoding='latin-1') as file:
            content = file.read()
        print(f"Successfully loaded {file_path} with latin-1 encoding")
        return content
    
    except FileNotFoundError:
        raise FileNotFoundError(f"Input file not found: {file_path}")
    except Exception as e:
        raise Exception(f"Error loading file {file_path}: {str(e)}")


def tokenize_sentences(text: str) -> List[str]:
    """Tokenize text into sentences using NLTK."""
    print("Tokenizing text into sentences...")
    
    # Use NLTK sentence tokenizer
    sentences = sent_tokenize(text)
    
    # Clean and filter sentences
    cleaned_sentences = []
    for sentence in sentences:
        cleaned = clean_sentence(sentence)
        # Skip empty sentences or sentences that are too short
        if cleaned and len(cleaned.strip()) > 10:
            cleaned_sentences.append(cleaned)
    
    print(f"Found {len(cleaned_sentences)} valid sentences")
    return cleaned_sentences


def create_sliding_window_chunks(
    sentences: List[str], 
    window_size: int, 
    step_size: int = 1,
    source_file: str = ""
) -> List[Dict[str, Any]]:
    """
    Create sliding window chunks from sentences.
    
    Args:
        sentences: List of sentences
        window_size: Number of sentences per chunk
        step_size: Step size for sliding window (default: 1)
        source_file: Name of source file
    
    Returns:
        List of chunk dictionaries with metadata
    """
    if window_size <= 0:
        raise ValueError("Window size must be positive")
    
    if len(sentences) < window_size:
        print(f"Warning: Only {len(sentences)} sentences available, but window size is {window_size}")
        print("Creating a single chunk with all available sentences")
        window_size = len(sentences)
    
    chunks = []
    chunk_index = 0
    
    print(f"Creating sliding window chunks (window_size={window_size}, step_size={step_size})...")
    
    # Generate sliding windows
    for i in range(0, len(sentences) - window_size + 1, step_size):
        # Get sentences for this window
        window_sentences = sentences[i:i + window_size]
        
        # Combine sentences into chunk text
        chunk_text = ' '.join(window_sentences)
        
        # Skip empty chunks (shouldn't happen with our filtering, but safety check)
        if not chunk_text.strip():
            continue
        
        # Calculate metrics
        word_count = len(chunk_text.split())
        char_count = len(chunk_text)
        
        # Create chunk metadata
        chunk = {
            "id": f"chunk_{chunk_index:04d}",
            "index": chunk_index,
            "text": chunk_text,
            "start_sentence_idx": i,
            "end_sentence_idx": i + window_size - 1,
            "sentence_count": window_size,
            "word_count": word_count,
            "char_count": char_count,
            "source_file": source_file,
            "method": "sliding_window"
        }
        
        chunks.append(chunk)
        chunk_index += 1
    
    print(f"Created {len(chunks)} chunks")
    return chunks


def save_chunks_json(chunks: List[Dict[str, Any]], output_path: str):
    """Save chunks to JSON file with proper formatting."""
    print(f"Saving {len(chunks)} chunks to {output_path}...")
    
    try:
        with open(output_path, 'w', encoding='utf-8') as file:
            json.dump(chunks, file, indent=2, ensure_ascii=False)
        
        print(f"Successfully saved chunks to {output_path}")
        
        # Print summary statistics
        if chunks:
            total_chars = sum(chunk['char_count'] for chunk in chunks)
            total_words = sum(chunk['word_count'] for chunk in chunks)
            avg_chars = total_chars / len(chunks)
            avg_words = total_words / len(chunks)
            
            print(f"\nChunk Statistics:")
            print(f"  Total chunks: {len(chunks)}")
            print(f"  Average characters per chunk: {avg_chars:.1f}")
            print(f"  Average words per chunk: {avg_words:.1f}")
            print(f"  Total characters: {total_chars:,}")
            print(f"  Total words: {total_words:,}")
    
    except Exception as e:
        raise Exception(f"Error saving chunks to {output_path}: {str(e)}")


def generate_output_filename(input_path: str, output_path: str = None) -> str:
    """Generate output filename if not provided."""
    if output_path:
        return output_path
    
    # Extract base name and add suffix
    input_path_obj = Path(input_path)
    base_name = input_path_obj.stem
    output_name = f"{base_name}_chunks_sliding.json"
    
    return str(input_path_obj.parent / output_name)


def main():
    parser = argparse.ArgumentParser(
        description="Perform sliding window chunking on textbook files for chatbot training",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python sliding_chunker.py --input textbook.txt
  python sliding_chunker.py --input textbook.txt --window_size 5
  python sliding_chunker.py --input textbook.txt --output chunks.json --window_size 3
        """
    )
    
    parser.add_argument(
        '--input', '-i',
        required=True,
        help='Input text file path (e.g., Intro_to_ml_cleaned.txt)'
    )
    
    parser.add_argument(
        '--output', '-o',
        help='Output JSON file path (default: auto-generated from input filename)'
    )
    
    parser.add_argument(
        '--window_size', '-w',
        type=int,
        default=3,
        help='Number of sentences per chunk (default: 3)'
    )
    
    parser.add_argument(
        '--step_size', '-s',
        type=int,
        default=1,
        help='Step size for sliding window (default: 1)'
    )
    
    args = parser.parse_args()
    
    # Validate arguments
    if args.window_size <= 0:
        parser.error("Window size must be positive")
    
    if args.step_size <= 0:
        parser.error("Step size must be positive")
    
    # Ensure NLTK data is available
    ensure_nltk_data()
    
    try:
        # Load input file
        print(f"Processing: {args.input}")
        text_content = load_text_file(args.input)
        
        # Tokenize into sentences
        sentences = tokenize_sentences(text_content)
        
        if not sentences:
            print("Error: No valid sentences found in the input file")
            return 1
        
        # Create sliding window chunks
        source_filename = os.path.basename(args.input)
        chunks = create_sliding_window_chunks(
            sentences=sentences,
            window_size=args.window_size,
            step_size=args.step_size,
            source_file=source_filename
        )
        
        if not chunks:
            print("Error: No chunks were created")
            return 1
        
        # Generate output filename if not provided
        output_path = generate_output_filename(args.input, args.output)
        
        # Save chunks to JSON
        save_chunks_json(chunks, output_path)
        
        print(f"\n Successfully processed {args.input}")
        print(f" Output saved to: {output_path}")
        
        return 0
    
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return 1


if __name__ == "__main__":
    exit(main())