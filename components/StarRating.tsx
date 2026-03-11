import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number | any; // Allow Decimal types
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StarRating({ rating, size = 'md', className = '' }: StarRatingProps) {
  const sizeMap = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  // Convert Decimal or other types to number
  const numRating = typeof rating === 'number' ? rating : parseFloat(String(rating || 0));
  const numStars = Math.round(numRating);
  const stars = Array.from({ length: 5 }, (_, i) => i < numStars);

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {stars.map((filled, i) => (
        <Star
          key={i}
          className={`${sizeMap[size]} ${
            filled
              ? 'fill-amber-400 text-amber-400'
              : 'text-slate-300 dark:text-slate-600'
          }`}
        />
      ))}
      <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">
        {numRating.toFixed(1)}
      </span>
    </div>
  );
}
