import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { checkDocumentLimit } from '@/lib/rate-limit'
import { createServiceRoleSupabase } from '@/lib/supabase'
import { getFileType } from '@/lib/document-helpers'

/**
 * POST /api/documents/upload
 * Upload and process a new document
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check document limit
    const limitCheck = await checkDocumentLimit(session.user.id)
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.message || 'Document limit reached' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Please select a file to upload.', code: 'NO_FILE' },
        { status: 400 }
      )
    }

    // Validate file type
    const fileType = getFileType(file.name)
    const allowedTypes = ['pdf', 'txt', 'docx']
    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json(
        {
          error: `File type "${fileType}" is not supported. Please upload PDF, TXT, or DOCX files.`,
          code: 'INVALID_FILE_TYPE',
          allowedTypes,
        },
        { status: 400 }
      )
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0)
      return NextResponse.json(
        {
          error: `File size (${fileSizeMB}MB) exceeds the ${maxSizeMB}MB limit. Please choose a smaller file.`,
          code: 'FILE_TOO_LARGE',
          maxSize,
          fileSize: file.size,
        },
        { status: 400 }
      )
    }

    // Read file content - create a copy to avoid detached ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    // Create a proper copy using Uint8Array to prevent detachment issues
    const uint8Array = new Uint8Array(arrayBuffer)
    const buffer = Buffer.from(uint8Array)

    // Process document - use Node.js function (Python functions have deployment issues)
    // TODO: Re-enable Python function once Vercel Python runtime is stable
    let processResult: any
    try {
      const { processDocument } = await import('@/app/api/process-document/route')
      processResult = await processDocument(buffer, file.name)
    } catch (processError) {
      console.error('Error processing document:', processError)
      return NextResponse.json(
        {
          error:
            processError instanceof Error
              ? processError.message
              : 'Failed to process document. Please try again or contact support.',
          code: 'PROCESSING_ERROR',
        },
        { status: 500 }
      )
    }

    if (!processResult.success || !processResult.chunks) {
      return NextResponse.json(
        {
          error: processResult.error || 'Document processing failed',
          code: 'PROCESSING_FAILED',
        },
        { status: 500 }
      )
    }

    const { chunks, metadata } = processResult

    // Generate embeddings for chunks in batches to avoid rate limits
    try {
      const { generateEmbedding } = await import('@/lib/openai')
      const embeddings: number[][] = []
      const EMBEDDING_BATCH_SIZE = 10 // Process 10 embeddings at a time
      
      for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
        const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE)
        const batchEmbeddings = await Promise.all(
          batch.map((chunk: string) => generateEmbedding(chunk))
        )
        embeddings.push(...batchEmbeddings)
        
        // Small delay between batches to avoid rate limiting
        if (i + EMBEDDING_BATCH_SIZE < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      if (embeddings.length !== chunks.length) {
        throw new Error(`Embedding count mismatch: expected ${chunks.length}, got ${embeddings.length}`)
      }

      const supabase = createServiceRoleSupabase()

      // Verify document_chunks table exists by attempting a simple query
      const { error: tableCheckError } = await supabase
        .from('document_chunks')
        .select('id')
        .limit(1)
      
      if (tableCheckError && !tableCheckError.message?.includes('does not exist')) {
        // If it's not a "table doesn't exist" error, log it but continue
        console.warn('Warning checking document_chunks table:', tableCheckError.message)
      }

      // Create document record
      // Try with chunk_count first, fallback without it if column doesn't exist
      let document: any
      let insertError: any
      
      // First attempt: try with chunk_count
      const insertData: any = {
        user_id: session.user.id,
        name: file.name,
        content: chunks.join('\n\n'), // Store full text
        chunk_count: chunks.length,
      }
      
      const { data: docWithCount, error: errorWithCount } = await supabase
        .from('documents')
        .insert(insertData)
        .select()
        .single()
      
      // If chunk_count column doesn't exist, try without it
      if (errorWithCount && errorWithCount.message?.includes('chunk_count')) {
        const { data: docWithoutCount, error: errorWithoutCount } = await supabase
          .from('documents')
          .insert({
            user_id: session.user.id,
            name: file.name,
            content: chunks.join('\n\n'),
          })
          .select()
          .single()
        
        document = docWithoutCount
        insertError = errorWithoutCount
      } else {
        document = docWithCount
        insertError = errorWithCount
      }

      if (insertError || !document) {
        console.error('Error creating document:', {
          error: insertError,
          message: insertError?.message,
          code: insertError?.code,
          details: insertError?.details,
        })
        return NextResponse.json(
          { 
            error: 'Failed to create document in database',
            details: insertError?.message || 'Unknown database error',
            code: 'DATABASE_ERROR',
          },
          { status: 500 }
        )
      }

      // Validate embeddings before inserting
      if (embeddings.length !== chunks.length) {
        throw new Error(`Embedding count mismatch: expected ${chunks.length}, got ${embeddings.length}`)
      }
      
      // Validate embedding dimensions (should be 1536 for text-embedding-3-small)
      const expectedDimension = 1536
      for (let i = 0; i < embeddings.length; i++) {
        if (!Array.isArray(embeddings[i])) {
          throw new Error(`Embedding at index ${i} is not an array`)
        }
        if (embeddings[i].length !== expectedDimension) {
          throw new Error(`Embedding at index ${i} has wrong dimension: expected ${expectedDimension}, got ${embeddings[i].length}`)
        }
      }

      // Store chunks with embeddings in batches to avoid size limits
      const BATCH_SIZE = 50 // Insert 50 chunks at a time
      const chunkInserts = chunks.map((chunk: string, index: number) => ({
        document_id: document.id,
        content: chunk,
        embedding: embeddings[index], // Supabase JS client handles number[] for vector type
        chunk_index: index,
      }))

      // Insert chunks in batches
      for (let i = 0; i < chunkInserts.length; i += BATCH_SIZE) {
        const batch = chunkInserts.slice(i, i + BATCH_SIZE)
        const { error: batchError } = await supabase
          .from('document_chunks')
          .insert(batch)

        if (batchError) {
          console.error('Error inserting chunk batch:', {
            error: batchError,
            message: batchError?.message,
            code: batchError?.code,
            details: batchError?.details,
            hint: batchError?.hint,
            documentId: document.id,
            batchIndex: i,
            batchSize: batch.length,
            totalChunks: chunks.length,
          })
          
          // Clean up document if chunks fail
          try {
            await supabase.from('documents').delete().eq('id', document.id)
            // Also clean up any chunks that were successfully inserted
            await supabase.from('document_chunks').delete().eq('document_id', document.id)
          } catch (cleanupError) {
            console.error('Error cleaning up document:', cleanupError)
          }
          
          return NextResponse.json(
            { 
              error: 'Failed to store document chunks',
              details: batchError?.message || batchError?.hint || 'Unknown error storing chunks',
              code: 'CHUNKS_ERROR',
              batchIndex: i,
            },
            { status: 500 }
          )
        }
      }

      return NextResponse.json({
        success: true,
        document: {
          id: document.id,
          name: document.name,
          created_at: document.created_at,
          chunk_count: chunks.length,
        },
        message: 'Document uploaded and processed successfully.',
      })
    } catch (error) {
      console.error('Error in document upload workflow:', error)
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'Failed to complete document upload',
          code: 'UPLOAD_ERROR',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in POST /api/documents/upload:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to upload document',
      },
      { status: 500 }
    )
  }
}

