import type { UseFormSetError, FieldValues, Path } from 'react-hook-form';

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  data: Record<string, string> | null;
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
