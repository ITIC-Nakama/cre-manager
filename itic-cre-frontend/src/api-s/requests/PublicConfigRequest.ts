import { apiClient } from '../AxiosApiClient';
import { unwrap } from '../unwrap';

/** Interrupteurs publics du serveur (GET /public/config, sans connexion), lot 10. */
export interface PublicConfig {
    companySpaceEnabled: boolean;
}

export const fetchPublicConfig = () => apiClient.get('/public/config').then((r) => unwrap<PublicConfig>(r));
