"""
Vercel Serverless Function for Document Processing
Handles PDF, TXT, and DOCX file extraction and chunking
"""

import json
import re
import unicodedata
from io import BytesIO
from typing import List, Dict, Any

try:
    import PyPDF2
except ImportError:
    PyPDF2 = None

try:
    from docx import Document as DocxDocument
except ImportError:
    DocxDocument = None


def normalize_text(text: str) -> str:
    """Clean and normalize text content"""
    if not text:
        return ""
    
    # Normalize unicode
    text = unicodedata.normalize('NFKC', text)
    
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    
    # Remove common page artifacts
    text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)  # Multiple newlines
    text = re.sub(r'Page \d+', '', text, flags=re.IGNORECASE)  # Page numbers
    text = re.sub(r'\d+\s*/\s*\d+', '', text)  # Page numbers like "1 / 10"
    
    # Remove headers/footers (common patterns)
    text = re.sub(r'^[A-Z\s]{3,50}$', '', text, flags=re.MULTILINE)  # All caps headers
    
    # Trim whitespace
    text = text.strip()
    
    return text


def estimate_tokens(text: str) -> int:
    """Estimate token count (rough approximation: ~4 chars per token)"""
    return len(text) // 4


def smart_chunk(text: str, chunk_size: int = 1000, overlap: int = 100) -> List[str]:
    """
    Split text into chunks using sentence boundaries
    
    Args:
        text: Input text to chunk
        chunk_size: Target tokens per chunk
        overlap: Overlap tokens between chunks
    
    Returns:
        List of text chunks
    """
    if not text:
        return []
    
    # Split into sentences (handle common sentence endings)
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    # Filter out very short sentences (likely artifacts)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
    
    if not sentences:
        # Fallback: split by paragraphs if no sentences found
        paragraphs = text.split('\n\n')
        sentences = [p.strip() for p in paragraphs if p.strip()]
    
    chunks = []
    current_chunk = []
    current_tokens = 0
    
    for sentence in sentences:
        sentence_tokens = estimate_tokens(sentence)
        
        # If adding this sentence would exceed chunk size, finalize current chunk
        if current_tokens + sentence_tokens > chunk_size and current_chunk:
            chunk_text = ' '.join(current_chunk)
            chunks.append(chunk_text)
            
            # Start new chunk with overlap (last few sentences)
            overlap_sentences = []
            overlap_tokens = 0
            for s in reversed(current_chunk):
                s_tokens = estimate_tokens(s)
                if overlap_tokens + s_tokens <= overlap:
                    overlap_sentences.insert(0, s)
                    overlap_tokens += s_tokens
                else:
                    break
            
            current_chunk = overlap_sentences
            current_tokens = overlap_tokens
        
        current_chunk.append(sentence)
        current_tokens += sentence_tokens
    
    # Add final chunk
    if current_chunk:
        chunk_text = ' '.join(current_chunk)
        chunks.append(chunk_text)
    
    return chunks


def extract_pdf_text(file_content: bytes) -> str:
    """Extract text from PDF file"""
    if PyPDF2 is None:
        raise ImportError("PyPDF2 is not installed")
    
    try:
        pdf_file = BytesIO(file_content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        text_parts = []
        for page in pdf_reader.pages:
            try:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
            except Exception as e:
                # Skip pages that can't be read
                print(f"Warning: Could not extract text from page: {e}")
                continue
        
        return '\n\n'.join(text_parts)
    except Exception as e:
        raise ValueError(f"Failed to extract PDF text: {str(e)}")


def extract_docx_text(file_content: bytes) -> str:
    """Extract text from DOCX file"""
    if DocxDocument is None:
        raise ImportError("python-docx is not installed")
    
    try:
        docx_file = BytesIO(file_content)
        doc = DocxDocument(docx_file)
        
        text_parts = []
        for paragraph in doc.paragraphs:
            if paragraph.text.strip():
                text_parts.append(paragraph.text)
        
        return '\n\n'.join(text_parts)
    except Exception as e:
        raise ValueError(f"Failed to extract DOCX text: {str(e)}")


def extract_txt_text(file_content: bytes) -> str:
    """Extract text from TXT file"""
    try:
        # Try UTF-8 first
        try:
            return file_content.decode('utf-8')
        except UnicodeDecodeError:
            # Fallback to latin-1
            return file_content.decode('latin-1', errors='ignore')
    except Exception as e:
        raise ValueError(f"Failed to extract TXT text: {str(e)}")


def detect_file_type(filename: str) -> str:
    """Detect file type from filename"""
    filename_lower = filename.lower()
    
    if filename_lower.endswith('.pdf'):
        return 'pdf'
    elif filename_lower.endswith('.docx'):
        return 'docx'
    elif filename_lower.endswith('.doc'):
        return 'docx'  # Treat .doc as .docx (may need different handling)
    elif filename_lower.endswith('.txt'):
        return 'txt'
    else:
        raise ValueError(f"Unsupported file type: {filename}")


def process_document(file_content: bytes, filename: str) -> Dict[str, Any]:
    """
    Main processing function
    
    Args:
        file_content: Binary file content
        filename: Original filename
    
    Returns:
        Dictionary with chunks and metadata
    """
    # Detect file type
    try:
        file_type = detect_file_type(filename)
    except ValueError as e:
        return {
            "success": False,
            "error": str(e),
            "statusCode": 400
        }
    
    # Validate file size (10MB limit)
    if len(file_content) > 10 * 1024 * 1024:
        return {
            "success": False,
            "error": "File size exceeds 10MB limit",
            "statusCode": 400
        }
    
    # Extract text based on file type
    try:
        if file_type == 'pdf':
            raw_text = extract_pdf_text(file_content)
        elif file_type == 'docx':
            raw_text = extract_docx_text(file_content)
        elif file_type == 'txt':
            raw_text = extract_txt_text(file_content)
        else:
            return {
                "success": False,
                "error": f"Unsupported file type: {file_type}",
                "statusCode": 400
            }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to extract text: {str(e)}",
            "statusCode": 500
        }
    
    # Validate extracted text
    if not raw_text or len(raw_text.strip()) < 10:
        return {
            "success": False,
            "error": "Document appears to be empty or contains no extractable text",
            "statusCode": 400
        }
    
    # Clean text
    cleaned_text = normalize_text(raw_text)
    
    if not cleaned_text or len(cleaned_text.strip()) < 10:
        return {
            "success": False,
            "error": "Document contains no meaningful text after processing",
            "statusCode": 400
        }
    
    # Split into chunks
    try:
        chunks = smart_chunk(cleaned_text, chunk_size=1000, overlap=100)
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to chunk text: {str(e)}",
            "statusCode": 500
        }
    
    if not chunks:
        return {
            "success": False,
            "error": "Failed to create chunks from document",
            "statusCode": 500
        }
    
    # Return success response
    return {
        "success": True,
        "chunks": chunks,
        "metadata": {
            "total_chunks": len(chunks),
            "original_length": len(raw_text),
            "cleaned_length": len(cleaned_text),
            "file_type": file_type,
            "filename": filename
        }
    }


def handler(request):
    """
    Vercel serverless function handler
    
    Expected request format:
    - Method: POST
    - Content-Type: multipart/form-data or application/octet-stream
    - Body: file binary data
    """
    try:
        # Get request method
        method = request.get('httpMethod') or request.get('method', 'GET')
        
        if method != 'POST':
            return {
                "statusCode": 405,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({
                    "success": False,
                    "error": "Method not allowed. Use POST."
                })
            }
        
        # Get file from request
        body = request.get('body', '')
        headers = request.get('headers', {}) or {}
        
        # Handle base64 encoded body (Vercel may encode binary data)
        file_content = None
        if isinstance(body, str):
            import base64
            try:
                # Try base64 decode first
                file_content = base64.b64decode(body)
            except:
                # Fallback to UTF-8 encoding
                file_content = body.encode('utf-8')
        elif isinstance(body, bytes):
            file_content = body
        else:
            file_content = bytes(body) if body else b''
        
        # Get filename from headers or query params
        filename = (
            headers.get('x-filename') or 
            headers.get('filename') or
            request.get('queryStringParameters', {}).get('filename') or
            'document.pdf'
        )
        
        # Try to detect file type from content-type header
        content_type = headers.get('content-type', '').lower()
        if not filename or filename == 'document.pdf':
            if 'pdf' in content_type:
                filename = 'document.pdf'
            elif 'docx' in content_type or 'word' in content_type:
                filename = 'document.docx'
            elif 'text' in content_type or 'plain' in content_type:
                filename = 'document.txt'
        
        if not file_content or len(file_content) == 0:
            return {
                "statusCode": 400,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({
                    "success": False,
                    "error": "No file content provided"
                })
            }
        
        # Process document
        result = process_document(file_content, filename)
        
        # Handle errors
        if not result.get("success"):
            status_code = result.get("statusCode", 500)
            return {
                "statusCode": status_code,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps(result)
            }
        
        # Return success
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps(result)
        }
        
    except Exception as e:
        # Handle unexpected errors
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error in handler: {error_trace}")
        
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({
                "success": False,
                "error": f"Internal server error: {str(e)}"
            })
        }


# Vercel serverless function entry point
# Vercel expects a function that takes (request) and returns a response dict
def vercel_handler(request):
    """Entry point for Vercel serverless function"""
    return handler(request)

