import React from 'react';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface NavigationButtonProps {
  href: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

/**
 * A navigation button that works consistently across the application
 * by using a direct browser navigation approach.
 */
const NavigationButton = ({
  href,
  icon: Icon,
  children,
  className = '',
  variant = 'outline',
  size = 'default'
}: NavigationButtonProps) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Force a hard navigation to avoid any routing issues
    window.location.href = href;
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={`flex items-center gap-2 ${className}`}
      onClick={handleClick}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </Button>
  );
};

export default NavigationButton;