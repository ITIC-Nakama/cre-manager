import { useMutation } from '@tanstack/react-query';
import { 
    AuthRequest, 
    RegisterRequest, 
    SendOtpRequest, 
    ValidateOtpRequest, 
    RefreshTokenRequest, 
    ResetPasswordRequest,
    ResetPasswordConfirmRequest
} from '../api-s/requests/AuthRequest';

export const useLogin = () => {
    return useMutation({ mutationFn: AuthRequest });
};

export const useRegister = () => {
    return useMutation({ mutationFn: RegisterRequest });
};

export const useSendOtp = () => {
    return useMutation({ mutationFn: SendOtpRequest });
};

export const useValidateOtp = () => {
    return useMutation({ mutationFn: ValidateOtpRequest });
};

export const useRefreshToken = () => {
    return useMutation({ mutationFn: RefreshTokenRequest });
};

export const useResetPassword = () => {
    return useMutation({ mutationFn: ResetPasswordRequest });
};

export const useResetPasswordConfirm = () => {
    return useMutation({ mutationFn: ResetPasswordConfirmRequest });
};