interface UserAvatarProps {
  profilePicture?: string | null;
  firstName: string;
  lastName: string;
  className?: string;
}

export default function UserAvatar({ profilePicture, firstName, lastName, className = 'h-9 w-9' }: UserAvatarProps) {
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();

  if (profilePicture) {
    return (
      <img
        src={profilePicture}
        alt={`${firstName} ${lastName}`}
        className={`${className} rounded-full object-cover shrink-0`}
      />
    );
  }

  return (
    <div className={`${className} rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold shrink-0`}>
      {initials}
    </div>
  );
}
