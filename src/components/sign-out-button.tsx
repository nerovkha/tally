"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent"
    >
      log out
    </button>
  );
}
