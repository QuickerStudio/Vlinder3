/**
 * @fileoverview Square Button Component - for displaying vertical text
 * Supports icons, multi-line text, tooltip and various style variants
 */

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const squareButtonVariants = cva(
  'inline-flex flex-col items-center justify-center whitespace-nowrap rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primary !text-primary-foreground border border-primary shadow hover:bg-primary/80',
        destructive:
          'bg-destructive !text-destructive-foreground border-destructive shadow-sm hover:bg-destructive/80',
        outline:
          'border border-input bg-background shadow-sm hover:bg-accent/80 hover:text-accent-foreground/80',
        secondary:
          'bg-secondary !text-secondary-foreground border-secondary shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'w-12 h-12 p-2',
        sm: 'w-10 h-10 p-1.5 text-[10px]',
        lg: 'w-14 h-14 p-2.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface SquareButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof squareButtonVariants> {
  asChild?: boolean;
  icon?: React.ReactNode;
  tooltip?: string;
  lines?: string[]; // Support multi-line text
}

const SquareButton = React.forwardRef<HTMLButtonElement, SquareButtonProps>(
  ({ className, variant, size, asChild = false, icon, tooltip, lines, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    
    const buttonContent = (
      <Comp
        className={cn(squareButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {icon && <span className='flex-shrink-0 mb-1'>{icon}</span>}
        {lines ? (
          <div className='flex flex-col items-center justify-center gap-0.5 leading-tight'>
            {lines.map((line, index) => (
              <span key={index} className='block'>
                {line}
              </span>
            ))}
          </div>
        ) : (
          children
        )}
      </Comp>
    );

    if (tooltip) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {buttonContent}
            </TooltipTrigger>
            <TooltipContent>
              <p>{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return buttonContent;
  }
);
SquareButton.displayName = 'SquareButton';

export { SquareButton, squareButtonVariants };

