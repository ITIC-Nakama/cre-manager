import type { LoginDTO, RegisterDTO, OtpSendDTO, OtpValidateDTO, ResetPasswordDTO, ChangePasswordDTO } from "../../types/models/Auth";
import { apiClient, resetSessionState } from '../AxiosApiClient';

// Connexion — les tokens sont posés en cookies HttpOnly par le serveur
export function AuthRequest(login: LoginDTO) {
    resetSessionState();
    return apiClient.post('/auth/login', login)
        .then(response => {
            const payload = response.data.data ?? response.data;
            return payload;
        })
        .catch(error => {
            console.error('Échec de la connexion :', error);
            throw error;
        });
}

// Inscription étudiant
export function RegisterRequest(registerData: RegisterDTO) {
    return apiClient.post('/auth/register', registerData)
        .then(response => response.data)
        .catch(error => {
            console.error('Échec de l\'inscription :', error);
            throw error;
        });
}

// Envoyer un code OTP par email (vérification ou réinitialisation de mot de passe)
export function SendOtpRequest(otpData: OtpSendDTO) {
    return apiClient.post('/auth/otp/send', otpData)
        .then(response => response.data)
        .catch(error => {
            console.error('Échec de l\'envoi OTP :', error);
            throw error;
        });
}

// Valider le code OTP reçu par email
export function ValidateOtpRequest(otpData: OtpValidateDTO) {
    return apiClient.post('/auth/otp/validate', otpData)
        .then(response => response.data)
        .catch(error => {
            console.error('Échec de la validation OTP :', error);
            throw error;
        });
}

// Renouveler le token d'accès — le cookie refreshToken est envoyé automatiquement
export function RefreshTokenRequest() {
    return apiClient.post('/auth/refresh-token', {})
        .then(response => response.data)
        .catch(error => {
            console.error('Échec du refresh token :', error);
            throw error;
        });
}

// Demande de réinitialisation de mot de passe (envoi du code OTP)
export function ResetPasswordRequest(email: string) {
    return SendOtpRequest({ email })
        .catch(error => {
            console.error('Échec de la demande de réinitialisation :', error);
            throw error;
        });
}

// Confirmation de réinitialisation (validation OTP + nouveau mot de passe)
export function ResetPasswordConfirmRequest(resetData: ResetPasswordDTO) {
    return apiClient.post('/auth/reset-password', resetData)
        .then(response => response.data)
        .catch(error => {
            console.error('Échec de la réinitialisation du mot de passe :', error);
            throw error;
        });
}

// Déconnexion — demande au serveur de supprimer les cookies HttpOnly
export function LogoutRequest() {
    return apiClient.post('/auth/logout', {})
        .catch(error => {
            console.error('Échec de la déconnexion :', error);
            throw error;
        });
}

// Mettre à jour le mot de passe (utilisateur connecté)
export function UpdatePasswordRequest(data: ChangePasswordDTO) {
    return apiClient.post('/auth/update-password', data)
        .then(response => response.data)
        .catch(error => {
            console.error('Échec de la mise à jour du mot de passe :', error);
            throw error;
        });
}

// Changement de mot de passe obligatoire (mot de passe temporaire — mustChangePassword)
export function ChangePasswordRequest(data: ChangePasswordDTO) {
    return apiClient.post('/auth/change-password', data)
        .then(response => {
            const payload = response.data.data ?? response.data;
            return payload;
        })
        .catch(error => {
            console.error('Échec du changement de mot de passe :', error);
            throw error;
        });
}

export interface UpdateProfileData {
    firstName: string;
    lastName: string;
    jobTitle?: string;
}

// Mettre à jour le profil de l'utilisateur connecté (nom, prénom, fonction)
export function UpdateProfileRequest(data: UpdateProfileData) {
    return apiClient.put('/auth/users/me', data)
        .then(response => {
            const payload = response.data.data ?? response.data;
            return payload;
        })
        .catch(error => {
            console.error('Échec de la mise à jour du profil :', error);
            throw error;
        });
}

// Mettre à jour la photo de profil de l'utilisateur connecté
export function UploadProfilePictureRequest(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/auth/users/me/profile-picture', formData)
        .then(response => {
            const payload = response.data.data ?? response.data;
            return payload as { profilePictureUrl: string };
        })
        .catch(error => {
            console.error('Échec de la mise à jour de la photo de profil :', error);
            throw error;
        });
}
