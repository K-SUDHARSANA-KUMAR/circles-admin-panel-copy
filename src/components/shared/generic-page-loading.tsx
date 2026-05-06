import Loading from '@/components/ui/loading';
import SpringBoard from '@/components/shared/spring-board';

interface GenericPageLoadingProps {
  title?: string;
  loadingText?: string;
  showSpringBoard?: boolean;
  inline?: boolean;
  className?: string;
}

export default function GenericPageLoading({ 
  title, 
  loadingText = "Loading...", 
  showSpringBoard = true,
  inline = false,
  className = ""
}: GenericPageLoadingProps) {
  if (inline) {
    return (
      <div className={`flex h-64 items-center justify-center ${className}`}>
        <Loading text={loadingText} />
      </div>
    );
  }

  return (
    <section className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-xl font-medium">{title}</div>
        {showSpringBoard && <SpringBoard />}
      </div>
      <div className="w-full rounded-lg bg-white p-4">
        <div className="h-64 flex items-center justify-center">
          <Loading text={loadingText} />
        </div>
      </div>
    </section>
  );
}
