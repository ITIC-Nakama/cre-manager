import { useMutation, useQuery } from '@tanstack/react-query';
import {
    AuthRequest,
    RegisterRequest,
    SendOtpRequest,
    ValidateOtpRequest,
    ResetPasswordRequest,
    ResetPasswordConfirmRequest,
    UpdatePasswordRequest,
    ChangePasswordRequest,
    MyProfileRequest,
    UpdateProfileRequest,
    UploadProfilePictureRequest,
    ConfirmEmailChangeRequest,
    CancelEmailChangeRequest,
    ResendEmailChangeOtpRequest
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

export const useResetPassword = () => {
    return useMutation({ mutationFn: ResetPasswordRequest });
};

export const useResetPasswordConfirm = () => {
    return useMutation({ mutationFn: ResetPasswordConfirmRequest });
};

export const useUpdatePassword = () => {
    return useMutation({ mutationFn: UpdatePasswordRequest });
};

export const useChangePassword = () => {
    return useMutation({ mutationFn: ChangePasswordRequest });
};

// Profil frais, lu directement en base — le store Zustand peut etre desynchronise par un
// changement fait ailleurs (ex : numero de telephone renseigne via une reclamation).
export const useMyProfile = () => {
    return useQuery({ queryKey: ['my-profile'], queryFn: MyProfileRequest, staleTime: 0 });
};

export const useUpdateProfile = () => {
    return useMutation({ mutationFn: UpdateProfileRequest });
};

export const useUploadProfilePicture = () => {
    return useMutation({ mutationFn: UploadProfilePictureRequest });
};

export const useConfirmEmailChange = () => {
    return useMutation({ mutationFn: ConfirmEmailChangeRequest });
};

export const useCancelEmailChange = () => {
    return useMutation({ mutationFn: CancelEmailChangeRequest });
};

export const useResendEmailChangeOtp = () => {
    return useMutation({ mutationFn: ResendEmailChangeOtpRequest });
};