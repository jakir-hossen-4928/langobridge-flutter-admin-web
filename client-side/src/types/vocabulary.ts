export interface VocabularyExample {
    korean: string;
    bangla: string;
}

export interface VerbForms {
    present: string;
    past: string;
    future: string;
    polite: string;
}

export interface Vocabulary {
    id: string;
    korean_word: string;
    bangla_meaning: string;
    romanization: string | null;
    part_of_speech: string | null;
    explanation: string;
    examples: VocabularyExample[];
    themes: string[] | null;
    chapters: number[] | null;
    verb_forms: VerbForms | null;
}
