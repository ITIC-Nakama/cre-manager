import { apiClient } from '../AxiosApiClient';
import type {
  SkillCategory,
  Article,
  ArticleSummary,
  Quiz,
  Question,
  SkillTreeProgress,
  StudentQuiz,
  QuizResult,
  SubmitQuizPayload,
} from '../../types/models/Skill';

function unwrap<T>(response: { data: unknown }): T {
  const d = response.data as Record<string, unknown>;
  return (d?.data ?? d) as T;
}

// ─── CATEGORIES ─────────────────────────────────────────────────────────────

export function fetchAdminCategories(): Promise<SkillCategory[]> {
  return apiClient.get('/api/admin/skill-tree/categories').then((r) => unwrap<SkillCategory[]>(r));
}

export function createCategory(data: { nom: string; description: string; ordre: number; icone?: string }): Promise<SkillCategory> {
  return apiClient.post('/api/admin/skill-tree/categories', data).then((r) => unwrap<SkillCategory>(r));
}

export function updateCategory(
  id: string,
  data: { nom?: string; description?: string; ordre?: number; icone?: string; actif?: boolean }
): Promise<SkillCategory> {
  return apiClient.put(`/api/admin/skill-tree/categories/${id}`, data).then((r) => unwrap<SkillCategory>(r));
}

export function deleteCategory(id: string): Promise<void> {
  return apiClient.delete(`/api/admin/skill-tree/categories/${id}`).then(() => undefined);
}

// ─── ARTICLES ───────────────────────────────────────────────────────────────

export function fetchAdminArticles(categoryId?: string): Promise<ArticleSummary[]> {
  return apiClient.get('/api/admin/skill-tree/articles', { params: categoryId ? { categoryId } : undefined })
    .then((r) => unwrap<ArticleSummary[]>(r));
}

export function fetchAdminArticleById(id: string): Promise<Article> {
  return apiClient.get(`/api/admin/skill-tree/articles/${id}`).then((r) => unwrap<Article>(r));
}

export function createArticle(data: { titre: string; contenu: string; categorieId: string; actif?: boolean }): Promise<Article> {
  return apiClient.post('/api/admin/skill-tree/articles', data).then((r) => unwrap<Article>(r));
}

export function updateArticle(
  id: string,
  data: { titre?: string; contenu?: string; categorieId?: string; actif?: boolean }
): Promise<Article> {
  return apiClient.put(`/api/admin/skill-tree/articles/${id}`, data).then((r) => unwrap<Article>(r));
}

export function deleteArticle(id: string): Promise<void> {
  return apiClient.delete(`/api/admin/skill-tree/articles/${id}`).then(() => undefined);
}

// ─── QUIZZES ────────────────────────────────────────────────────────────────

export function fetchQuizByArticle(articleId: string): Promise<Quiz> {
  return apiClient.get(`/api/admin/skill-tree/articles/${articleId}/quiz`).then((r) => unwrap<Quiz>(r));
}

export function createQuizForArticle(
  articleId: string,
  data: { scoreMinimum: number; questions: Omit<Question, 'id'>[] }
): Promise<Quiz> {
  return apiClient.post(`/api/admin/skill-tree/articles/${articleId}/quiz`, data).then((r) => unwrap<Quiz>(r));
}

export function updateQuiz(
  id: string,
  data: { scoreMinimum: number; questions: Omit<Question, 'id'>[] }
): Promise<Quiz> {
  return apiClient.put(`/api/admin/skill-tree/quizzes/${id}`, data).then((r) => unwrap<Quiz>(r));
}

export function deleteQuiz(id: string): Promise<void> {
  return apiClient.delete(`/api/admin/skill-tree/quizzes/${id}`).then(() => undefined);
}

export function addQuestionToQuiz(quizId: string, data: Omit<Question, 'id'>): Promise<Quiz> {
  return apiClient.post(`/api/admin/skill-tree/quizzes/${quizId}/questions`, data).then((r) => unwrap<Quiz>(r));
}

export function deleteQuestion(id: string): Promise<void> {
  return apiClient.delete(`/api/admin/skill-tree/questions/${id}`).then(() => undefined);
}

// ─── STUDENT SKILL TREE ─────────────────────────────────────────────────────

export function fetchSkillTreeProgress(): Promise<SkillTreeProgress> {
  return apiClient.get('/api/skill-tree/progress').then((r) => unwrap<SkillTreeProgress>(r));
}

export function fetchStudentArticlesByCategory(categoryId: string): Promise<ArticleSummary[]> {
  return apiClient.get(`/api/skill-tree/categories/${categoryId}/articles`).then((r) => unwrap<ArticleSummary[]>(r));
}

export function fetchStudentArticle(id: string): Promise<Article> {
  return apiClient.get(`/api/skill-tree/articles/${id}`).then((r) => unwrap<Article>(r));
}

export function fetchStudentQuiz(articleId: string): Promise<StudentQuiz> {
  return apiClient.get(`/api/skill-tree/articles/${articleId}/quiz`).then((r) => unwrap<StudentQuiz>(r));
}

export function submitStudentQuiz(quizId: string, payload: SubmitQuizPayload): Promise<QuizResult> {
  return apiClient.post(`/api/skill-tree/quizzes/${quizId}/submit`, payload).then((r) => unwrap<QuizResult>(r));
}
