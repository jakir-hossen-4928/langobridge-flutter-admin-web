import POS_DATA from '../data/partOfSpeech.json';

export interface PartOfSpeech {
    key: string;
    korean: string;
    description_en: string;
}

export const partsOfSpeech: PartOfSpeech[] = POS_DATA.parts_of_speech;

export const PART_OF_SPEECH_KEYS = partsOfSpeech.map(p => p.key);
