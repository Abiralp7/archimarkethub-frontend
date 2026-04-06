import { Check } from 'lucide-react';

interface CompanyLogoBadgeProps {
  logoUrl?: string;
  name?: string;
  hasBadge?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function CompanyLogoBadge({
  logoUrl,
  name,
  hasBadge,
  size = 'md',
  className = '',
}: CompanyLogoBadgeProps) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-32 h-32',
    lg: 'w-48 h-48',
  };

  const badgeSizeClasses = {
    sm: 'w-5 h-5 -bottom-1 -right-1',
    md: 'w-8 h-8 -bottom-2 -right-2',
    lg: 'w-10 h-10 -bottom-3 -right-3',
  };

  const badgeIconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className={`relative inline-block ${sizeClasses[size]} ${className}`}>
      <div className="w-full h-full rounded-xl bg-surface-container-low border-2 border-dashed border-outline-variant flex items-center justify-center overflow-hidden">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={name || 'company logo'}
            className="w-full h-full object-cover opacity-80"
          />
        ) : (
          <div className="text-slate-400 text-lg font-semibold">
            {name?.charAt(0)?.toUpperCase() || 'Logo'}
          </div>
        )}
      </div>

      {/* Blue Tick Badge */}
      {hasBadge && (
        <div className={`absolute ${badgeSizeClasses[size]} bg-blue-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white`}>
          <Check className={`${badgeIconSizeClasses[size]} text-white`} strokeWidth={3} />
        </div>
      )}
    </div>
  );
}
