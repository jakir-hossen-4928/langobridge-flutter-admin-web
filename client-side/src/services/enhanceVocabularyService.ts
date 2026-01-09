import { Vocabulary } from '@/types/vocabulary';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export async function enhanceVocabulary(
    vocab: Vocabulary,
    context?: string,
    fieldsToEnhance?: string[]
): Promise<Partial<Vocabulary>> {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

    if (!apiKey) {
        throw new Error('OpenAI API Key not found');
    }

    const prompt = `
    You are a Korean-Bangla language expert. Improve the following vocabulary entry.
    
    Current Entry:
    Korean Word: ${vocab.korean_word}
    Bangla Meaning: ${vocab.bangla_meaning}
    Part of Speech: ${vocab.part_of_speech || 'Unknown'}
    
    Fields to Enhance: ${fieldsToEnhance ? fieldsToEnhance.join(', ') : 'All missing fields'}
    ${context ? `Extra Context: ${context}` : ''}

    Rules:
    1. For 'verb_forms': Provide present, past, future, and polite forms in Korean.
    2. For 'explanation': Provide a detailed usage explanation in Bengali (min 50 chars).
    3. For 'examples': Provide a JSON array of { korean: string, bangla: string } objects.
    4. For 'themes': Provide a comma-separated array of strings (e.g., ["daily", "food"]).
    5. For 'chapters': Provide an array of numbers (e.g., [1, 5]).
    6. For 'romanization': Provide the Korean pronunciation in English.
    7. For 'part_of_speech': Provide the grammatical category (e.g., "noun", "verb", "adjective").

    Return ONLY a JSON object with the enhanced fields using the exact keys requested.
  `;

    const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are a Korean-Bangla language specialist. Respond only with JSON.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7
        })
    });

    if (!response.ok) {
        throw new Error('AI Enhancement failed');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    try {
        const cleanedContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(cleanedContent);

        return result;
    } catch (e) {
        console.error('Failed to parse AI response:', content);
        throw new Error('AI returned invalid JSON');
    }
}
