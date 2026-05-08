import { FormEvent, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) {
      setIsCheckingSession(false);
      return;
    }
    const client = supabase;

    const bootstrap = async () => {
      const { data, error: sessionError } = await client.auth.getSession();
      if (sessionError) {
        setError(sessionError.message);
      } else {
        setUserEmail(data.session?.user.email ?? null);
      }
      setIsCheckingSession(false);
    };

    bootstrap();

    const {
      data: { subscription }
    } = client.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void signInWithEmail();
  };

  const signInWithEmail = async () => {
    if (!supabase) {
      setError("Supabase is not configured. Add env values and restart dev server.");
      return;
    }

    setMessage("");
    setError("");
    setIsSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      setError(signInError.message);
    } else {
      setMessage("Login successful.");
      setPassword("");
    }

    setIsSubmitting(false);
  };

  const sendPasswordReset = async () => {
    if (!supabase) {
      setError("Supabase is not configured. Add env values and restart dev server.");
      return;
    }

    if (!email) {
      setError("Enter your email first to receive a reset link.");
      return;
    }

    setMessage("");
    setError("");
    setIsSubmitting(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setMessage("Password reset email sent. Check your inbox.");
    }

    setIsSubmitting(false);
  };

  const logout = async () => {
    if (!supabase) {
      return;
    }

    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
    } else {
      setMessage("You are logged out.");
      setEmail("");
      setPassword("");
    }
  };

  if (isCheckingSession) {
    return (
      <main className="page">
        <section className="login-card">
          <h1>Login to Partner Dashboard</h1>
          <p className="status">Checking your session...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="login-card">
        <h1>Login to Partner Dashboard</h1>
        {!isSupabaseConfigured && (
          <p className="error">
            Missing Supabase config. Add `VITE_SUPABASE_URL` and
            `VITE_SUPABASE_ANON_KEY` in `.env`.
          </p>
        )}

        {userEmail ? (
          <div className="logged-in">
            <p className="success">Logged in as {userEmail}</p>
            <button type="button" onClick={logout}>
              Logout
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email"
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              minLength={6}
              required
            />

            <button
              type="button"
              className="forgot"
              onClick={sendPasswordReset}
              disabled={isSubmitting}
            >
              Forgot password?
            </button>

            <button type="submit" disabled={isSubmitting || !isSupabaseConfigured}>
              {isSubmitting ? "Please wait..." : "Login"}
            </button>
          </form>
        )}
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
      </section>
    </main>
  );
}
