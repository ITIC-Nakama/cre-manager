// Relais en memoire (non persiste) du mot de passe saisi a la connexion,
// pour eviter de le redemander sur l'ecran de changement de mot de passe obligatoire.
// Necessaire car la navigation directe avec un router-state se perd dans la cascade
// de redirections (AuthLayout -> /dashboard -> RequireAuth -> /change-password-required).
let tempPassword: string | undefined;

export function setTempPassword(password: string) {
  tempPassword = password;
}

export function getTempPassword(): string | undefined {
  return tempPassword;
}
