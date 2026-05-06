import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconMoodSadSquint } from '@tabler/icons-react';

interface GenericErrorProps {
  text?: string;
  className?: string;
  iconClassName?: string;
}

const GenericError = ({ 
  text = "Something went wrong. Please try again.", 
  className = "",
  iconClassName = "" 
}: GenericErrorProps) => {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-1", className)}>
      <IconMoodSadSquint className={cn("h-15 w-15 text-neutral-400", iconClassName)} />
      <p className="text-base text-neutral-400 text-center">{text}</p>
    </div>
  );
};

export default GenericError;
