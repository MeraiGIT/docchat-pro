import { createServerSupabase, type DocumentChunk } from './supabase'
import { generateEmbedding } from './openai'

/**
 * Find relevant chunks using vector similarity search
 * @param queryEmbedding - Embedding vector for the query
 * @param documentId - Document ID to search within
 * @param limit - Maximum number of chunks to return (default: 5)
 * @returns Array of relevant chunks with similarity scores
 */
export async function findRelevantChunks(
  queryEmbedding: number[],
  documentId: string,
  limit: number = 5
): Promise<Array<DocumentChunk & { similarity?: number }>> {
  try {
    const supabase = await createServerSupabase()

    // Try pgvector similarity search first
    // Note: This requires pgvector extension and match_document_chunks function in Supabase
    try {
      const { data, error } = await supabase.rpc('match_document_chunks', {
        query_embedding: queryEmbedding,
        match_document_id: documentId,
        match_threshold: 0.7,
        match_count: limit,
      })

      if (!error && data) {
        return data
      }
    } catch (rpcError) {
      console.warn('Vector search not available, using fallback:', rpcError)
    }

    // Fallback: Calculate cosine similarity manually or return first chunks
    // For now, return first chunks (can be improved with manual similarity calculation)
    const { data: allChunks, error: fetchError } = await supabase
      .from('document_chunks')
      .select('*')
      .eq('document_id', documentId)
      .order('chunk_index', { ascending: true })
      .limit(limit * 2) // Get more chunks to potentially filter

    if (fetchError || !allChunks || allChunks.length === 0) {
      return []
    }

    // Simple similarity calculation (cosine similarity)
    // This is a basic implementation - for production, use pgvector
    const chunksWithSimilarity = allChunks.map((chunk) => {
      if (!chunk.embedding || chunk.embedding.length === 0) {
        return { ...chunk, similarity: 0 }
      }

      // Calculate cosine similarity
      const dotProduct = queryEmbedding.reduce(
        (sum: number, val: number, i: number) => sum + val * (chunk.embedding[i] || 0),
        0
      )
      const queryMagnitude = Math.sqrt(
        queryEmbedding.reduce((sum: number, val: number) => sum + val * val, 0)
      )
      const chunkMagnitude = Math.sqrt(
        chunk.embedding.reduce((sum: number, val: number) => sum + val * val, 0)
      )
      const similarity = dotProduct / (queryMagnitude * chunkMagnitude)

      return { ...chunk, similarity: isNaN(similarity) ? 0 : similarity }
    })

    // Sort by similarity and return top chunks
    return chunksWithSimilarity
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, limit)
  } catch (error) {
    console.error('Error in findRelevantChunks:', error)
    return []
  }
}

/**
 * Build context string from chunks for prompt
 * @param chunks - Array of document chunks
 * @returns Formatted context string
 */
export function buildContext(chunks: Array<DocumentChunk & { similarity?: number }>): string {
  if (!chunks || chunks.length === 0) {
    return 'No relevant context found.'
  }

  return chunks
    .map((chunk, index) => {
      const similarity = chunk.similarity ? ` (similarity: ${(chunk.similarity * 100).toFixed(1)}%)` : ''
      return `[Chunk ${chunk.chunk_index + 1}${similarity}]\n${chunk.content}`
    })
    .join('\n\n---\n\n')
}

/**
 * Generate system prompt for RAG chat
 * @param documentName - Name of the document
 * @returns System prompt string
 */
export function generateSystemPrompt(documentName: string): string {
  return `You are a helpful AI assistant that answers questions based on the provided document context.

Document: ${documentName}

Instructions:
- Only use information from the provided context to answer questions
- If the answer cannot be found in the context, clearly state that you don't have that information
- Cite which chunks or sections of the document you're using (e.g., "According to Chunk 3...")
- Be concise but thorough in your answers
- Use markdown formatting for better readability (headers, lists, code blocks when appropriate)
- If asked about something not in the document, politely explain that you can only answer based on the provided document

When citing sources, use the format: [Chunk X] where X is the chunk number.`
}

/**
 * Format source citations for display
 * @param chunks - Array of chunks used in the response
 * @returns Array of formatted source objects
 */
export function formatSources(
  chunks: Array<DocumentChunk & { similarity?: number }>
): Array<{ chunkIndex: number; preview: string; similarity?: number }> {
  return chunks.map((chunk) => ({
    chunkIndex: chunk.chunk_index,
    preview: chunk.content.substring(0, 100) + '...',
    similarity: chunk.similarity,
  }))
}

/**
 * Generate embedding for a query string
 * @param query - User's query string
 * @returns Embedding vector
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  return await generateEmbedding(query)
}

