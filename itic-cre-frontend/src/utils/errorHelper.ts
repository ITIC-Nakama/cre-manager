import type { UseFormSetError, FieldValues, Path } from 'react-hook-form';

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  data: Record<string, string> | null;
}

/** Priorise le message d'erreur renvoye par le backend (deja localise selon Accept-Language, voir
  * GlobalExceptionHandler) sur un texte generique fige cote front — sinon un message metier precis
  * (ex: "un contrat est deja actif pour cet etudiant") se perd derriere un texte qui n'aide
  * personne. `fallback` ne sert que si la reponse n'a pas pu etre lue (perte reseau, timeout). */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const apiError: ApiErrorResponse | undefined = (err as { response?: { data?: ApiErrorResponse } })?.response?.data;
  return apiError?.message || fallback;
}

export function handleApiError<T extends FieldValues>(
  err: any,
  setError: UseFormSetError<T>,
  setGeneralError: (message: string) => void,
  defaultMessage: string = "Une erreur est survenue.",
  fieldMapping?: (key: string) => string
) {
  const apiError: ApiErrorResponse | undefined = err?.response?.data;

  if (apiError && apiError.statusCode === 400 && apiError.data) {
    Object.entries(apiError.data).forEach(([key, val]) => {
      const targetKey = fieldMapping ? fieldMapping(key) : key;
      setError(targetKey as Path<T>, {
        type: 'server',
        message: val as string
      });
    });
  } else if (apiError && apiError.message) {
    setGeneralError(apiError.message);
  } else {
    setGeneralError(defaultMessage);
  }
}
