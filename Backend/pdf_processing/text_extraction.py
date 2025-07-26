import PyPDF2
import fitz  # PyMuPDF - better for complex PDFs
import re
import os
from pathlib import Path
import argparse

class PDFTextExtractor:
    def __init__(self):
        self.extracted_text = ""
    
    def extract_with_pypdf2(self, pdf_path):
        """Extract text using PyPDF2 - good for simple PDFs"""
        try:
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                
                for page_num in range(len(pdf_reader.pages)):
                    page = pdf_reader.pages[page_num]
                    text += page.extract_text() + "\n"
                
                return text
        except Exception as e:
            print(f"PyPDF2 extraction failed: {e}")
            return None
    
    def extract_with_pymupdf(self, pdf_path):
        """Extract text using PyMuPDF - better for complex layouts"""
        try:
            doc = fitz.open(pdf_path)
            text = ""
            
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                text += page.get_text() + "\n"
            
            doc.close()
            return text
        except Exception as e:
            print(f"PyMuPDF extraction failed: {e}")
            return None
    
    def clean_text(self, raw_text):
        """Clean and normalize the extracted text"""
        if not raw_text:
            return ""
        
        # Remove excessive whitespace and normalize line breaks
        text = re.sub(r'\n\s*\n', '\n\n', raw_text)  # Replace multiple newlines with double newline
        text = re.sub(r'[ \t]+', ' ', text)  # Replace multiple spaces/tabs with single space
        
        # Remove page numbers (common patterns)
        text = re.sub(r'^\s*\d+\s*$', '', text, flags=re.MULTILINE)
        text = re.sub(r'Page\s+\d+', '', text, flags=re.IGNORECASE)
        
        # Remove headers/footers (lines with very few words at start/end of pages)
        lines = text.split('\n')
        cleaned_lines = []
        
        for i, line in enumerate(lines):
            line = line.strip()
            
            # Skip empty lines
            if not line:
                continue
            
            # Skip lines that are likely headers/footers (very short, all caps, etc.)
            words = line.split()
            if len(words) <= 3 and (line.isupper() or any(char.isdigit() for char in line)):
                continue
            
            # Skip lines that are mostly special characters
            if len(re.sub(r'[^a-zA-Z0-9\s]', '', line)) < len(line) * 0.7:
                if len(words) <= 5:  # Only skip if it's also short
                    continue
            
            cleaned_lines.append(line)
        
        # Join lines back
        text = '\n'.join(cleaned_lines)
        
        # Fix common OCR/extraction issues
        text = self.fix_word_overlapping(text)
        text = self.fix_spacing_issues(text)
        text = self.remove_repeated_content(text)
        
        # Final cleanup
        text = re.sub(r'\n{3,}', '\n\n', text)  # Max 2 consecutive newlines
        text = text.strip()
        
        return text
    
    def fix_word_overlapping(self, text):
        """Fix overlapping words and broken words"""
        # Fix words split across lines (hyphenation)
        text = re.sub(r'-\s*\n\s*', '', text)
        
        # Fix words that got merged (common pattern: lowercase+uppercase)
        text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)
        
        # Fix numbers merged with words
        text = re.sub(r'([a-zA-Z])(\d)', r'\1 \2', text)
        text = re.sub(r'(\d)([a-zA-Z])', r'\1 \2', text)
        
        return text
    
    def fix_spacing_issues(self, text):
        """Fix spacing issues in text"""
        # Remove spaces before punctuation
        text = re.sub(r'\s+([.,:;!?])', r'\1', text)
        
        # Add space after punctuation if missing
        text = re.sub(r'([.!?])([A-Z])', r'\1 \2', text)
        
        # Fix missing spaces after periods
        text = re.sub(r'\.([a-zA-Z])', r'. \1', text)
        
        return text
    
    def remove_repeated_content(self, text):
        """Remove obviously repeated content (like repeated headers)"""
        lines = text.split('\n')
        seen_lines = set()
        unique_lines = []
        
        for line in lines:
            line = line.strip()
            if not line:
                unique_lines.append(line)
                continue
            
            # For short lines (likely headers), check for duplicates
            if len(line.split()) <= 10:
                if line.lower() in seen_lines:
                    continue
                seen_lines.add(line.lower())
            
            unique_lines.append(line)
        
        return '\n'.join(unique_lines)
    
    def extract_and_clean(self, pdf_path, output_path=None, method='both'):
        """Main method to extract and clean text from PDF"""
        print(f"Processing: {pdf_path}")
        
        # Try different extraction methods
        raw_text = None
        
        if method in ['both', 'pymupdf']:
            print("Trying PyMuPDF extraction...")
            raw_text = self.extract_with_pymupdf(pdf_path)
        
        if not raw_text and method in ['both', 'pypdf2']:
            print("Trying PyPDF2 extraction...")
            raw_text = self.extract_with_pypdf2(pdf_path)
        
        if not raw_text:
            raise Exception("Failed to extract text with both methods")
        
        print(f"Extracted {len(raw_text)} characters of raw text")
        
        # Clean the text
        print("Cleaning text...")
        cleaned_text = self.clean_text(raw_text)
        
        print(f"Cleaned text length: {len(cleaned_text)} characters")
        
        # Save to file
        if output_path:
            self.save_text(cleaned_text, output_path)
        
        self.extracted_text = cleaned_text
        return cleaned_text
    
    def save_text(self, text, output_path):
        """Save cleaned text to file"""
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(text)
            print(f"Text saved to: {output_path}")
        except Exception as e:
            print(f"Error saving file: {e}")
    
    def get_text_stats(self):
        """Get statistics about the extracted text"""
        if not self.extracted_text:
            return None
        
        text = self.extracted_text
        words = text.split()
        sentences = re.split(r'[.!?]+', text)
        paragraphs = text.split('\n\n')
        
        return {
            'characters': len(text),
            'words': len(words),
            'sentences': len([s for s in sentences if s.strip()]),
            'paragraphs': len([p for p in paragraphs if p.strip()]),
            'avg_words_per_sentence': len(words) / max(1, len([s for s in sentences if s.strip()]))
        }

def main():
    parser = argparse.ArgumentParser(description='Extract and clean text from PDF textbooks')
    parser.add_argument('pdf_path', help='Path to the PDF file')
    parser.add_argument('-o', '--output', help='Output text file path')
    parser.add_argument('-m', '--method', choices=['pypdf2', 'pymupdf', 'both'], 
                       default='both', help='Extraction method to use')
    
    args = parser.parse_args()
    
    # Create output path if not provided
    if not args.output:
        pdf_name = Path(args.pdf_path).stem
        args.output = f"{pdf_name}_cleaned.txt"
    
    # Extract and clean text
    extractor = PDFTextExtractor()
    try:
        cleaned_text = extractor.extract_and_clean(args.pdf_path, args.output, args.method)
        
        # Print statistics
        stats = extractor.get_text_stats()
        if stats:
            print("\n--- Text Statistics ---")
            print(f"Characters: {stats['characters']:,}")
            print(f"Words: {stats['words']:,}")
            print(f"Sentences: {stats['sentences']:,}")
            print(f"Paragraphs: {stats['paragraphs']:,}")
            print(f"Avg words per sentence: {stats['avg_words_per_sentence']:.1f}")
        
        print(f"\n Successfully processed PDF and saved cleaned text to: {args.output}")
        
    except Exception as e:
        print(f" Error processing PDF: {e}")

if __name__ == "__main__":
    main()