const LINES = [
  "$ envvault register",
  "$ envvault login",
  "$ envvault team create Backend",
  "$ envvault push TEAM_ID .env",
  "$ envvault share TEAM_ID .env teammate@example.com",
  "$ envvault revoke TEAM_ID .env teammate@example.com",
];

// Command lines drift slowly upward. CSS handles the motion, so there is no JavaScript loop.
export default function TypedLines() {
  return (
    <div className="bd-typed">
      <div className="bd-typed-track">
        {[...LINES, ...LINES].map((line, index) => (
          <span key={index} className="bd-typed-line">
            {line}
          </span>
        ))}
        <span className="bd-blink" />
      </div>
    </div>
  );
}