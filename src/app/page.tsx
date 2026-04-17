"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

type AuthMode = "login" | "signup-parent"

export default function Home() {
  const [mode, setMode] = useState<AuthMode>("login")
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (mode === "login") {
        // Login - can use email (parent) or username (child)
        const login = email || username
        const result = await signIn("credentials", {
          login,
          password,
          redirect: false,
        })

        if (result?.error) {
          setError("Invalid credentials")
        } else {
          router.push("/dashboard")
        }
      } else {
        // Parent signup
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            accountType: "parent",
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          setError(data.error || "Failed to create account")
        } else {
          // Auto login after register
          const result = await signIn("credentials", {
            login: email,
            password,
            redirect: false,
          })

          if (result?.error) {
            setError("Account created but could not log in automatically")
          } else {
            router.push("/dashboard")
          }
        }
      }
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const isLogin = mode === "login"

  return (
    <main className="flex-1 flex items-center justify-center p-4">
      <div className="bg-cream rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-coral rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
            </svg>
          </div>
          <h1 className="text-2xl font-display text-gray-900">Book Tracker</h1>
          <p className="text-gray-600 mt-2">Track the books you&apos;re reading</p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setMode("login"); setError("") }}
            className={`flex-1 py-3 rounded-2xl font-bold transition-colors ${
              isLogin ? "bg-coral text-white" : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            Log In
          </button>
          <button
            onClick={() => { setMode("signup-parent"); setError("") }}
            className={`flex-1 py-3 rounded-2xl font-bold transition-colors ${
              mode === "signup-parent" ? "bg-coral text-white" : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            Parent Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup-parent" ? (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-coral focus:border-coral bg-white"
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Email or Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-coral focus:border-coral bg-white"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-coral focus:border-coral bg-white"
              required
            />
          </div>

          {error && (
            <p className="text-coral text-sm text-center font-bold">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-coral text-white py-3 px-4 rounded-2xl hover:bg-opacity-90 transition-colors font-bold disabled:opacity-50"
          >
            {loading ? "Loading..." : isLogin ? "Log In" : "Sign Up"}
          </button>
        </form>

        {isLogin && (
          <>
            <p className="mt-6 text-center text-gray-600 text-sm">
              Parents: create an account to add your children and track their reading.
            </p>
            <p className="mt-2 text-center">
              <button
                onClick={() => router.push("/forgot-password")}
                className="text-coral hover:underline text-sm font-bold"
              >
                Forgot Password?
              </button>
            </p>
          </>
        )}
      </div>
    </main>
  )
}