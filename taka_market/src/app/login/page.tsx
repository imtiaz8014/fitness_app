"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setError("");
    setLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      router.push("/dashboard");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Google sign-in failed");
    }
    setLoading(false);
  }

  return (
    <div className="max-w-md mx-auto mt-16">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
        <Link href="/" className="block text-center mb-6">
          <span className="text-2xl font-bold text-green-400">TAKA</span>
        </Link>
        <h1 className="text-2xl font-bold text-center mb-6">Welcome Back</h1>
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-700 text-black font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
        >
          {loading ? "Signing in..." : "Continue with Google"}
        </button>
        <p className="text-center text-gray-500 mt-6 text-sm">
          Sign in with your Google account to get started
        </p>
      </div>
    </div>
  );
}
