export function isAnonymizedStudent(student?: { isAnonymized?: boolean; email?: string } | null): boolean {
  return Boolean(student?.isAnonymized || student?.email?.endsWith('@rgpd.deleted') || student?.email?.startsWith('deleted_'));
}
