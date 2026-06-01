import { Toaster } from "@/components/ui/sonner";

const GenericProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          classNames: {
            toast: 'group toast !bg-[#09090b] !text-zinc-100 !border-[#18181b] !rounded-xl !shadow-2xl !font-sans !px-4 !py-3.5 !text-xs flex items-center gap-2.5 border',
            error: '!text-rose-400 !bg-rose-950/20 !border-rose-500/20',
            success: '!text-emerald-400 !bg-emerald-950/20 !border-emerald-500/20',
            warning: '!text-amber-400 !bg-amber-950/20 !border-amber-500/20',
            info: '!text-[#d8b4fe] !bg-[#1c122c]/60 !border-[#3b1a60]/50',
          },
        }}
      />
      {children}
    </>
  );
};

export default GenericProvider;
