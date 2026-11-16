import type { TFunction } from 'i18next';
import type { MatchReason } from '../../api-s/requests/MatchingRequest';

/** Raisons d'un score en phrases courtes : tutoiement pour l'étudiant, vouvoiement pour l'équipe. */
export function reasonTexts(reasons: MatchReason[], audience: 'student' | 'staff', t: TFunction): string[] {
    return reasons.map((r) => {
        const list = r.values.join(', ');
        switch (r.type) {
            case 'FORMATION':
                return audience === 'student'
                    ? t('matching.reason.formation_student', 'proche de ta formation ({{list}})', { list })
                    : t('matching.reason.formation_staff', 'proche de sa formation ({{list}})', { list });
            case 'CONTRACT':
                return t('matching.reason.contract', 'en {{label}}', { label: (r.values[0] ?? '').toLowerCase() });
            case 'LEVEL':
                return t('matching.reason.level', 'niveau {{level}} demandé', { level: r.values[0] ?? '' });
            case 'NEAR':
                return audience === 'student'
                    ? t('matching.reason.near_student', 'près de chez toi ({{name}})', { name: r.values[1] || r.values[0] })
                    : t('matching.reason.near_staff', 'dans son département ({{name}})', { name: r.values[1] || r.values[0] });
            case 'IDF':
                return t('matching.reason.idf', 'en Île-de-France');
            case 'REMOTE':
                return t('matching.reason.remote', 'télétravail possible');
            case 'CV':
                return audience === 'student'
                    ? t('matching.reason.cv_student', 'ton CV mentionne {{list}}', { list })
                    : t('matching.reason.cv_staff', 'son CV mentionne {{list}}', { list });
            default:
                return '';
        }
    }).filter(Boolean);
}
