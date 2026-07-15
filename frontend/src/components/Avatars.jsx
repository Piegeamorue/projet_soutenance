import avatarHomme from '../assets/avatars/avatar-homme.jpg'
import avatarFemme from '../assets/avatars/avatar-femme.jpg'
import { getPhotoUrl } from '../utils/profilePhoto'

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
}

const getDefaultAvatar = (gender) => {
  const g = gender?.toLowerCase()
  if (g === 'femme' || g === 'f') return avatarFemme
  return avatarHomme
}

function Avatars({ user, size = 'md', className = '' }) {
  const defaultAvatar = getDefaultAvatar(user?.gender)
  const src = getPhotoUrl(user?.photo) || defaultAvatar

  return (
    <img
      src={src}
      alt={user?.full_name || 'Profil'}
      className={`${sizeClasses[size] || sizeClasses.md} rounded-full object-cover ${className}`}
      onError={(e) => {
        e.target.src = defaultAvatar
      }}
    />
  )
}

export default Avatars
