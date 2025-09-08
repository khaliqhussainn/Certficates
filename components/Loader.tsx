import React from 'react';
import { cn } from "@/lib/utils";
import { 
  GraduationCap, 
  BookOpen, 
  PlayCircle, 
  Users, 
  Award,
  Zap,
  Target,
  Code,
  Palette,
  Briefcase,
  Database,
  Lightbulb
} from "lucide-react";

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'minimal' | 'pulse' | 'dots' | 'icon-cycle';
  message?: string;
  fullScreen?: boolean;
  className?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  icon?: React.ComponentType<{ className?: string }>;
}

const LoaderComponent: React.FC<LoaderProps> = ({
  size = 'md',
  variant = 'default',
  message,
  fullScreen = false,
  className,
  color = 'primary',
  icon: CustomIcon
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const colorClasses = {
    primary: {
      border: 'border-[#001e62]/20 border-t-[#001e62]',
      bg: 'bg-[#001e62]',
      text: 'text-[#001e62]',
      pulse: 'bg-[#001e62]'
    },
    secondary: {
      border: 'border-gray-300 border-t-gray-600',
      bg: 'bg-gray-600',
      text: 'text-gray-600',
      pulse: 'bg-gray-600'
    },
    success: {
      border: 'border-green-300 border-t-green-600',
      bg: 'bg-green-600',
      text: 'text-green-600',
      pulse: 'bg-green-600'
    },
    warning: {
      border: 'border-yellow-300 border-t-yellow-600',
      bg: 'bg-yellow-600',
      text: 'text-yellow-600',
      pulse: 'bg-yellow-600'
    },
    error: {
      border: 'border-red-300 border-t-red-600',
      bg: 'bg-red-600',
      text: 'text-red-600',
      pulse: 'bg-red-600'
    }
  };

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10'
  };

  const textSize = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const messageSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  };

  const renderLoader = () => {
    switch (variant) {
      case 'minimal':
        return (
          <div className={cn(
            "animate-spin rounded-full border-2",
            sizeClasses[size],
            colorClasses[color].border
          )} />
        );

      case 'pulse':
        return (
          <div className="flex space-x-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  "rounded-full animate-pulse",
                  size === 'sm' ? 'w-2 h-2' : 
                  size === 'md' ? 'w-3 h-3' :
                  size === 'lg' ? 'w-4 h-4' : 'w-5 h-5',
                  colorClasses[color].pulse
                )}
                style={{
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: '0.8s'
                }}
              />
            ))}
          </div>
        );

      case 'dots':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  "rounded-full animate-bounce",
                  size === 'sm' ? 'w-2 h-2' : 
                  size === 'md' ? 'w-3 h-3' :
                  size === 'lg' ? 'w-4 h-4' : 'w-5 h-5',
                  colorClasses[color].pulse
                )}
                style={{
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '0.6s'
                }}
              />
            ))}
          </div>
        );

      case 'icon-cycle':
        const icons = [GraduationCap, BookOpen, PlayCircle, Users, Award, Zap, Target, Code, Palette, Briefcase, Database, Lightbulb];
        const [currentIconIndex, setCurrentIconIndex] = React.useState(0);
        
        React.useEffect(() => {
          const interval = setInterval(() => {
            setCurrentIconIndex((prev) => (prev + 1) % icons.length);
          }, 500);
          return () => clearInterval(interval);
        }, []);

        const IconComponent = icons[currentIconIndex];
        
        return (
          <div className="relative">
            <div className={cn(
              "animate-spin rounded-full border-4",
              sizeClasses[size],
              colorClasses[color].border
            )} />
            <IconComponent className={cn(
              "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse",
              iconSize[size],
              colorClasses[color].text
            )} />
          </div>
        );

      case 'default':
      default:
        const DefaultIcon = CustomIcon || GraduationCap;
        return (
          <div className="relative">
            <div className={cn(
              "animate-spin rounded-full border-4",
              sizeClasses[size],
              colorClasses[color].border
            )} />
            <DefaultIcon className={cn(
              "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
              iconSize[size],
              colorClasses[color].text
            )} />
          </div>
        );
    }
  };

  const containerClasses = cn(
    "flex items-center justify-center",
    fullScreen && "min-h-screen bg-gradient-to-br from-[#001e62]/5 to-blue-50",
    !fullScreen && "p-4",
    className
  );

  const contentClasses = cn(
    "text-center",
    fullScreen && "max-w-md mx-auto"
  );

  return (
    <div className={containerClasses}>
      <div className={contentClasses}>
        <div className="flex justify-center mb-4">
          {renderLoader()}
        </div>
        
        {message && (
          <p className={cn(
            "font-medium animate-pulse",
            messageSizes[size],
            colorClasses[color].text
          )}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

// Pre-configured loader variants for common use cases
export const PageLoader: React.FC<Omit<LoaderProps, 'fullScreen' | 'size' | 'variant'>> = (props) => (
  <LoaderComponent 
    {...props} 
    fullScreen={true} 
    size="lg" 
    variant="default" 
    message={props.message || "Loading your learning journey..."}
  />
);

export const ButtonLoader: React.FC<Omit<LoaderProps, 'size' | 'variant' | 'fullScreen'>> = (props) => (
  <LoaderComponent 
    {...props} 
    size="sm" 
    variant="minimal" 
    fullScreen={false}
  />
);

export const CardLoader: React.FC<Omit<LoaderProps, 'size' | 'fullScreen'>> = (props) => (
  <LoaderComponent 
    {...props} 
    size="md" 
    fullScreen={false}
    message={props.message || "Loading..."}
  />
);

export const InlineLoader: React.FC<Omit<LoaderProps, 'fullScreen' | 'size'>> = (props) => (
  <LoaderComponent 
    {...props} 
    size="sm" 
    fullScreen={false}
  />
);

export default LoaderComponent;