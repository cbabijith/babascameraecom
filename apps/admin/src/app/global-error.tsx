"use client";

export default function AdminGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: "100%",
            padding: 32,
            textAlign: "center",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1, color: "#94a3b8" }}>
            BABAS ADMIN
          </p>
          <h1 style={{ fontSize: 22, color: "#0f172a", margin: "8px 0" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: "#475569" }}>
            A critical error occurred. Try again, or reload the app.
          </p>
          {error.digest ? (
            <p style={{ fontSize: 12, color: "#94a3b8" }}>Reference: {error.digest}</p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              padding: "8px 16px",
              background: "#0f172a",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
