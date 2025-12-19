import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'

/**
 * Normalize and clean text content
 */
function normalizeText(text: string): string {
  if (!text) return ''

  // Normalize unicode
  text = text.normalize('NFKC')

  // Remove excessive whitespace
  text = text.replace(/\s+/g, ' ')

  // Remove common page artifacts
  text = text.replace(/\n\s*\n\s*\n+/g, '\n\n') // Multiple newlines
  text = text.replace(/Page \d+/gi, '') // Page numbers
  text = text.replace(/\d+\s*\/\s*\d+/g, '') // Page numbers like "1 / 10"

  // Remove headers/footers (common patterns)
  text = text.replace(/^[A-Z\s]{3,50}$/gm, '') // All caps headers

  // Trim whitespace
  return text.trim()
}

/**
 * Estimate token count (rough approximation: ~4 chars per token)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Split text into chunks with overlap
 */
function chunkText(
  text: string,
  maxChunkSize: number = 1000,
  overlap: number = 200
): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    let end = start + maxChunkSize

    // Try to break at sentence boundary
    if (end < text.length) {
      const sentenceEnd = text.lastIndexOf('.', end)
      const paragraphEnd = text.lastIndexOf('\n\n', end)

      if (paragraphEnd > start + maxChunkSize * 0.5) {
        end = paragraphEnd
      } else if (sentenceEnd > start + maxChunkSize * 0.5) {
        end = sentenceEnd + 1
      }
    }

    const chunk = text.slice(start, end).trim()
    if (chunk.length > 0) {
      chunks.push(chunk)
    }

    // Move start position with overlap
    start = end - overlap
    if (start >= text.length) break
  }

  return chunks
}

/**
 * Extract text from PDF
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import for pdf-parse - handle ESM export
    const pdfParseModule = await import('pdf-parse')
    // pdf-parse exports as a function directly or as PDFParse
    let pdfParse: any
    
    // Check if module itself is a function
    if (typeof pdfParseModule === 'function') {
      pdfParse = pdfParseModule
    } 
    // Check for default export
    else if ((pdfParseModule as any).default && typeof (pdfParseModule as any).default === 'function') {
      pdfParse = (pdfParseModule as any).default
    }
    // Check for PDFParse (capitalized) named export
    else if ((pdfParseModule as any).PDFParse && typeof (pdfParseModule as any).PDFParse === 'function') {
      pdfParse = (pdfParseModule as any).PDFParse
    }
    // Try to find any function export
    else {
      const funcExport = Object.values(pdfParseModule).find((val: any) => typeof val === 'function')
      if (funcExport) {
        pdfParse = funcExport
      }
    }
    
    if (!pdfParse || typeof pdfParse !== 'function') {
      throw new Error(`pdf-parse module is not a function. Module keys: ${Object.keys(pdfParseModule).join(', ')}`)
    }
    
    const data = await pdfParse(buffer)
    return data.text || ''
  } catch (error) {
    throw new Error(`Failed to extract PDF text: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Extract text from DOCX
 */
async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer })
    return result.value || ''
  } catch (error) {
    throw new Error(`Failed to extract DOCX text: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Extract text from TXT
 */
function extractTxtText(buffer: Buffer): string {
  try {
    return buffer.toString('utf-8')
  } catch (error) {
    throw new Error(`Failed to extract TXT text: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Detect file type from filename
 */
function detectFileType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop() || ''
  if (ext === 'pdf') return 'pdf'
  if (ext === 'docx') return 'docx'
  if (ext === 'txt' || ext === 'text') return 'txt'
  throw new Error(`Unsupported file type: ${ext}`)
}

/**
 * Process document and return chunks
 * Exported for direct use in other routes
 */
export async function processDocument(
  fileContent: Buffer,
  filename: string
): Promise<{ success: boolean; chunks?: string[]; metadata?: any; error?: string; statusCode?: number }> {
  // Detect file type
  let fileType: string
  try {
    fileType = detectFileType(filename)
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      statusCode: 400,
    }
  }

  // Validate file size (10MB limit)
  if (fileContent.length > 10 * 1024 * 1024) {
    return {
      success: false,
      error: 'File size exceeds 10MB limit',
      statusCode: 400,
    }
  }

  // Extract text based on file type
  let rawText: string
  try {
    if (fileType === 'pdf') {
      rawText = await extractPdfText(fileContent)
    } else if (fileType === 'docx') {
      rawText = await extractDocxText(fileContent)
    } else if (fileType === 'txt') {
      rawText = extractTxtText(fileContent)
    } else {
      return {
        success: false,
        error: `Unsupported file type: ${fileType}`,
        statusCode: 400,
      }
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`,
      statusCode: 500,
    }
  }

  // Validate extracted text
  if (!rawText || rawText.trim().length < 10) {
    return {
      success: false,
      error: 'Document appears to be empty or contains no extractable text',
      statusCode: 400,
    }
  }

  // Clean text
  const cleanedText = normalizeText(rawText)

  if (!cleanedText || cleanedText.trim().length < 10) {
    return {
      success: false,
      error: 'Document contains no meaningful text after processing',
      statusCode: 400,
    }
  }

  // Split into chunks
  try {
    const chunks = chunkText(cleanedText, 1000, 200)
    const totalTokens = chunks.reduce((sum, chunk) => sum + estimateTokens(chunk), 0)

    return {
      success: true,
      chunks,
      metadata: {
        totalChunks: chunks.length,
        totalTokens,
        totalCharacters: cleanedText.length,
        filename,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to chunk document: ${error instanceof Error ? error.message : 'Unknown error'}`,
      statusCode: 500,
    }
  }
}

/**
 * POST /api/process-document
 * Process a document file and return chunks
 */
export async function POST(request: NextRequest) {
  try {
    // Get filename from query params or headers
    const { searchParams } = new URL(request.url)
    const filenameFromQuery = searchParams.get('filename')
    const filenameFromHeader = request.headers.get('x-filename')
    const filename = filenameFromQuery || filenameFromHeader || 'document.pdf'

    // Read request body as buffer
    const arrayBuffer = await request.arrayBuffer()
    const buffer = Buffer.from(new Uint8Array(arrayBuffer))

    if (!buffer || buffer.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No file content provided' },
        { status: 400 }
      )
    }

    // Process document
    const result = await processDocument(buffer, filename)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.statusCode || 500 }
      )
    }

    return NextResponse.json({
      success: true,
      chunks: result.chunks,
      metadata: result.metadata,
    })
  } catch (error) {
    console.error('Error in POST /api/process-document:', error)
    return NextResponse.json(
      {
        success: false,
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    )
  }
}

