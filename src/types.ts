
export type Role = 'phụ huynh' | 'học sinh';
export type Personality = 'khó tính' | 'cáu gắt' | 'rụt rè' | 'thân thiện' | 'vội vàng';
export type Difficulty = 'chỉ hỏi trong tài liệu' | 'hỏi thêm bên ngoài';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface EvaluationError {
  question: string;
  userAnswer: string;
  correctInfo: string;
  feedback: string;
}

export interface Suggestion {
  situation: string;
  sampleAnswer: string;
  behaviorTip: string;
}

export interface EvaluationResult {
  accuracy: number;
  persuasiveness: number;
  attitude: number;
  summary: string;
  errors: EvaluationError[];
  suggestions: Suggestion[];
}

export interface FileItem {
  id: string;
  name: string;
  content: string;
  size: number;
  type: string;
}

export interface SessionConfig {
  role: Role;
  personality: Personality;
  difficulty: Difficulty;
  documentIds: string[];
}
