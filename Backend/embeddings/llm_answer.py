#!/usr/bin/env python3
"""
LLM Answer Generation Script
Usage: python llm_answer.py "user query" "chunk1" "chunk2" "chunk3" "chunk4" "chunk5"
"""

import sys
import json
import requests
from typing import List

import os
from dotenv import load_dotenv
load_dotenv()  # Load environment variables from .env
# API KEYS - Get from environment variables or use defaults
TOGETHER_API_KEY = os.getenv('TOGETHER_API_KEY')
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')

from dotenv import load_dotenv
load_dotenv()  # Load environment variables from .env
def call_together_ai(chunks: List[str], user_query: str) -> str:
    """Call Together.ai API for answer generation"""
    try:
        excerpts = '\n\n'.join([f"{i+1}. \"{chunk}\"" for i, chunk in enumerate(chunks)])

        prompt = f"""Based ONLY on the following textbook excerpts, answer the user's question in a clear, comprehensive way. Provide detailed explanations and examples when relevant. Do not add any external information.

Textbook Excerpts:
{excerpts}

Question: {user_query}

Please provide a thorough answer based solely on the information provided above."""

        headers = {
            'Authorization': f'Bearer {TOGETHER_API_KEY}',
            'Content-Type': 'application/json'
        }

        payload = {
            'model': 'mistralai/Mistral-7B-Instruct-v0.1',
            'messages': [
                {'role': 'user', 'content': prompt}
            ],
            'max_tokens': 800,
            'temperature': 0.3,
            'top_p': 0.9
        }

        response = requests.post(
            'https://api.together.xyz/v1/chat/completions',
            headers=headers,
            json=payload,
            timeout=60
        )
        response.raise_for_status()
        data = response.json()
        return data['choices'][0]['message']['content'].strip()
    
    except Exception as e:
        raise Exception(f"Together.ai API error: {str(e)}")


def call_openrouter(chunks: List[str], user_query: str) -> str:
    """Call OpenRouter API for answer generation"""
    try:
        excerpts = '\n\n'.join([f"{i+1}. \"{chunk}\"" for i, chunk in enumerate(chunks)])

        prompt = f"""You are an expert tutor helping students understand concepts directly from their textbooks.

Instructions: Based only on the following textbook excerpts, answer the user's question in a clear, structured, and detailed manner.

Do not use any external knowledge or assumptions.

Ensure the explanation is accurate and easy to understand for a college student.

Use examples, analogies, or subheadings where appropriate to improve clarity.

If the answer is not present in the excerpts, respond with: “The provided excerpts do not contain enough information to answer this question.”

Textbook Excerpts:
{excerpts}

User Question:
{user_query}

Answer:"""

        headers = {
            'Authorization': f'Bearer {OPENROUTER_API_KEY}',
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Textbook Search Assistant'
        }

        payload = {
            'model': 'mistralai/mistral-7b-instruct',
            'messages': [
                {'role': 'user', 'content': prompt}
            ],
            'max_tokens': 800,
            'temperature': 0.3,
            'top_p': 0.9
        }

        response = requests.post(
            'https://openrouter.ai/api/v1/chat/completions',
            headers=headers,
            json=payload,
            timeout=60
        )
        response.raise_for_status()
        data = response.json()
        return data['choices'][0]['message']['content'].strip()
    
    except Exception as e:
        raise Exception(f"OpenRouter API error: {str(e)}")


def main():
    try:
        if len(sys.argv) < 3:
            result = {
                "error": "Insufficient arguments",
                "message": "Usage: python llm_answer.py 'user_query' 'chunk1' 'chunk2' ...",
                "received_args": len(sys.argv) - 1
            }
            print(json.dumps(result))
            sys.exit(1)

        user_query = sys.argv[1].strip()
        chunks = [chunk.strip() for chunk in sys.argv[2:] if chunk.strip()]

        if not user_query:
            result = {"error": "Empty query provided"}
            print(json.dumps(result))
            sys.exit(1)

        if not chunks:
            result = {"error": "No valid content chunks provided"}
            print(json.dumps(result))
            sys.exit(1)

        answer = None
        api_used = None
        error_details = []

        # Try Together.ai first
        try:
            answer = call_together_ai(chunks, user_query)
            api_used = 'together.ai'
        except Exception as e:
            error_details.append(f"Together.ai failed: {str(e)}")

        # If Together.ai fails, try OpenRouter
        if not answer:
            try:
                answer = call_openrouter(chunks, user_query)
                api_used = 'openrouter'
            except Exception as e:
                error_details.append(f"OpenRouter failed: {str(e)}")

        if not answer:
            result = {
                "error": "All LLM APIs failed",
                "details": error_details,
                "query": user_query,
                "chunks_provided": len(chunks)
            }
            print(json.dumps(result))
            sys.exit(1)

        # Success response
        result = {
            "answer": answer,
            "api_used": api_used,
            "model_used": "mistralai/mistral-7b-instruct" if api_used == 'openrouter' else "mistralai/Mistral-7B-Instruct-v0.1",
            "chunks_processed": len(chunks),
            "query": user_query,
            "status": "success"
        }

        print(json.dumps(result))

    except Exception as e:
        result = {
            "error": "Script execution error",
            "message": str(e),
            "query": sys.argv[1] if len(sys.argv) > 1 else "unknown"
        }
        print(json.dumps(result))
        sys.exit(1)


if __name__ == "__main__":
    main()