import GenericError from '@/components/ui/generic-error';
import SpringBoard from '@/components/shared/spring-board';

interface GenericPageErrorProps {
  title?: string;
  errorText?: string;
  showSpringBoard?: boolean;
  inline?: boolean;
  className?: string;
}

export default function GenericPageError({
  title,
  errorText = 'An error occurred. Please try again.',
  showSpringBoard = true,
  inline = false,
  className = '',
}: GenericPageErrorProps) {
  if (inline) {
    return (
      <div className={`flex h-64 items-center justify-center ${className}`}>
        <GenericError text={errorText} />
      </div>
    );
  }

  return (
    <section className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-xl font-medium">{title || ''}</div>
        {showSpringBoard && <SpringBoard />}
      </div>
      <div className="w-full rounded-lg bg-white p-4">
        <div className="flex h-64 items-center justify-center">
          <GenericError text={errorText} />
        </div>
      </div>
    </section>
  );
}
