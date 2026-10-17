import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import PageTransition from "../components/PageTransition.jsx";
import Card from "../components/Card.jsx";
import CommandBlock from "../components/CommandBlock.jsx";
import Typewriter from "../components/Typewriter.jsx";
import SectionBackdrop from "../components/SectionBackdrop.jsx";
import PixelField from "../components/PixelField.jsx";
import LockRow from "../components/backdrops/LockRow.jsx";
import CipherPath from "../components/backdrops/CipherPath.jsx";
import DualColumn from "../components/backdrops/DualColumn.jsx";
import TypedLines from "../components/backdrops/TypedLines.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { easeOut, staggerContainer, staggerItem } from "../lib/motion.js";

const TERM_LINES = [
  { text: "$ envvault push TEAM_ID .env" },
  { text: "✓ encrypted locally with AES-256-GCM", ok: true },
  { text: "✓ server stored ciphertext only (v1)", ok: true },
  { text: "$ envvault share TEAM_ID .env bob@team.dev" },
  { text: "✓ wrapped key sent for bob@team.dev", ok: true },
  { text: "$ envvault revoke TEAM_ID .env bob@team.dev" },
  { text: "✓ rotated to v2, bob locked out", ok: true },
];

const FEATURES = [
  {
    title: "Client-side encryption",
    text: "AES-256-GCM runs on your machine. The server only ever receives ciphertext.",
  },
  {
    title: "Per-user key wrapping",
    text: "Each secret's data key is wrapped separately for every teammate with X25519.",
  },
  {
    title: "Rotation on revoke",
    text: "Removing access re-encrypts the secret with a new key in one database transaction.",
  },
  {
    title: "Role-based access",
    text: "Admins, members and viewers. Non-members get a 404, so they cannot confirm a secret exists.",
  },
  {
    title: "Audit trail",
    text: "Creates, reads, grants, revokes and rotations are logged with who and when.",
  },
  {
    title: "Terminal first",
    text: "A focused CLI handles keys and encryption. The dashboard handles visibility and control.",
  },
];

const STEPS = [
  {
    title: "Create your key",
    text: "envvault register generates a keypair. The private key never leaves your machine.",
  },
  {
    title: "Encrypt and push",
    text: "envvault push encrypts your .env locally, then sends only ciphertext and a wrapped key.",
  },
  {
    title: "Share with a teammate",
    text: "envvault share wraps the data key for their public key. The server cannot open it.",
  },
  {
    title: "Revoke and rotate",
    text: "envvault revoke issues a new key and re-wraps it for everyone who keeps access.",
  },
];

const SERVER_KNOWS = [
  "Usernames, emails and public keys",
  "Ciphertext of each secret and its version",
  "Wrapped keys, which only their owner can open",
  "Who did what and when, in the audit log",
];

const SERVER_NEVER_SEES = [
  "Plaintext secret values",
  "Your private key, which is encrypted with your passphrase on your machine",
  "Raw data keys",
  "Your key passphrase",
];

function SectionHead({ eyebrow, title, text }) {
  return (
    <motion.div
      className="section-head"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: easeOut }}
    >
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="section-title">{title}</h2>
      {text ? <p className="muted lead-sm">{text}</p> : null}
    </motion.div>
  );
}

export default function Landing() {
  const { user } = useAuth();

  return (
    <PageTransition>
      <section className="hero">
        <PixelField />
        <div className="container hero-grid">
          <motion.div variants={staggerContainer} initial="hidden" animate="show">
            <motion.span variants={staggerItem} className="tag">
              Zero-knowledge secret manager
            </motion.span>
            <motion.h1 variants={staggerItem} className="hero-title">
              <Typewriter text="Share secrets with your team." speed={34} />
              <br />
              <span className="hero-accent">Never hand them to a server.</span>
            </motion.h1>
            <motion.p variants={staggerItem} className="lead">
              Envvault encrypts your .env files on your machine with AES-256-GCM. The server stores
              only ciphertext and wrapped keys, and revoking a teammate rotates the secret.
            </motion.p>
            <motion.div variants={staggerItem} className="hero-actions">
              {user ? (
                <Link className="btn btn-primary" to="/dashboard">
                  Open dashboard
                </Link>
              ) : (
                <Link className="btn btn-primary" to="/login">
                  Sign in
                </Link>
              )}
              <a className="btn btn-ghost" href="#how-it-works">
                See how it works
              </a>
            </motion.div>
          </motion.div>

          <motion.div
            className="term"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: easeOut }}
          >
            <div className="term-bar">
              <span>envvault · team backend</span>
              <span className="term-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </div>
            <motion.div className="term-body" variants={staggerContainer} initial="hidden" animate="show">
              {TERM_LINES.map((line) => (
                <motion.span
                  key={line.text}
                  variants={staggerItem}
                  className={`term-line ${line.ok ? "ok" : ""}`.trim()}
                >
                  {line.text}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      <SectionBackdrop id="features" className="section" backdrop={<LockRow />}>
        <div className="container">
          <SectionHead
            eyebrow="Features"
            title="Built like a real security product"
            text="Each feature maps to a decision in the design, and each one is covered by tests."
          />
          <div className="features-grid">
            {FEATURES.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: index * 0.05, ease: easeOut }}
              >
                <Card className="feature">
                  <span className="feature-index">[{String(index + 1).padStart(2, "0")}]</span>
                  <h3>{feature.title}</h3>
                  <p className="muted">{feature.text}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </SectionBackdrop>

      <SectionBackdrop id="how-it-works" className="section" backdrop={<CipherPath />}>
        <div className="container">
          <SectionHead eyebrow="How it works" title="From your laptop to your team, encrypted end to end" />
          <div className="timeline">
            {STEPS.map((step, index) => (
              <motion.div
                key={step.title}
                className="step"
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, ease: easeOut }}
              >
                <span className="step-no">0{index + 1}</span>
                <h3>{step.title}</h3>
                <p className="muted">{step.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </SectionBackdrop>

      <SectionBackdrop id="security" className="section" backdrop={<DualColumn />}>
        <div className="container">
          <SectionHead eyebrow="Security model" title="What the server knows, and what it never sees" />
          <div className="split">
            <Card>
              <h3>The server knows</h3>
              <ul className="check-list">
                {SERVER_KNOWS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Card>
            <Card className="card-accent">
              <h3>The server never sees</h3>
              <ul className="check-list strong">
                {SERVER_NEVER_SEES.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </SectionBackdrop>

      <SectionBackdrop id="cli" className="section" backdrop={<TypedLines />}>
        <div className="container split">
          <div>
            <SectionHead
              eyebrow="Command line"
              title="One CLI does the encryption"
              text="Keys and encryption live in the CLI. The dashboard shows visibility and control, and never a plaintext value."
            />
          </div>
          <CommandBlock
            title="Get started"
            lines={[
              "envvault register",
              "envvault login",
              "envvault team create Backend",
              "envvault push TEAM_ID .env",
              "envvault share TEAM_ID .env teammate@example.com",
              "envvault revoke TEAM_ID .env teammate@example.com",
            ]}
          />
        </div>
      </SectionBackdrop>

      <footer className="footer">
        <div className="container row-between">
          <span>Envvault · zero-knowledge secret manager</span>
          <span>FastAPI · SQLAlchemy · React · Python CLI</span>
        </div>
      </footer>
    </PageTransition>
  );
}