import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface UserAvatarProps {
  profilePicture?: string | null;
  firstName: string;
  lastName: string;
  className?: string;
  onClick?: () => void;
  enlargeOnClick?: boolean;
}

export default function UserAvatar({ profilePicture, firstName, lastName, className = 'h-9 w-9', onClick, enlargeOnClick = false }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
  const fullName = `${firstName} ${lastName}`;

  useEffect(() => {
    setImgError(false);
  }, [profilePicture]);

  const hasImage = !!profilePicture && !imgError;
  const canEnlarge = enlargeOnClick && !onClick && hasImage;

  const handleClick = onClick
    ? onClick
    : enlargeOnClick
      ? (e: React.MouseEvent) => {
          e.stopPropagation();
          if (hasImage) setShowLightbox(true);
        }
      : undefined;

  const avatar = profilePicture && !imgError
    ? (
      <img
        onClick={handleClick}
        src={profilePicture}
        alt={fullName}
        onError={() => setImgError(true)}
        className={`${className} cursor-pointer rounded-full object-cover shrink-0`}
      />
    )
    : (
      <div onClick={handleClick} className={`${className} cursor-pointer rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold shrink-0`}>
        {initials}
      </div>
    );

  if (!canEnlarge) return avatar;

  return (
    <>
      {avatar}
      {showLightbox && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 animate-fadeIn"
          onClick={() => setShowLightbox(false)}
        >
          <button
            onClick={() => setShowLightbox(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={profilePicture}
            alt={fullName}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-[85vw] rounded-2xl object-contain shadow-2xl"
          />
        </div>,
        document.body
      )}
    </>
  );
}
