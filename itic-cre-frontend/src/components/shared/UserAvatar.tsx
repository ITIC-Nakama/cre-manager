import { useState, useEffect } from 'react';

interface UserAvatarProps {
  profilePicture?: string | null;
  firstName: string;
  lastName: string;
  className?: string;
  onClick?: () => void;
}

export default function UserAvatar({ profilePicture, firstName, lastName, className = 'h-9 w-9', onClick }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();

  useEffect(() => {
    setImgError(false);
  }, [profilePicture]);

  if (profilePicture && !imgError) {
    return (
      <img
        onClick={onClick}
        src={profilePicture}
        alt={`${firstName} ${lastName}`}
        onError={() => setImgError(true)}
        className={`${className} cursor-pointer rounded-full object-cover shrink-0`}
      />
    );
  }

  return (
    <div onClick={onClick} className={`${className} cursor-pointer rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold shrink-0`}>
      {initials}
    </div>
  );
}
