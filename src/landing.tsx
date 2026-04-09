import React from "react";
import ReactDOM from "react-dom/client";
import "./landing.css";
import aboutIllustration from "./assets/about.png";
import emptyStateIllustration from "./assets/empty-state-prompts.png";
import copiedIllustration from "./assets/copied-sucess.png";
import icon from "./assets/icono.png";

function AppMockup() {
  return (
    <div className="app-mockup">
      <div className="app-mockup__window">
        <div className="app-mockup__toolbar">
          <div className="traffic-lights" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="app-mockup__title">Stash</div>
        </div>

        <div className="app-mockup__body">
          <aside className="app-mockup__sidebar">
            <p className="eyebrow">Collections</p>
            <ul>
              <li className="is-active">Design</li>
              <li>Writing</li>
              <li>Analysis</li>
              <li>General</li>
            </ul>
            <div className="app-mockup__shortcut">⌘⇧P from anywhere</div>
          </aside>

          <section className="app-mockup__list">
            <div className="mini-card mini-card--selected">
              <strong>User interview summary</strong>
              <span>analysis</span>
            </div>
            <div className="mini-card">
              <strong>Design critique</strong>
              <span>design</span>
            </div>
            <div className="mini-card">
              <strong>Launch copy draft</strong>
              <span>writing</span>
            </div>
          </section>

          <section className="app-mockup__detail">
            <p className="eyebrow">Prompt</p>
            <h3>Design critique</h3>
            <p>
              Review this interface for <mark>{"{{goal}}"}</mark> and suggest
              improvements to hierarchy, spacing, and clarity.
            </p>
            <div className="app-mockup__tags">
              <span>offline-first</span>
              <span>local JSON</span>
              <span>favorites</span>
            </div>
          </section>
        </div>
      </div>

      <div className="palette-card">
        <div className="palette-card__header">
          <span>Global palette</span>
          <kbd>Esc</kbd>
        </div>
        <div className="palette-card__search">Search prompts...</div>
        <div className="palette-card__result">
          <strong>Copy prompt</strong>
          <span>ready before you paste</span>
        </div>
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <main className="landing-page">
      <section className="hero">
        <div className="hero__copy">
          <div className="hero__pills">
            <span>Open source</span>
            <span>macOS only</span>
            <span>Offline-first</span>
          </div>

          <a className="brand" href="#principles" aria-label="Go to principles">
            <img src={icon} alt="" />
            <span>Stash</span>
          </a>

          <h1>Your prompt stash, ready from anywhere on your Mac.</h1>

          <p className="hero__lede">
            Stash is a minimal macOS app to save, organize, and quickly use AI
            prompts with as little friction as possible. No account. No cloud.
            Your prompts live locally and stay yours.
          </p>

          <div className="hero__actions">
            <a href="#how-it-works" className="button button--primary">
              See how it works
            </a>
            <a href="#open-source" className="button button--secondary">
              Why open source
            </a>
          </div>

          <p className="hero__note">
            Built around quick recall, structured prompts, collections, tags,
            and a global shortcut for faster reuse.
          </p>
        </div>

        <div className="hero__visual">
          <AppMockup />
        </div>
      </section>

      <section className="proof-strip" aria-label="Core product principles">
        <div>
          <strong>Local-first</strong>
          <span>Stored in a local JSON file you control.</span>
        </div>
        <div>
          <strong>Structured prompts</strong>
          <span>Variables, tags, collections, notes, and model target.</span>
        </div>
        <div>
          <strong>Fast to use</strong>
          <span>Designed so the best prompt is only a couple of steps away.</span>
        </div>
      </section>

      <section className="feature-grid" id="how-it-works">
        <article className="feature-card feature-card--wide">
          <div className="feature-card__copy">
            <p className="eyebrow">Simple by design</p>
            <h2>Keep prompts organized without turning them into documents.</h2>
            <p>
              Stash treats prompts as first-class objects. Instead of burying
              them in notes, you can keep title, content, tags, collection,
              notes, and prompt variables in one place.
            </p>
          </div>
          <img
            src={emptyStateIllustration}
            alt="Stash squirrel opening a box"
            className="feature-card__art"
          />
        </article>

        <article className="feature-card">
          <p className="eyebrow">From anywhere</p>
          <h3>Open the global palette, find the prompt, copy, keep moving.</h3>
          <p>
            The app is designed around a global shortcut so you can reach your
            prompts while working in any other app on your Mac.
          </p>
        </article>

        <article className="feature-card">
          <p className="eyebrow">Warm up variables</p>
          <h3>Fill reusable placeholders right before copying.</h3>
          <p>
            Prompts with variables can be prepared inline, so repeated details
            like names, tone, or goals are easy to update before paste.
          </p>
        </article>

        <article className="feature-card">
          <p className="eyebrow">Minimal, but with character</p>
          <h3>Native-feeling macOS interface with a clear visual voice.</h3>
          <p>
            The product aims for a calm, fast layout inspired by lightweight
            desktop tools rather than crowded AI dashboards.
          </p>
        </article>

        <article className="feature-card feature-card--accent">
          <img
            src={copiedIllustration}
            alt="Stash squirrel celebrating"
            className="feature-card__mascot"
          />
          <div>
            <p className="eyebrow">Small details matter</p>
            <h3>Ready in time for paste.</h3>
            <p>
              The goal is simple: by the time you switch back to the app you
              were using, the prompt should already be on your clipboard.
            </p>
          </div>
        </article>
      </section>

      <section className="principles" id="principles">
        <div className="section-heading">
          <p className="eyebrow">Principles</p>
          <h2>What Stash is, and what it is not.</h2>
        </div>

        <div className="principles__grid">
          <div className="principle">
            <strong>Offline-first</strong>
            <p>No accounts, no cloud dependency, no forced internet workflow.</p>
          </div>
          <div className="principle">
            <strong>Focused scope</strong>
            <p>Built for storing, preparing, and reusing prompts fast on macOS.</p>
          </div>
          <div className="principle">
            <strong>Open source</strong>
            <p>
              Inspired by tools that are useful, transparent, and easy to build
              with in public.
            </p>
          </div>
          <div className="principle">
            <strong>Not another AI suite</strong>
            <p>
              Stash does not try to be a cloud workspace, browser extension, or
              team collaboration platform in v1.
            </p>
          </div>
        </div>
      </section>

      <section className="open-source" id="open-source">
        <div className="open-source__copy">
          <p className="eyebrow">Open source, from day one</p>
          <h2>A small tool with transparent defaults.</h2>
          <p>
            The project is being shaped as an open-source macOS app. That fits
            the product: local data, visible tradeoffs, and a tighter scope than
            most AI products.
          </p>
          <p>
            The point is not to do everything. The point is to make prompt reuse
            feel immediate.
          </p>
        </div>
        <div className="open-source__art">
          <img src={aboutIllustration} alt="Stash squirrel using a laptop" />
        </div>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("landing-root")!).render(
  <React.StrictMode>
    <LandingPage />
  </React.StrictMode>
);
