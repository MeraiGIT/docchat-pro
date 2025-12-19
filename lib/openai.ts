import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

// Environment variable validation
const openaiApiKey = process.env.OPENAI_API_KEY
const anthropicApiKey = process.env.ANTHROPIC_API_KEY

if (!openaiApiKey) {
  throw new Error('Missing OPENAI_API_KEY environment variable (required for embeddings)')
}

if (!anthropicApiKey) {
  throw new Error('Missing ANTHROPIC_API_KEY environment variable (required for chat)')
}

/**
 * Initialize OpenAI client (used for embeddings)
 */
export const openai = new OpenAI({
  apiKey: openaiApiKey,
})

/**
 * Initialize Anthropic client (used for chat)
 */
export const anthropic = new Anthropic({
  apiKey: anthropicApiKey,
})

/**
 * Generate embeddings for text using OpenAI's text-embedding-3-small model
 * @param text - The text to generate embeddings for
 * @returns Array of embedding values (1536 dimensions)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    })
    
    if (!response.data[0]?.embedding) {
      throw new Error('Failed to generate embedding: empty response')
    }
    
    return response.data[0].embedding
  } catch (error) {
    console.error('Error generating embedding:', error)
    throw new Error(
      error instanceof Error 
        ? `Failed to generate embedding: ${error.message}`
        : 'Failed to generate embedding'
    )
  }
}

/**
 * Stream chat completions using Anthropic's Claude Sonnet 4.5 model
 * @param messages - Array of chat messages
 * @param systemPrompt - Optional system prompt
 * @returns ReadableStream of chat completion chunks
 */
export async function streamChatCompletion(
  messages: Array<{ role: 'user' | 'assistant' | 'system', content: string }>,
  systemPrompt?: string
): Promise<ReadableStream> {
  try {
    // Convert messages format from OpenAI to Anthropic
    // Anthropic uses a different message format
    const anthropicMessages: Anthropic.MessageParam[] = []
    
    // Add system prompt if provided
    const systemMessage = systemPrompt || ''
    
    // Convert messages (skip system role, handle user/assistant)
    for (const msg of messages) {
      if (msg.role === 'system') {
        // System messages are handled separately in Anthropic
        continue
      }
      
      if (msg.role === 'user') {
        anthropicMessages.push({
          role: 'user',
          content: msg.content,
        })
      } else if (msg.role === 'assistant') {
        anthropicMessages.push({
          role: 'assistant',
          content: msg.content,
        })
      }
    }
    
    // Stream from Anthropic
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemMessage,
      messages: anthropicMessages,
    })
    
    // Convert Anthropic stream to ReadableStream
    const encoder = new TextEncoder()
    
    return new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            // Handle different event types from Anthropic stream
            if (event.type === 'content_block_delta') {
              const delta = event.delta
              if (delta.type === 'text_delta' && delta.text) {
                controller.enqueue(encoder.encode(delta.text))
              }
            }
            // Handle other event types if needed (e.g., content_block_start, message_start, etc.)
          }
          controller.close()
        } catch (error) {
          console.error('Error streaming chat completion:', error)
          controller.error(error)
        }
      },
    })
  } catch (error) {
    console.error('Error creating chat completion:', error)
    throw new Error(
      error instanceof Error
        ? `Failed to stream chat completion: ${error.message}`
        : 'Failed to stream chat completion'
    )
  }
}

/**
 * Generate a non-streaming chat completion using Anthropic's Claude Sonnet 4.5
 * Useful for cases where you need the full response at once
 */
export async function createChatCompletion(
  messages: Array<{ role: 'user' | 'assistant' | 'system', content: string }>,
  systemPrompt?: string
): Promise<string> {
  try {
    // Convert messages format from OpenAI to Anthropic
    const anthropicMessages: Anthropic.MessageParam[] = []
    
    // Add system prompt if provided
    const systemMessage = systemPrompt || ''
    
    // Convert messages (skip system role, handle user/assistant)
    for (const msg of messages) {
      if (msg.role === 'system') {
        // System messages are handled separately in Anthropic
        continue
      }
      
      if (msg.role === 'user') {
        anthropicMessages.push({
          role: 'user',
          content: msg.content,
        })
      } else if (msg.role === 'assistant') {
        anthropicMessages.push({
          role: 'assistant',
          content: msg.content,
        })
      }
    }
    
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemMessage,
      messages: anthropicMessages,
    })
    
    // Extract text content from Anthropic response
    const textContent = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    )
    
    if (!textContent?.text) {
      throw new Error('Failed to get chat completion: empty response')
    }
    
    return textContent.text
  } catch (error) {
    console.error('Error creating chat completion:', error)
    throw new Error(
      error instanceof Error
        ? `Failed to create chat completion: ${error.message}`
        : 'Failed to create chat completion'
    )
  }
}

