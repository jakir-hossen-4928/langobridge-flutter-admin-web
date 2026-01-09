
export interface AIResult {
    korean_word: string;
    bangla_meaning: string;
    romanization: string;
    part_of_speech: string;
    explanation: string;
    themes: string[];
    chapters: number[];
    examples: Array<{ korean: string; bangla: string }>;
    verb_forms?: {
        present: string;
        past: string;
        future: string;
        polite: string;
    };
}

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const VALID_POS = ["noun", "pronoun", "numeral", "verb", "adjective", "adverb", "determiner", "particle", "ending", "auxiliary_verb", "interjection", "prefix", "suffix", "bound_noun", "counter", "copula", "conjunction"];
const VALID_THEMES = ["daily_life", "family", "friends", "food", "shopping", "housing", "transport", "health", "weather", "time_date", "hobbies", "emotions", "clothing", "workplace", "factory", "construction", "manufacturing", "safety", "tools", "machines", "instructions", "warnings", "permissions", "schedule", "salary", "overtime", "leave", "rules", "conversation", "question_answer", "commands", "requests", "suggestions", "apology", "agreement", "disagreement", "polite_speech", "honorifics", "formal", "informal", "travel", "directions", "airport", "immigration", "hotel", "restaurant", "public_service", "bank", "post_office", "police", "emergency", "education", "classroom", "exam", "study", "language_learning", "grammar", "vocabulary", "reading", "writing", "listening", "speaking", "medical", "hospital", "medicine", "injury", "accident", "first_aid", "fire_safety", "protective_equipment", "danger", "warning_signs", "numbers", "counting", "money", "measurement", "weight", "length", "quantity", "price", "percentage", "time_management", "technology", "mobile", "internet", "computer", "applications", "devices", "repair", "electricity", "nature", "animals", "plants", "environment", "pollution", "natural_disaster", "weather_alert", "movement", "action", "change", "state", "process", "cause_effect", "permission_prohibition", "culture", "tradition", "festival", "customs", "respect", "behavior", "social_rules"];

export async function generateVocabularyData(input: string): Promise<AIResult[]> {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

    if (!apiKey) {
        throw new Error('OpenAI API Key not found in environment variables.');
    }

    const prompt = `
    You are a professional Korean-Bangla translator and language teacher.
    Convert the following input into a JSON array of vocabulary objects.
    Input: "${input}"

    Required JSON Structure for each object:
    {
      "korean_word": "The word in Hangul",
      "bangla_meaning": "Accurate meaning in Bengali",
      "romanization": "Standard Revised Romanization like this :: sa-ram",
      "part_of_speech": "One of: ${VALID_POS.join(', ')}",
      "explanation": "Brief explanation of usage in Bengali, how, where, when, why, who, what, etc in Bengali. Suitable for Bangladeshi learners",
      "themes": ["at least one or more from: ${VALID_THEMES.join(', ')}"],
      "chapters": [integer array of EPS Topic chapters if applicable],
      "examples": [
        { "korean": "real world example sentence in Korean", "bangla": "real world example Bengali translation" }
      ],
      "verb_forms": {
        "present": "Present tense form (e.g. 가요 for 가다)",
        "past": "Past tense form (e.g. 갔어요)",
        "future": "Future tense form (e.g. 갈 거예요)",
        "polite": "Formal polite form (e.g. 갑니다)"
      }
    }

    Note: Always include "verb_forms" if "part_of_speech" is "verb". If not a verb, omit the "verb_forms" key.
    Response must be ONLY the JSON array. Do not include markdown formatting like \`\`\`json.
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
                { role: 'system', content: 'You are a Korean-Bangla language specialist.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate data from AI.');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    try {
        const cleanedContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedContent);
    } catch (e) {
        console.error('Failed to parse AI response:', content);
        throw new Error('AI returned invalid JSON. Please try again.');
    }
}
