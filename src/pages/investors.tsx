import React, { useState } from "react";
import styles from "@/styles/investors.module.css";

export default function InvestorsPage() {
  const [form, setForm] = useState({ name: "", email: "", amount: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/investors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) setMessage("Thank you for your interest! We'll be in touch.");
      else setMessage(data.error || "Something went wrong.");
    } catch {
      setMessage("Network error. Please try again later.");
    }
    setLoading(false);
  };

  return (
    <div className={styles["investor-container"]}>
      <h1 className={styles["investor-title"]}>Investor Relations</h1>
      <p className={styles["investor-desc"]}>
        Interested in investing in Pulse Connect? Fill out the form below and our team will contact
        you.
      </p>
      <form onSubmit={handleSubmit} className={styles["investor-form"]}>
        <input
          name="name"
          placeholder="Your Name"
          value={form.name}
          onChange={handleChange}
          required
          className={styles["investor-input"]}
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
          className={styles["investor-input"]}
        />
        <input
          name="amount"
          type="number"
          placeholder="Investment Amount (USD)"
          value={form.amount}
          onChange={handleChange}
          required
          min={1000}
          className={styles["investor-input"]}
        />
        <button type="submit" disabled={loading} className={styles["investor-btn"]}>
          {loading ? "Submitting..." : "Submit Interest"}
        </button>
      </form>
      {message && (
        <div
          className={
            styles["investor-message"] +
            " " +
            (message.startsWith("Thank") ? styles["success"] : styles["error"])
          }
        >
          {message}
        </div>
      )}
    </div>
  );
}
