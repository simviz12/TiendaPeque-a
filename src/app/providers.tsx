"use client";

import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="min-w-0 w-full overflow-x-clip">
        {children}
      </div>
      <Toaster position="top-center" toastOptions={{ duration: 3500 }} />
    </>
  );
}
