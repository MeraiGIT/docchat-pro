import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { checkChatLimit, incrementChatCount } from '@/lib/rate-limit'
import { createServerSupabase, createServiceRoleSupabase } from '@/lib/supabase'
import { streamChatCompletion } from '@/lib/openai'
import {
  generateQueryEmbedding,
  findRelevantChunks,
  buildContext,
  generateSystemPrompt,
  formatSources,
} from '@/lib/rag-helpers'
import { isValidChatMessage, isValidDocumentId, isValidChatId } from '@/lib/validation'

/**
 * POST /api/chat
 * Send a chat message with RAG and streaming response
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const body = await request.json()
    const { message, documentId, chatId } = body

    // Validate input
    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required and must be a string' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!documentId || typeof documentId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Document ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!isValidDocumentId(documentId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid document ID format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (chatId && !isValidChatId(chatId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid chat ID format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const messageValidation = isValidChatMessage(message)
    if (!messageValidation.valid) {
      return new Response(
        JSON.stringify({ error: messageValidation.message || 'Invalid message' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check rate limits
    const limitCheck = await checkChatLimit(session.user.id)
    if (!limitCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: limitCheck.message || 'Chat limit reached',
          code: 'RATE_LIMIT_EXCEEDED',
          upgradeRequired: true,
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabase = await createServerSupabase()
    const serviceSupabase = createServiceRoleSupabase()

    // Get document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', session.user.id)
      .single()

    if (docError || !document) {
      return new Response(
        JSON.stringify({
          error: 'Document not found or you do not have access to it',
          code: 'DOCUMENT_NOT_FOUND',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Generate embedding for user query
    const queryEmbedding = await generateQueryEmbedding(message)

    // Find relevant chunks
    const relevantChunks = await findRelevantChunks(queryEmbedding, documentId, 5)

    if (relevantChunks.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No relevant content found in document. Try asking a different question or ensure the document has been processed correctly.',
          code: 'NO_RELEVANT_CONTENT',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Build context and system prompt
    const context = buildContext(relevantChunks)
    const systemPrompt = generateSystemPrompt(document.name)
    const userMessage = `Context from document:\n\n${context}\n\nUser question: ${message}`

    // Get chat history if chatId exists
    let chatHistory: Array<{ role: 'user' | 'assistant', content: string }> = []
    if (chatId) {
      const { data: chat } = await supabase
        .from('chats')
        .select('messages')
        .eq('id', chatId)
        .eq('user_id', session.user.id)
        .single()

      if (chat?.messages) {
        chatHistory = chat.messages
      }
    }

    // Create streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = ''
          const messages = [
            ...chatHistory,
            { role: 'user' as const, content: userMessage },
          ]

          const openaiStream = await streamChatCompletion(messages, systemPrompt)
          const reader = openaiStream.getReader()

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = new TextDecoder().decode(value)
            fullResponse += chunk

            // Send chunk to client
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`))
          }

          // Save chat to database
          const finalMessages = [
            ...chatHistory,
            { role: 'user' as const, content: message },
            { role: 'assistant' as const, content: fullResponse },
          ]

          const sources = formatSources(relevantChunks)

          if (chatId) {
            // Update existing chat
            await serviceSupabase
              .from('chats')
              .update({
                messages: finalMessages,
                updated_at: new Date().toISOString(),
              })
              .eq('id', chatId)
          } else {
            // Create new chat
            const { data: newChat } = await serviceSupabase
              .from('chats')
              .insert({
                document_id: documentId,
                user_id: session.user.id,
                title: message.substring(0, 50),
                messages: finalMessages,
              })
              .select()
              .single()

            // Send chat ID to client
            if (newChat) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ chatId: newChat.id })}\n\n`)
              )
            }
          }

          // Send sources
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ sources, done: true })}\n\n`)
          )

          // Increment usage count
          await incrementChatCount(session.user.id)

          controller.close()
        } catch (error) {
          console.error('Error in stream:', error)
          const errorMessage =
            error instanceof Error
              ? error.message.includes('rate limit')
                ? 'Anthropic API rate limit exceeded. Please try again in a moment.'
                : error.message.includes('quota')
                ? 'Anthropic API quota exceeded. Please check your API key limits.'
                : 'Failed to generate AI response. Please try again.'
              : 'Failed to generate response'
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: errorMessage, code: 'STREAM_ERROR' })}\n\n`
            )
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Error in POST /api/chat:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to process chat',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

