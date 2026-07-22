import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  fetchAdminArticles,
  fetchAdminArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
  fetchQuizByArticle,
  createQuizForArticle,
  updateQuiz,
  deleteQuiz,
  fetchSkillTreeProgress,
  fetchStudentArticlesByCategory,
  fetchStudentArticle,
  fetchStudentQuiz,
  submitStudentQuiz,
  exportSkillTree,
  importSkillTree,
} from '../api-s/requests/SkillRequest';
import type { Question, SubmitQuizPayload, SkillTreeExportData } from '../types/models/Skill';

export function useAdminCategories() {
  return useQuery({
    queryKey: ['skill-categories'],
    queryFn: fetchAdminCategories,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { nom: string; description: string; ordre: number; icone?: string }) => createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-categories'] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nom?: string; description?: string; ordre?: number; icone?: string; actif?: boolean } }) =>
      updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-categories'] });
      queryClient.invalidateQueries({ queryKey: ['skill-articles'] });
    },
  });
}

export function useAdminArticles(categoryId?: string) {
  return useQuery({
    queryKey: ['skill-articles', categoryId],
    queryFn: () => fetchAdminArticles(categoryId),
  });
}

export function useAdminArticleById(id: string, enabled = true) {
  return useQuery({
    queryKey: ['skill-article', id],
    queryFn: () => fetchAdminArticleById(id),
    enabled: !!id && enabled,
  });
}

export function useCreateArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { titre: string; contenu: string; categorieId: string; ordre: number; actif?: boolean }) => createArticle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-articles'] });
    },
  });
}

export function useUpdateArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { titre?: string; contenu?: string; categorieId?: string; ordre?: number; actif?: boolean } }) =>
      updateArticle(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['skill-articles'] });
      queryClient.invalidateQueries({ queryKey: ['skill-article', variables.id] });
    },
  });
}

export function useDeleteArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteArticle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-articles'] });
    },
  });
}

export function useQuizByArticle(articleId: string, enabled = true) {
  return useQuery({
    queryKey: ['skill-quiz-article', articleId],
    queryFn: () => fetchQuizByArticle(articleId),
    enabled: !!articleId && enabled,
    retry: false,
  });
}

export function useCreateQuizForArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ articleId, data }: { articleId: string; data: { scoreMinimum: number; questions: Omit<Question, 'id'>[] } }) =>
      createQuizForArticle(articleId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['skill-quiz-article', variables.articleId] });
      queryClient.invalidateQueries({ queryKey: ['skill-articles'] });
    },
  });
}

export function useUpdateQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { scoreMinimum: number; questions: Omit<Question, 'id'>[] } }) =>
      updateQuiz(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-quiz-article'] });
    },
  });
}

export function useDeleteQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { id: string; articleId?: string }) => deleteQuiz(variables.id),
    onSuccess: (_, variables) => {
      if (variables.articleId) {
        queryClient.invalidateQueries({ queryKey: ['skill-quiz-article', variables.articleId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['skill-quiz-article'] });
      }
      queryClient.invalidateQueries({ queryKey: ['skill-articles'] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-categories'] });
    },
  });
}

// ─── STUDENT SKILL TREE ─────────────────────────────────────────────────────

export function useSkillTreeProgress() {
  return useQuery({
    queryKey: ['skill-tree-progress'],
    queryFn: fetchSkillTreeProgress,
  });
}

export function useStudentArticlesByCategory(categoryId: string, enabled = true) {
  return useQuery({
    queryKey: ['student-articles', categoryId],
    queryFn: () => fetchStudentArticlesByCategory(categoryId),
    enabled: !!categoryId && enabled,
  });
}

export function useStudentArticle(id: string, enabled = true) {
  return useQuery({
    queryKey: ['student-article', id],
    queryFn: () => fetchStudentArticle(id),
    enabled: !!id && enabled,
  });
}

export function useStudentQuiz(articleId: string, enabled = true) {
  return useQuery({
    queryKey: ['student-quiz', articleId],
    queryFn: () => fetchStudentQuiz(articleId),
    enabled: !!articleId && enabled,
  });
}

export function useSubmitQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { quizId: string; articleId: string; payload: SubmitQuizPayload }) =>
      submitStudentQuiz(variables.quizId, variables.payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['skill-tree-progress'] });
      queryClient.invalidateQueries({ queryKey: ['student-quiz', variables.articleId] });
    },
  });
}

export function useExportSkillTree() {
  return useMutation({
    mutationFn: exportSkillTree,
  });
}

export function useImportSkillTree() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SkillTreeExportData) => importSkillTree(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-categories'] });
      queryClient.invalidateQueries({ queryKey: ['skill-articles'] });
      queryClient.invalidateQueries({ queryKey: ['skill-tree-progress'] });
    },
  });
}

