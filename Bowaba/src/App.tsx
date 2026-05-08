import { FormEvent, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

type ClientRecord = {
  client_id: string;
  bm_id: string | null;
  bm_name: string | null;
  waba_id: string | null;
  phone_number: string | null;
  current_credit_balance: number | string | null;
  current_automation_triggers_quota_left: number | string | null;
};

const getFriendlyAuthError = (rawMessage: string) => {
  const message = rawMessage.toLowerCase();

  if (message.includes("invalid login credentials")) {
    return "Invalid email or password. Please check your credentials and try again.";
  }

  if (message.includes("email not confirmed")) {
    return "Please confirm your email first, then try logging in again.";
  }

  if (message.includes("too many requests")) {
    return "Too many attempts right now. Please wait a moment and retry.";
  }

  if (message.includes("signup is disabled")) {
    return "Account creation is currently disabled for this project.";
  }

  if (message.includes("user already registered")) {
    return "This email is already registered. Please login instead.";
  }

  return rawMessage;
};

const getFriendlySearchError = (rawMessage: string) => {
  const message = rawMessage.toLowerCase();

  if (message.includes("permission denied")) {
    return "You do not have access to this client record. Please contact an admin.";
  }

  if (message.includes("relation") && message.includes("does not exist")) {
    return "Client table not found. Check VITE_CLIENTS_TABLE and Supabase schema.";
  }

  if (message.includes("failed to fetch")) {
    return "Unable to reach Supabase right now. Please check your network and try again.";
  }

  return rawMessage;
};

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [searchClientId, setSearchClientId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [clientRecord, setClientRecord] = useState<ClientRecord | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const clientsTable = import.meta.env.VITE_CLIENTS_TABLE || "client_accounts";

  useEffect(() => {
    if (!supabase) {
      setIsCheckingSession(false);
      return;
    }
    const client = supabase;

    const bootstrap = async () => {
      const { data, error: sessionError } = await client.auth.getSession();
      if (sessionError) {
        setError(getFriendlyAuthError(sessionError.message));
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
      setError(getFriendlyAuthError(signInError.message));
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
      setError(getFriendlyAuthError(resetError.message));
    } else {
      setMessage("Password reset email sent. Check your inbox.");
    }

    setIsSubmitting(false);
  };

  const createTestAccount = async () => {
    if (!supabase) {
      setError("Supabase is not configured. Add env values and restart dev server.");
      return;
    }

    if (!email || !password) {
      setError("Enter both email and password to create a test account.");
      return;
    }

    setMessage("");
    setError("");
    setIsSubmitting(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password
    });

    if (signUpError) {
      setError(getFriendlyAuthError(signUpError.message));
    } else {
      setMessage("Test account created. You can now login with these credentials.");
    }

    setIsSubmitting(false);
  };

  const logout = async () => {
    if (!supabase) {
      return;
    }

    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(getFriendlyAuthError(signOutError.message));
    } else {
      setMessage("You are logged out.");
      setEmail("");
      setPassword("");
      setSearchClientId("");
      setClientRecord(null);
    }
  };

  const searchClientById = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) {
      setError("Supabase is not configured. Add env values and restart dev server.");
      return;
    }

    if (!/^\d{6}$/.test(searchClientId.trim())) {
      setError("Client ID must be exactly 6 digits.");
      return;
    }

    setMessage("");
    setError("");
    setClientRecord(null);
    setIsSearching(true);

    const { data, error: queryError } = await supabase
      .from(clientsTable)
      .select(
        "client_id,bm_id,bm_name,waba_id,phone_number,current_credit_balance,current_automation_triggers_quota_left"
      )
      .eq("client_id", searchClientId.trim())
      .maybeSingle();

    if (queryError) {
      setError(getFriendlySearchError(queryError.message));
    } else if (!data) {
      setMessage(`No record found for Client ID ${searchClientId.trim()}.`);
    } else {
      setClientRecord(data as ClientRecord);
    }

    setIsSearching(false);
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
          <>
            <div className="logged-in-header">
              <p className="success">Logged in as {userEmail}</p>
              <button type="button" className="secondary logout-btn" onClick={logout}>
                Logout
              </button>
            </div>
            <section className="dashboard">
              <h2>Dashboard</h2>
              <form className="dashboard-form" onSubmit={searchClientById}>
                <label htmlFor="client-id">Search by Client ID</label>
                <input
                  id="client-id"
                  type="text"
                  value={searchClientId}
                  onChange={(event) =>
                    setSearchClientId(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="Enter 6 digit Client ID"
                  inputMode="numeric"
                  pattern="\d{6}"
                  required
                />
                <button type="submit" disabled={isSearching}>
                  {isSearching ? "Searching..." : "Search client"}
                </button>
              </form>

              {clientRecord && (
                <div className="result-card">
                  <h3>Client Details</h3>
                  <dl className="result-grid">
                    <div>
                      <dt>Client ID</dt>
                      <dd>{clientRecord.client_id}</dd>
                    </div>
                    <div>
                      <dt>BM ID</dt>
                      <dd>{clientRecord.bm_id || "-"}</dd>
                    </div>
                    <div>
                      <dt>BM Name</dt>
                      <dd>{clientRecord.bm_name || "-"}</dd>
                    </div>
                    <div>
                      <dt>WABA ID</dt>
                      <dd>{clientRecord.waba_id || "-"}</dd>
                    </div>
                    <div>
                      <dt>Phone Number</dt>
                      <dd>{clientRecord.phone_number || "-"}</dd>
                    </div>
                    <div>
                      <dt>Current Credit Balance</dt>
                      <dd>{clientRecord.current_credit_balance ?? "-"}</dd>
                    </div>
                    <div>
                      <dt>Current Automation Triggers Quota Left</dt>
                      <dd>{clientRecord.current_automation_triggers_quota_left ?? "-"}</dd>
                    </div>
                  </dl>
                </div>
              )}
            </section>
          </>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
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
            <button
              type="button"
              className="secondary"
              onClick={createTestAccount}
              disabled={isSubmitting || !isSupabaseConfigured}
            >
              Create test account
            </button>
          </form>
        )}
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
      </section>
    </main>
  );
}
