export interface AccentMarker {
  word: string;
  type: string;
  meaning: string;
  standardMandarin: string;
  explanation: string;
}

export interface AccentAnalysis {
  accentName: string;
  confidence: number;
  description: string;
  markers: AccentMarker[];
}

export interface TranslationResult {
  translation: string;
  pinyin: string;
  detectedLanguage: string;
  accentAnalysis: AccentAnalysis;
  culturalTips: string;
}

export interface HistoryEntry {
  id: string;
  text: string;
  sourceLanguage: string;
  timestamp: string;
  result: TranslationResult;
}
