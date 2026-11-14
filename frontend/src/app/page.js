"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "../lib/api";

export default function Home() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const data = await login(email, password);

      if (!data.success) {
        setError(data.message || "Login failed.");
        return;
      }

      // Store authentication details
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Redirect based on the exact role returned by the backend
      switch (data.user.role) {
        case "STUDENT":
          router.push("/student");
          break;

        case "MAINTENANCE_STAFF":
          router.push("/staff");
          break;

        case "ADMINISTRATOR":
          router.push("/admin");
          break;

        case "WARDEN":
          router.push("/warden");
          break;

        default:
          setError(`Unknown user role: ${data.user.role}`);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err.message || "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <h1>Hostel Complaint Management</h1>
        <p className="subtitle">
          Submit, prioritize and track hostel maintenance complaints through resolution.
        </p>

        <form onSubmit={handleLogin}>
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
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {error && <div className="error-message">{error}</div>}

        <p className="demo-text">
          Local demo accounts: student1@demo.hostel.test, staff1@demo.hostel.test,
          admin@demo.hostel.test, warden1@demo.hostel.test. See local setup instructions for the demo password.
        </p>
      </div>
    </main>
  );
}
