import { FormEvent, useState } from "react";

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(`Logged in as ${email || "user"}`);
  };

  return (
    <main className="page">
      <section className="login-card">
        <h1>Login to Partner Dashboard</h1>
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

          <a href="#" className="forgot">
            Forgot password?
          </a>

          <button type="submit">Login</button>
        </form>
        {message && <p className="success">{message}</p>}
      </section>
    </main>
  );
}
