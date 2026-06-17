"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const supabase = createClient();
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm text-red-600 hover:bg-red-50"
    >
      <LogOut className="size-5 shrink-0" />
      Sair
    </button>
  );
}
