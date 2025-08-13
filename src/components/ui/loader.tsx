import React from 'react';
import { cn } from '@/lib/utils';

export interface LoaderProps {
  message?: string;
  variant?: 'fullscreen' | 'inline';
  className?: string;
}

const Loader: React.FC<LoaderProps> = ({ 
  message = 'Loading...', 
  variant = 'fullscreen',
  className 
}) => {
  const baseClasses = variant === 'fullscreen' 
    ? 'min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900'
    : 'relative p-8';

  return (
    <div className={cn(baseClasses, className)}>
      {/* Animated Background Elements - Only for fullscreen */}
      {variant === 'fullscreen' && (
        <>
          {/* Floating Orbs */}
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
            <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-500" />
          </div>
          
          {/* Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/30 to-transparent" />
        </>
      )}

      {/* Loader Content */}
      <div className={cn(
        'flex flex-col items-center justify-center',
        variant === 'fullscreen' ? 'min-h-screen relative z-10' : 'py-12'
      )}>
        {/* Glass-morphism Container */}
        <div className="glass-card-dark p-8 rounded-2xl backdrop-blur-xl border border-white/10 shadow-2xl">
          {/* Dual-Ring Spinner */}
          <div className="relative w-16 h-16 mx-auto mb-6">
            {/* Outer Ring */}
            <div className="absolute inset-0 border-4 border-white/20 rounded-full animate-spin">
              <div className="absolute top-0 left-0 w-4 h-4 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full transform -translate-x-2 -translate-y-2" />
            </div>
            
            {/* Inner Ring */}
            <div className="absolute inset-2 border-4 border-white/10 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}>
              <div className="absolute top-0 right-0 w-3 h-3 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full transform translate-x-1.5 -translate-y-1.5" />
            </div>
            
            {/* Center Pulse */}
            <div className="absolute inset-4 bg-gradient-to-br from-purple-400/30 to-blue-400/30 rounded-full animate-pulse" />
          </div>

          {/* Loading Message */}
          <div className="text-center">
            <p className="text-white/90 font-medium text-lg mb-2">{message}</p>
            <div className="flex justify-center space-x-1">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100" />
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Full-screen loader variant
export const FullScreenLoader: React.FC<Omit<LoaderProps, 'variant'>> = (props) => (
  <Loader {...props} variant="fullscreen" />
);

// Inline loader variant
export const InlineLoader: React.FC<Omit<LoaderProps, 'variant'>> = (props) => (
  <Loader {...props} variant="inline" />
);

export default Loader;