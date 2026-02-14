import OpenAI from 'openai';

// Lazy initialization to avoid errors when API key is not set
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return openaiClient;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient();

  if (!client) {
    console.warn('OPENAI_API_KEY not set, returning empty embedding');
    return [];
  }

  try {
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return [];
  }
}

export async function generateSocialProfile(
  bio: string,
  lookingFor: string
): Promise<string> {
  const client = getOpenAIClient();

  if (!client) {
    console.warn('OPENAI_API_KEY not set, returning raw bio+lookingFor');
    return `${bio}\n\n${lookingFor}`;
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content: `Na podstawie profilu użytkownika (bio: kim jestem, lookingFor: kogo szukam), wygeneruj bogaty profil społeczny (200-300 słów) opisujący:
- Kim jest ta osoba: zainteresowania, hobby, styl życia, osobowość
- Czego szuka u innych: ROZWIĄŻ ogólne sformułowania na konkretne cechy (np. "ludzi o podobnych zainteresowaniach" → wymień jakich zainteresowaniach na podstawie bio)
- Jaki typ osoby byłby dobrym matchem dla tego użytkownika
Pisz w 3. osobie, naturalnym językiem polskim. Nie używaj nagłówków ani list — pisz płynnym tekstem.`,
        },
        {
          role: 'user',
          content: `Bio: ${bio}\n\nLooking for: ${lookingFor}`,
        },
      ],
    });

    return response.choices[0].message.content || `${bio}\n\n${lookingFor}`;
  } catch (error) {
    console.error('Error generating social profile:', error);
    return `${bio}\n\n${lookingFor}`;
  }
}

export async function extractInterests(
  socialProfile: string
): Promise<string[]> {
  const client = getOpenAIClient();

  if (!client) {
    console.warn('OPENAI_API_KEY not set, returning empty interests');
    return [];
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 200,
      messages: [
        {
          role: 'system',
          content: `Wyciągnij 8-12 krótkich tagów zainteresowań z podanego profilu społecznego. Zwróć JSON array stringów, np. ["joga", "gotowanie", "podróże"]. Tagi powinny być krótkie (1-3 słowa), po polsku, małymi literami. Tylko JSON array, nic więcej.`,
        },
        {
          role: 'user',
          content: socialProfile,
        },
      ],
    });

    const content = response.choices[0].message.content || '[]';
    return JSON.parse(content);
  } catch (error) {
    console.error('Error extracting interests:', error);
    return [];
  }
}

export async function generateConnectionSnippet(
  myProfile: { socialProfile: string },
  theirProfile: { socialProfile: string; displayName: string }
): Promise<string> {
  const client = getOpenAIClient();

  if (!client) {
    return '';
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 100,
      messages: [
        {
          role: 'system',
          content: `Na podstawie dwóch profili społecznych, napisz jedno krótkie zdanie (max 80 znaków) po polsku o tym co łączy te osoby. Skup się na konkretnych wspólnych zainteresowaniach lub komplementarnych potrzebach. Nie zaczynaj od "Oboje" za każdym razem — bądź kreatywny. Samo zdanie, bez cudzysłowów.`,
        },
        {
          role: 'user',
          content: `Profil A:\n${myProfile.socialProfile}\n\nProfil B (${theirProfile.displayName}):\n${theirProfile.socialProfile}`,
        },
      ],
    });

    return response.choices[0].message.content?.trim() || '';
  } catch (error) {
    console.error('Error generating connection snippet:', error);
    return '';
  }
}
