import { useEffect, useRef } from 'react';

/**
 * Remonte en haut du conteneur de scroll (<main>, cf useResetScrollOnNavigate) quand `dep`
 * change - utile pour les tabs en page (changement d'onglet != navigation de route, donc le
 * reset de scroll sur pathname ne se declenche pas).
 */
export function useScrollTopOnChange<T>(dep: T) {
    const isFirst = useRef(true);

    useEffect(() => {
        if (isFirst.current) {
            isFirst.current = false;
            return;
        }
        document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [dep]);
}
