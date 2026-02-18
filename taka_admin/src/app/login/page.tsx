"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Auth failed");
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setError("");
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      router.push("/");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Google sign-in failed");
    }
  }

  return (
    <div className="max-w-md mx-auto mt-16">
      <h1 className="text-3xl font-bold text-center mb-2">TAKA Admin</h1>
      <p className="text-center text-gray-500 mb-8">Sign in with your admin account</p>
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 mb-4 text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-green-500 focus:outline-none"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-green-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-700 text-black font-bold py-3 rounded-lg transition"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
      <div className="my-6 flex items-center gap-4">
        <div className="flex-1 h-px bg-gray-800" />
        <span className="text-gray-500 text-sm">or</span>
        <div className="flex-1 h-px bg-gray-800" />
      </div>
      <button
        onClick={handleGoogle}
        className="w-full border border-gray-700 hover:border-gray-500 py-3 rounded-lg transition flex items-center justify-center gap-2"
      >
        Continue with Google
      </button>
    </div>
  );
}
