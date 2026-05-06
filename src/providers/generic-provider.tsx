import { Toaster } from "@/components/ui/sonner";

const GenericProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          classNames: {
            toast: '!font-poppins',
            error: '!text-red-700 !border-red-100',
            success: '!text-emerald-600 !border-emerald-200',
            warning: '!text-yellow-700 !border-yellow-100',
            info: '!text-sky-700 !border-sky-100',
          },
        }}
      />
      {children}
    </>
  );
};

export default GenericProvider;
