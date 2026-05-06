import { cn } from '@/lib/utils';
import { IconDog } from '@tabler/icons-react';

interface EmptyStateProps {
  text?: string;
  className?: string;
  iconClassName?: string;
  description?: string;
}

const EmptyState = ({
  text = 'Wow! Such empty.',
  className = '',
  iconClassName = '',
  description = '',
}: EmptyStateProps) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-1',
        className
      )}
    >
      <IconDog className={cn('h-15 w-15 text-neutral-400', iconClassName)} />
      <div className="gap- flex flex-col items-center justify-center">
        <p className="text-center text-base text-neutral-400">{text}</p>
        {description && (
          <p className="text-center text-[12px] text-neutral-400">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
