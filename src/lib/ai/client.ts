// AI Service Client - Provider-agnostic wrapper for AI operations
import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is not set');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface RemixOptions {
  content: string;
  tone: 'professional' | 'friendly' | 'brief' | 'detailed';
}

export interface RemixResult {
  original: string;
  rewritten: string;
  suggested_subject?: string;
}

export interface DictateResult {
  raw_transcription: string;
  polished_email: string;
  suggested_subject?: string;
}

export interface EventDetails {
  title: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  attendees: Array<{ email: string; name: string }> | null;
  description: string | null;
}

export interface MessageForCategorization {
  id: string;
  from_email: string;
  from_name: string | null;
  subject: string | null;
  snippet: string | null;
}

export interface CategorizedMessage {
  id: string;
  category: 'people' | 'newsletter' | 'notification' | 'promotion' | 'social';
}

/**
 * Remix email content with specified tone
 */
export async function remixEmail(options: RemixOptions): Promise<RemixResult> {
  const toneInstructions = {
    professional: 'professional and formal',
    friendly: 'warm, friendly, and conversational',
    brief: 'concise and to-the-point',
    detailed: 'comprehensive and detailed',
  };

  const systemPrompt = `You are an email writing assistant. Rewrite the following email in a ${toneInstructions[options.tone]} tone. Maintain the original intent and key information. Return only the rewritten email body, no preamble or explanations.`;

  const response = await openai.chat.completions.create({
    model: process.env.AI_MODEL || 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: options.content },
    ],
    temperature: 0.7,
    max_tokens: 1000,
  });

  const rewritten = response.choices[0]?.message?.content || options.content;

  // Optionally generate a subject line if the content seems to need one
  let suggested_subject: string | undefined;
  if (options.content.length > 100 && !options.content.toLowerCase().includes('subject:')) {
    const subjectResponse = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: 'Generate a concise email subject line (max 60 chars) for the following email content. Return only the subject line, no quotes or preamble.' },
        { role: 'user', content: rewritten },
      ],
      temperature: 0.7,
      max_tokens: 20,
    });
    suggested_subject = subjectResponse.choices[0]?.message?.content?.trim();
  }

  return {
    original: options.content,
    rewritten,
    suggested_subject,
  };
}

/**
 * Transcribe audio and polish into email format
 */
export async function dictateToEmail(audioFile: File): Promise<DictateResult> {
  // Step 1: Transcribe audio using Whisper
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    language: 'en',
  });

  const raw_transcription = transcription.text;

  // Step 2: Polish transcription into well-formatted email
  const polishResponse = await openai.chat.completions.create({
    model: process.env.AI_MODEL || 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'Convert this voice transcription into a well-formatted email. Fix grammar, add proper greeting and sign-off if appropriate. Maintain the speaker\'s intent and tone. Return only the email body.',
      },
      { role: 'user', content: raw_transcription },
    ],
    temperature: 0.7,
    max_tokens: 1000,
  });

  const polished_email = polishResponse.choices[0]?.message?.content || raw_transcription;

  // Generate subject line
  const subjectResponse = await openai.chat.completions.create({
    model: process.env.AI_MODEL || 'gpt-4o',
    messages: [
      { role: 'system', content: 'Generate a concise email subject line (max 60 chars) for the following email. Return only the subject line, no quotes.' },
      { role: 'user', content: polished_email },
    ],
    temperature: 0.7,
    max_tokens: 20,
  });

  const suggested_subject = subjectResponse.choices[0]?.message?.content?.trim();

  return {
    raw_transcription,
    polished_email,
    suggested_subject,
  };
}

/**
 * Extract calendar event details from email
 */
export async function extractEvent(
  emailBody: string,
  emailSubject: string,
  fromEmail: string
): Promise<EventDetails> {
  const systemPrompt = `Extract calendar event details from this email. Return valid JSON with this exact structure:
{
  "title": "string or null",
  "date": "YYYY-MM-DD or null",
  "start_time": "HH:MM or null",
  "end_time": "HH:MM or null",
  "location": "string or null",
  "attendees": [{"email": "string", "name": "string"}] or null,
  "description": "string or null"
}
If any field cannot be determined, use null. Ensure valid JSON format.`;

  const userPrompt = `Subject: ${emailSubject}\nFrom: ${fromEmail}\n\n${emailBody}`;

  const response = await openai.chat.completions.create({
    model: process.env.AI_MODEL || 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3, // Lower temp for more structured output
    max_tokens: 500,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Failed to extract event details');
  }

  try {
    const parsed = JSON.parse(content) as EventDetails;
    return parsed;
  } catch  {
    console.error('Failed to parse event extraction response:', content);
    throw new Error('Invalid event extraction response format');
  }
}

/**
 * Categorize messages in batch
 */
export async function categorizeMessages(
  messages: MessageForCategorization[]
): Promise<CategorizedMessage[]> {
  if (messages.length === 0) return [];

  const systemPrompt = `Categorize each email into exactly one category:
- 'people': from real humans (personal or work emails)
- 'newsletter': subscriptions, marketing emails, regular newsletters
- 'notification': automated notifications (shipping, receipts, alerts, confirmations)
- 'promotion': ads, sales, promotional offers
- 'social': social media notifications

Return valid JSON array: [{"id": "string", "category": "string"}]`;

  const messageList = messages
    .map(
      (m) =>
        `ID: ${m.id}\nFrom: ${m.from_name || ''} <${m.from_email}>\nSubject: ${m.subject || '(no subject)'}\nSnippet: ${m.snippet || ''}`
    )
    .join('\n\n---\n\n');

  const response = await openai.chat.completions.create({
    model: process.env.AI_MODEL || 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: messageList },
    ],
    temperature: 0.3,
    max_tokens: messages.length * 30, // ~30 tokens per message
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Failed to categorize messages');
  }

  try {
    const parsed = JSON.parse(content);
    // Handle both array response and object with results array
    const results = Array.isArray(parsed) ? parsed : parsed.results || [];
    return results as CategorizedMessage[];
  } catch {
    console.error('Failed to parse categorization response:', content);
    throw new Error('Invalid categorization response format');
  }
}

export default openai;
