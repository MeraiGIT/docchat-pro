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

    // Generate embeddings for chunks
    try {
      const { generateEmbedding } = await import('@/lib/openai')
      const embeddings = await Promise.all(
        chunks.map((chunk: string) => generateEmbedding(chunk))
      )

      const supabase = createServiceRoleSupabase()

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

      // Store chunks with embeddings
      const chunkInserts = chunks.map((chunk: string, index: number) => ({
        document_id: document.id,
        content: chunk,
        embedding: embeddings[index],
        chunk_index: index,
      }))

      const { error: chunksError } = await supabase
        .from('document_chunks')
        .insert(chunkInserts)

      if (chunksError) {
        console.error('Error inserting chunks:', {
          error: chunksError,
          message: chunksError?.message,
          code: chunksError?.code,
          documentId: document.id,
          chunkCount: chunks.length,
        })
        // Clean up document if chunks fail
        try {
          await supabase.from('documents').delete().eq('id', document.id)
        } catch (cleanupError) {
          console.error('Error cleaning up document:', cleanupError)
        }
        return NextResponse.json(
          { 
            error: 'Failed to store document chunks',
            details: chunksError?.message || 'Unknown error storing chunks',
            code: 'CHUNKS_ERROR',
          },
          { status: 500 }
        )
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

