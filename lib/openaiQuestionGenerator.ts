// lib/openaiQuestionGenerator.ts - AI Question Generator (if not created yet)
import OpenAI from 'openai';
import { prisma } from './prisma';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface QuestionGenerationOptions {
  courseTitle: string;
  courseDescription: string;
  courseLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  numberOfQuestions: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED';
}

export interface GeneratedQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

export class OpenAIQuestionGenerator {
  async generateQuestions(options: QuestionGenerationOptions): Promise<GeneratedQuestion[]> {
    const prompt = `
Generate ${options.numberOfQuestions} multiple-choice questions for a certification exam on:

Course: ${options.courseTitle}
Description: ${options.courseDescription}
Level: ${options.courseLevel}
Difficulty: ${options.difficulty}

Requirements:
1. Each question should have exactly 4 options
2. Only one correct answer per question
3. Include explanation for correct answer
4. Test practical knowledge and understanding
5. Use clear, professional language

Format as JSON array:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Explanation here",
    "difficulty": "MEDIUM"
  }
]
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert educational content creator. Generate high-quality multiple-choice questions for certification exams."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content generated');
      }

      // Extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error generating questions:', error);
      throw new Error('Failed to generate questions');
    }
  }

  async generateAndSaveQuestions(courseId: string, options: QuestionGenerationOptions): Promise<void> {
    const questions = await this.generateQuestions(options);
    
    // Clear existing questions
    await prisma.examQuestion.deleteMany({
      where: { courseId }
    });

    // Save new questions
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      await prisma.examQuestion.create({
        data: {
          courseId,
          question: question.question,
          options: question.options,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          difficulty: question.difficulty,
          order: i + 1,
          isActive: true
        }
      });
    }
  }
}

export const questionGenerator = new OpenAIQuestionGenerator();