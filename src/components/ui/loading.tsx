import { Loader, LoaderCircle, LoaderPinwheel } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconLoader3 } from '@tabler/icons-react';

interface LoadingProps {
  text?: string;
  className?: string;
  iconClassName?: string;
}

const Loading = ({ 
  text = "Please Wait..", 
  className = "",
  iconClassName = "" 
}: LoadingProps) => {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-1 text-base", className)}>
      <IconLoader3 className={cn("h-10 w-10 animate-spin text-freshleaf", iconClassName)} />
      <p className=" text-neutral-500">{text}</p>
    </div>
  );
};

export default Loading; 