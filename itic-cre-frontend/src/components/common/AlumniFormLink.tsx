import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const ALUMNI_FORM_PATH = '/alumni';

interface Props {
  className?: string;
  labelClassName?: string;
  /** Masque le texte (menu replie) ; le libelle reste en title/aria-label. */
  iconOnly?: boolean;
  /** Ouvre dans un nouvel onglet, pour ne pas quitter la plateforme en cours d'usage. */
  newTab?: boolean;
  onClick?: () => void;
}

/** Point d'entree unique vers le formulaire public alumni, utilise depuis la page de connexion et depuis la plateforme. */
export default function AlumniFormLink({ className, labelClassName, iconOnly = false, newTab = false, onClick }: Props) {
  const { t } = useTranslation();
  const label = t('alumni.link_label', 'Formulaire alumni');

  return (
    <Link
      to={ALUMNI_FORM_PATH}
      target={newTab ? '_blank' : undefined}
      rel={newTab ? 'noopener noreferrer' : undefined}
      onClick={onClick}
      title={label}
      aria-label={label}
      className={className}
    >
      <GraduationCap className="h-3.5 w-3.5 shrink-0" />
      {!iconOnly && <span className={labelClassName}>{label}</span>}
    </Link>
  );
}
