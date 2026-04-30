import LeftPanel from "@/components/navigation/LeftPanel";
import { ReactNode } from "react";

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-200">
      <LeftPanel />

      <main className="flex-1 p-6 overflow-y-auto bg-gray-50 rounded-lg m-2">
        {children}
      </main>
    </div>
  );
}
