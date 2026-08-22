import { ArrowDown, ArrowUpRight, Check, ChevronRight, CircleAlert, Fingerprint, LockKeyhole, Plus, Radar, ScanSearch, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { CinematicSignalField } from "@/components/CinematicSignalField";
import { useExtensionScan } from "@/hooks/useExtensionScan";
import { trpc } from "@/lib/trpc";

const sceneLinks = [
  { label: "Home", href: "#home" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Product", href: "#product" },
  { label: "About", href: "#about" },
];

const walkthroughSteps = [
  {
    number: "01",
    eyebrow: "RECOGNIZE",
    title: "Read the complete signal.",
    body: "A link, its routing behavior, and the message around it are read together—not in isolation.",
    icon: Radar,
  },
  {
    number: "02",
    eyebrow: "EXPLAIN",
    title: "Show the reasoning plainly.",
    body: "A technical trace sits beside a clear description of the pressure tactic being used.",
    icon: ScanSearch,
  },
  {
    number: "03",
    eyebrow: "RESPOND",
    title: "Make the next move clear.",
    body: "ShieldSense turns detection into a practical, immediate recommendation—before a rushed click becomes a problem.",
    icon: ShieldCheck,
  },
];

const faqs = [
  {
    question: "How is ShieldSense different from Safe Browsing or VirusTotal?",
    answer:
      "Reputation tools are useful signals, especially for previously reported URLs and domains. ShieldSense is designed to add context by reading technical characteristics alongside the manipulation patterns in the message itself.",
  },
  {
    question: "Does it help with new or unreported threats?",
    answer:
      "That is the purpose of combining channels. A newly created or altered link may not yet have an established reputation, while its technical characteristics and the surrounding pressure language can still deserve a closer look.",
  },
  {
    question: "What data does ShieldSense access?",
    answer:
      "ShieldSense is being built around data minimization. The product will clearly explain what it needs to analyze a message or link, and the waitlist is only used to share launch information—never sold to third parties.",
  },
];

function WaitlistForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const mutation = trpc.waitlist.join.useMutation({
    onSuccess: result => {
      setAnnouncement(
        result.status === "already_registered"
          ? "You are already on the ShieldSense waitlist."
          : "You are on the list. We will be in touch when ShieldSense is ready.",
      );
      if (result.status === "created") setEmail("");
    },
    onError: error => setAnnouncement(error.message || "We could not save your place. Please try again."),
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAnnouncement("");
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setAnnouncement("Enter your email address to join the waitlist.");
      return;
    }
    mutation.mutate({ email: normalizedEmail });
  };

  return (
    <form className={`waitlist-form ${compact ? "waitlist-form--compact" : ""}`} onSubmit={handleSubmit} noValidate>
      <label className="sr-only" htmlFor={compact ? "header-waitlist-email" : "waitlist-email"}>
        Email address
      </label>
      <div className="waitlist-form__row">
        <input
          id={compact ? "header-waitlist-email" : "waitlist-email"}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="your@email.com"
          value={email}
          onChange={event => setEmail(event.target.value)}
          aria-describedby={compact ? undefined : "waitlist-privacy"}
          required
        />
        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : compact ? "Join" : "Join the waitlist"}
          {!mutation.isPending && <ArrowUpRight size={16} aria-hidden="true" />}
        </button>
      </div>
      <p className="waitlist-form__status" role="status" aria-live="polite">
        {announcement}
      </p>
      {!compact && (
        <p id="waitlist-privacy" className="waitlist-form__privacy">
          Launch notes only. No tracking stories. No selling your data.
        </p>
      )}
    </form>
  );
}

export default function Home() {
  const heroVisualRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const [activeSection, setActiveSection] = useState("home");
  const liveScan = useExtensionScan();
  const scanStatus =
    liveScan.connectionState === "scanning"
      ? "Reading the technical and human signal channels…"
      : liveScan.connectionState === "complete"
        ? liveScan.verdict === "clear"
          ? "Scan complete. No elevated signal is currently reported."
          : "Scan complete. Evidence channels need your attention."
        : liveScan.connectionState === "unavailable"
          ? "ShieldSense extension not detected. Connect the extension to stream a real scan."
          : "Waiting for an authorized ShieldSense extension.";

  useEffect(() => {
    const scenes = Array.from(document.querySelectorAll<HTMLElement>(".story-scene"));
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            const sectionId = entry.target.id || (entry.target.classList.contains("story-scene--product") ? "product" : entry.target.classList.contains("story-scene--audience") ? "about" : "how-it-works");
            setActiveSection(sectionId);
          }
        });
      },
      { threshold: 0.42 },
    );

    scenes.forEach(scene => observer.observe(scene));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const motionStages = Array.from(
      document.querySelectorAll<HTMLElement>(".hero-visual, .threat-visual, .message-stage, .split-stage, .walkthrough-grid"),
    );
    let animationFrame: number | null = null;

    const updateScrollChoreography = () => {
      const viewportHeight = window.innerHeight;
      motionStages.forEach(stage => {
        const bounds = stage.getBoundingClientRect();
        const progress = Math.min(1, Math.max(0, (viewportHeight - bounds.top) / (viewportHeight + bounds.height)));
        const centered = 1 - Math.min(1, Math.abs(0.5 - progress) * 2);

        stage.style.setProperty("--scroll-lift", `${((0.5 - progress) * 28).toFixed(1)}px`);
        stage.style.setProperty("--scroll-scale", (0.955 + centered * 0.045).toFixed(3));

        if (stage.classList.contains("message-stage")) {
          stage.style.setProperty("--scan-y", `${((0.5 - progress) * 86).toFixed(1)}px`);
          stage.style.setProperty("--scan-scale", (0.74 + centered * 0.26).toFixed(3));
          stage.style.setProperty("--scan-opacity", (0.22 + centered * 0.78).toFixed(3));
        }
      });
      animationFrame = null;
    };

    const requestUpdate = () => {
      if (animationFrame === null) animationFrame = window.requestAnimationFrame(updateScrollChoreography);
    };

    requestUpdate();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  useEffect(() => {
    const visual = heroVisualRef.current;
    const canUsePointerDepth = window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)");
    if (!visual || !canUsePointerDepth.matches) return;

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let animationFrame: number | null = null;

    const render = () => {
      current.x += (target.x - current.x) * 0.085;
      current.y += (target.y - current.y) * 0.085;

      visual.style.setProperty("--pointer-far-x", `${(current.x * 5).toFixed(2)}px`);
      visual.style.setProperty("--pointer-far-y", `${(current.y * 4).toFixed(2)}px`);
      visual.style.setProperty("--pointer-near-x", `${(current.x * 14).toFixed(2)}px`);
      visual.style.setProperty("--pointer-near-y", `${(current.y * 11).toFixed(2)}px`);
      visual.style.setProperty("--pointer-tilt", `${(current.x * 1.35).toFixed(2)}deg`);

      const stillMoving = Math.abs(target.x - current.x) > 0.06 || Math.abs(target.y - current.y) > 0.06;
      animationFrame = stillMoving ? window.requestAnimationFrame(render) : null;
    };

    const requestRender = () => {
      if (animationFrame === null) animationFrame = window.requestAnimationFrame(render);
    };

    const onPointerMove = (event: PointerEvent) => {
      const bounds = visual.getBoundingClientRect();
      target.x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2));
      target.y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2));
      requestRender();
    };

    const onPointerLeave = () => {
      target.x = 0;
      target.y = 0;
      requestRender();
    };

    visual.addEventListener("pointermove", onPointerMove);
    visual.addEventListener("pointerleave", onPointerLeave);
    return () => {
      visual.removeEventListener("pointermove", onPointerMove);
      visual.removeEventListener("pointerleave", onPointerLeave);
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  useEffect(() => {
    const cursor = cursorRef.current;
    const canUseSignalCursor = window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)");
    if (!cursor || !canUseSignalCursor.matches) return;

    document.body.classList.add("signal-cursor-enabled");

    const target = { x: -80, y: -80 };
    const current = { x: -80, y: -80 };
    let animationFrame: number | null = null;

    const render = () => {
      current.x += (target.x - current.x) * 0.19;
      current.y += (target.y - current.y) * 0.19;
      cursor.style.setProperty("--cursor-x", `${current.x.toFixed(1)}px`);
      cursor.style.setProperty("--cursor-y", `${current.y.toFixed(1)}px`);
      const stillMoving = Math.abs(target.x - current.x) > 0.1 || Math.abs(target.y - current.y) > 0.1;
      animationFrame = stillMoving ? window.requestAnimationFrame(render) : null;
    };

    const requestRender = () => {
      if (animationFrame === null) animationFrame = window.requestAnimationFrame(render);
    };
    const onPointerMove = (event: PointerEvent) => {
      target.x = event.clientX;
      target.y = event.clientY;
      const targetElement = event.target instanceof Element ? event.target : null;
      cursor.classList.toggle("is-active", Boolean(targetElement?.closest("a, button, summary, input, label")));
      requestRender();
    };
    const hideCursor = () => cursor.classList.remove("is-visible");
    const showCursor = () => cursor.classList.add("is-visible");

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("blur", hideCursor);
    window.addEventListener("focus", showCursor);
    showCursor();
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("blur", hideCursor);
      window.removeEventListener("focus", showCursor);
      document.body.classList.remove("signal-cursor-enabled");
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <main className="shieldsense-site">
      <span ref={cursorRef} className="signal-cursor" aria-hidden="true"><span /></span>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="site-chrome" aria-label="Primary navigation">
        <a className="brand" href="#home" aria-label="ShieldSense home">
          <span className="brand__mark" aria-hidden="true">
            <span />
            <span />
          </span>
          <span>SHIELDSENSE</span>
        </a>
        <div className="site-actions" aria-label="ShieldSense experiences">
          <a className="top-link" href="/agent">Agent Console</a>
          <a className="top-link" href="/demo">View Demo</a>
          <a className="top-cta" href="/live-read">
            <span>Get ShieldSense</span>
            <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </div>
      </header>

      <nav className="floating-nav" aria-label="Section navigation">
        {sceneLinks.map(link => (
          <a key={link.href} href={link.href} className={activeSection === link.href.slice(1) ? "is-current" : undefined} aria-current={activeSection === link.href.slice(1) ? "page" : undefined}>
            {link.label}
          </a>
        ))}
      </nav>

      <div id="main-content">
        <section id="home" className="story-scene story-scene--hero is-visible">
          <div className="scene-grain" aria-hidden="true" />
          <div className="scene-copy hero-copy">
            <p className="eyebrow">[ THREAT DETECTION ]</p>
            <h1>
              Reading the signal
              <span>behind the message.</span>
            </h1>
            <p className="scene-lede">
              ShieldSense reads technical threat signals and human-manipulation signals together—then makes the safest next move easier to see.
            </p>
            <a className="text-link" href="#how-it-works">
              See the two-channel read <ChevronRight size={16} aria-hidden="true" />
            </a>
          </div>
          <div className="hero-visual" ref={heroVisualRef}>
            <CinematicSignalField mode={liveScan.sceneMode} />
            <div className="hero-visual__orbital" aria-hidden="true"><span /><span /><span /></div>
            <div className="hero-visual__annotation" aria-hidden="true">
              <span>signal / {liveScan.connectionState === "complete" ? "live" : "02"}</span>
              <span>{liveScan.connectionState === "scanning" ? "analysis in motion" : "message analysis"}</span>
            </div>
            <div className={`live-scan-hud live-scan-hud--${liveScan.connectionState} ${liveScan.verdict === "clear" ? "live-scan-hud--clear" : ""}`} role="status" aria-live="polite">
              <div className="live-scan-hud__head">
                <span className="live-scan-hud__pulse" aria-hidden="true" />
                <span>LIVE EXTENSION SIGNAL</span>
              </div>
              <p>{scanStatus}</p>
              {liveScan.connectionState === "complete" && (
                <div className="live-scan-hud__signals">
                  {liveScan.technicalSignals.slice(0, 2).map(signal => <span key={signal}>TECH / {signal.replaceAll("_", " ")}</span>)}
                  {liveScan.humanSignals.slice(0, 2).map(signal => <span key={signal}>HUMAN / {signal.replaceAll("_", " ")}</span>)}
                </div>
              )}
              <button type="button" onClick={liveScan.requestScan} disabled={liveScan.connectionState === "scanning"}>
                {liveScan.connectionState === "scanning" ? "Reading signal…" : "Request live scan"}
              </button>
            </div>
          </div>
          <a className="scroll-cue" href="#threat">
            <ArrowDown size={15} aria-hidden="true" />
            <span>Scroll to explore</span>
          </a>
        </section>

        <section id="threat" className="story-scene story-scene--threat">
          <div className="scene-copy scene-copy--centered">
            <p className="eyebrow">[ THE PROBLEM ]</p>
            <h2>Some threats arrive looking completely ordinary.</h2>
            <p className="scene-lede">
              A familiar sender, a routine request, a convincing link. The danger is often hidden in the seams between what a message says and what it does.
            </p>
          </div>
          <div className="threat-visual" aria-hidden="true">
            <CinematicSignalField mode="dispersed" />
            <div className="threat-visual__fragment fragment--one">your invoice is ready</div>
            <div className="threat-visual__fragment fragment--two">view document</div>
          </div>
        </section>

        <section id="how-it-works" className="story-scene story-scene--blacklist">
          <div className="scene-copy blacklist-copy">
            <p className="eyebrow">[ REPUTATION IS ONE SIGNAL ]</p>
            <h2>A bad link is not the whole story.</h2>
            <p className="scene-lede">
              Blacklists can tell you what has already been reported. But new domains, altered paths, and social pressure require another kind of reading.
            </p>
          </div>
          <div className="message-stage" aria-label="Illustration of a message being scanned">
            <CinematicSignalField mode="beam" />
            <div className="scan-beam" aria-hidden="true" />
            <div className="message-card">
              <div className="message-card__topline">
                <span className="message-avatar">N</span>
                <div>
                  <strong>Northline Operations</strong>
                  <small>accounts@northline-ops.co</small>
                </div>
                <span className="message-time">11:48</span>
              </div>
              <p>Hi Alex — your account is scheduled for review today.</p>
              <p className="message-card__urgent">Please verify access before 12 PM to avoid interruption.</p>
              <span className="message-link">secure-northline-verify.co/session</span>
            </div>
            <div className="scan-callout scan-callout--technical">
              <span className="scan-callout__dot" />
              <p><b>Reputation check</b><br />URL and domain history</p>
            </div>
            <div className="scan-callout scan-callout--human">
              <span className="scan-callout__dot" />
              <p><b>Often missed</b><br />New link + urgency pressure</p>
            </div>
          </div>
        </section>

        <section className="story-scene story-scene--split">
          <div className="scene-copy split-copy">
            <p className="eyebrow">[ THE SHIELDSENSE READ ]</p>
            <h2>One message. Two channels of evidence.</h2>
            <p className="scene-lede">
              ShieldSense places the technical trace beside the human tactic—so the moment is understandable, not just suspicious.
            </p>
          </div>
          <div className="split-stage" aria-label="Illustration of ShieldSense detecting two channels of risk">
            <CinematicSignalField mode="split" />
            <div className="scan-lock" aria-hidden="true">
              <span className="scan-lock__corner scan-lock__corner--tl" />
              <span className="scan-lock__corner scan-lock__corner--tr" />
              <span className="scan-lock__corner scan-lock__corner--bl" />
              <span className="scan-lock__corner scan-lock__corner--br" />
              <div className="scan-lock__core"><Fingerprint size={37} /></div>
            </div>
            <div className="split-trace split-trace--technical">
              <p className="trace-label">[ TECHNICAL TRACE ]</p>
              <span>DOMAIN_AGE / RECENT</span>
              <span>REDIRECT_CHAIN / 03</span>
              <span>IDENTITY_MATCH / LOW</span>
            </div>
            <div className="split-trace split-trace--human">
              <p className="trace-label">[ HUMAN SIGNAL ]</p>
              <strong>Urgency + impersonated sender</strong>
              <span>The request creates a time limit before trust is established.</span>
            </div>
          </div>
        </section>

        <section className="story-scene story-scene--action">
          <div className="scene-copy action-copy">
            <p className="eyebrow">[ THE NEXT MOVE ]</p>
            <h2>Detection should lead somewhere.</h2>
            <p className="scene-lede">
              A verdict without guidance leaves the hardest decision to the user. ShieldSense translates a read into an immediate response.
            </p>
          </div>
          <div className="action-card" aria-label="Illustrative ShieldSense recommended action">
            <CinematicSignalField mode="resolve" />
            <div className="action-card__signal"><CircleAlert size={22} /></div>
            <div className="action-card__head">
              <span className="eyebrow">[ RECOMMENDED ACTION ]</span>
              <span className="risk-label">Elevated risk</span>
            </div>
            <h3>Do not open this link.</h3>
            <p>Contact Northline through a known channel before taking any action on the request.</p>
            <div className="action-card__steps">
              <span><Check size={14} /> Pause the request</span>
              <span><Check size={14} /> Verify independently</span>
              <span><Check size={14} /> Report if needed</span>
            </div>
          </div>
        </section>

        <section id="product" className="story-scene story-scene--product">
          <div className="scene-copy product-copy">
            <p className="eyebrow">[ PRODUCT WALKTHROUGH ]</p>
            <h2>Calm clarity, when a message asks you to rush.</h2>
            <p className="scene-lede">A focused flow designed to make a complicated moment feel legible.</p>
          </div>
          <div className="walkthrough-grid">
            <CinematicSignalField mode="split" />
            {walkthroughSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article className={`walkthrough-card walkthrough-card--${index + 1}`} key={step.number}>
                  <div className="walkthrough-card__topline">
                    <span>[ {step.number} ]</span>
                    <Icon size={20} aria-hidden="true" />
                  </div>
                  <p className="card-eyebrow">{step.eyebrow}</p>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                  <span className="concept-label">Illustrative product concept</span>
                </article>
              );
            })}
          </div>
        </section>

        <section id="about" className="story-scene story-scene--audience">
          <div className="audience-grid">
            <div className="scene-copy">
              <p className="eyebrow">[ WHO IT IS FOR ]</p>
              <h2>For anyone who receives a message before they can investigate it.</h2>
              <div className="audience-signal-card" aria-label="ShieldSense reads two types of context together">
                <CinematicSignalField mode="split" />
                <div className="audience-signal-card__copy">
                  <p>[ ONE MESSAGE, TWO CONTEXTS ]</p>
                  <strong>The signal is never just the link.</strong>
                  <span>ShieldSense reads what the message does and what it asks a person to feel.</span>
                </div>
                <div className="audience-signal-card__channels" aria-hidden="true">
                  <span>TECHNICAL CONTEXT</span>
                  <span>HUMAN CONTEXT</span>
                </div>
              </div>
            </div>
            <div className="audience-list">
              <article className="audience-item">
                <span className="audience-item__index">01</span>
                <div>
                  <h3>Everyday people</h3>
                  <p>People making ordinary decisions online who need a quick way to understand what sits behind a message, link, or request.</p>
                </div>
              </article>
              <article className="audience-item">
                <span className="audience-item__index">02</span>
                <div>
                  <h3>Remote workers</h3>
                  <p>People moving quickly between messages, tools, files, and requests who need context without interrupting their workflow.</p>
                </div>
              </article>
              <article className="audience-item">
                <span className="audience-item__index">03</span>
                <div>
                  <h3>Families and individuals</h3>
                  <p>People helping themselves or others decide whether an unfamiliar message deserves trust, caution, or further investigation.</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="faq-section" aria-labelledby="faq-heading">
          <div className="faq-section__intro">
            <p className="eyebrow">[ QUESTIONS, ANSWERED ]</p>
            <h2 id="faq-heading">The context behind the context.</h2>
            <p>ShieldSense is built to support better judgment—not replace it.</p>
          </div>
          <div className="faq-list">
            {faqs.map(faq => (
              <details key={faq.question} className="faq-item">
                <summary>
                  <span>{faq.question}</span>
                  <Plus size={20} aria-hidden="true" />
                </summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="waitlist" className="final-cta">
          <div className="final-cta__halo" aria-hidden="true"><Sparkles size={76} /></div>
          <p className="eyebrow">[ EARLY ACCESS ]</p>
          <h2>Meet the signal before it becomes a click.</h2>
          <p>Join the ShieldSense waitlist for launch news and early product updates.</p>
          <WaitlistForm />
        </section>
      </div>

      <footer className="site-footer">
        <a className="brand" href="#home" aria-label="ShieldSense home">
          <span className="brand__mark" aria-hidden="true"><span /><span /></span>
          <span>SHIELDSENSE</span>
        </a>
        <p>Technical threat signals + human-manipulation signals.</p>
        <p>Privacy-first direction. No data selling.</p>
      </footer>
    </main>
  );
}
