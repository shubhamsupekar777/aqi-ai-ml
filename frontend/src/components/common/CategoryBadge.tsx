import React from 'react';
import { AQICategory } from '../../types/aqi';
import { getCategoryDefinition } from '../../lib/aqi';

interface CategoryBadgeProps {
  category: AQICategory;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  category,
  size = 'md',
  showDot = true,
  className = '',
}) => {
  const catDef = getCategoryDefinition(0);
  const def = category ? (getCategoryDefinition(
    category === 'Good' ? 25 :
    category === 'Moderate' ? 75 :
    category === 'Unhealthy for Sensitive Groups' ? 125 :
    category === 'Unhealthy' ? 175 :
    category === 'Very Unhealthy' ? 250 : 350
  )) : catDef;

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3.5 py-1.5 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium border ${def.bgColor} ${def.borderColor} ${def.textColor} ${sizeStyles[size]} ${className}`}
    >
      {showDot && (
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: def.color }}
        />
      )}
      <span>{category}</span>
    </span>
  );
};
