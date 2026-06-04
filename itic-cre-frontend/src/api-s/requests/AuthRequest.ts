import type { LoginDTO, RegisterDTO, OtpSendDTO, OtpValidateDTO, ResetPasswordDTO, ChangePasswordDTO } from "../../types/models/Auth";
import { apiClient } from '../AxiosApiClient';

// Authenticate user — tokens are set as HttpOnly cookies by the server
export function AuthRequest(login: LoginDTO) {
    return apiClient.post('/auth/login', login)
        .then(response => {
            // Response body only contains { user: {...} }
            // Tokens are in HttpOnly cookies — inaccessible to JS
            const payload = response.data.data ?? response.data;
            return payload;
        })
        .catch(error => {
            console.error('Login failed:', error);
            throw error;
        });
}

// Create a new user account
export function RegisterRequest(registerData: RegisterDTO) {
    return apiClient.post('/auth/register', registerData)
        .then(response => {
            return response.data;
        })
        .catch(error => {
            console.error('Registration failed:', error);
            throw error;
        });
}

// Send an OTP code to user's email for verification or password reset
export function SendOtpRequest(otpData: OtpSendDTO) {
    return apiClient.post('/auth/otp/send', otpData)
        .then(response => {
            return response.data;
        })
        .catch(error => {
            console.error('Sending OTP failed:', error);
            throw error;
        });
}

// Validate the email OTP code
export function ValidateOtpRequest(otpData: OtpValidateDTO) {
    return apiClient.post('/auth/otp/validate', otpData)
        .then(response => {
            return response.data;
        })
        .catch(error => {
            console.error('OTP validation failed:', error);
            throw error;
        });
}

// Refresh the access token — no body needed, the browser sends the refreshToken cookie automatically
export function RefreshTokenRequest() {
    return apiClient.post('/auth/refresh-token', {})
        .then(response => {
            return response.data;
        })
        .catch(error => {
            console.error('Token refresh failed:', error);
            throw error;
        });
}

// Reset password request (sends verification code to the email)
export function ResetPasswordRequest(email: string) {
    return SendOtpRequest({ email })
        .catch(error => {
            console.error('Reset password request failed:', error);
            throw error;
        });
}

// Reset password confirmation (validates OTP and sets the new password)
export function ResetPasswordConfirmRequest(resetData: ResetPasswordDTO) {
    return apiClient.post('/auth/reset-password', resetData)
        .then(response => {
            return response.data;
        })
        .catch(error => {
            console.error('Reset password confirmation failed:', error);
            throw error;
        });
}

// Logout — asks the server to clear the HttpOnly cookies
export function LogoutRequest() {
    return apiClient.post('/auth/logout', {})
        .catch(error => {
            console.error('Logout failed:', error);
            throw error;
        });
}

// Update password (when logged in)
export function UpdatePasswordRequest(data: ChangePasswordDTO) {
    return apiClient.post('/auth/update-password', data)
        .then(response => {
            return response.data;
        })
        .catch(error => {
            console.error('Password update failed:', error);
            throw error;
        });
}

