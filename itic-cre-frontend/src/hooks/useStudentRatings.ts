import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api-s/AxiosApiClient';
import { unwrap } from '../api-s/unwrap';

/** Note d'un étudiant par l'équipe (1 à 5, commentaire facultatif), historisée ; jamais visible de l'étudiant. */
export interface StudentRating {
  id: string;
  score: number;
  comment: string | null;
  createdAt: string;
  authorId: string | null;
  authorName: string | null;
  /** Compte de l'équipe supprimé (ou note reprise des anciennes étoiles). */
  formerStaff: boolean;
}

const key = (studentId: string) => ['student-ratings', studentId] as const;

export function useStudentRatings(studentId: string) {
  return useQuery({
    queryKey: key(studentId),
    queryFn: () => apiClient.get(`/dashboard/students/${studentId}/ratings`).then((r) => unwrap<StudentRating[]>(r)),
  });
}

export function useRateStudent(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { score: number; comment?: string }) =>
      apiClient.post(`/dashboard/students/${studentId}/ratings`, payload).then((r) => unwrap<StudentRating>(r)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key(studentId) });
      // Dernière note affichée dans la liste des étudiants (colonne, filtre).
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'students'] });
    },
  });
}
