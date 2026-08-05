import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PropsWithChildren
} from "react";
import { GoogleSignIn } from "@/molecules/GoogleSignIn";
import { useAppState } from "@/state/AppState";
import styles from "./LandingPage.module.scss";

const AGENTS = [
  { icon: "🧠", name: "Resume Analysis", blurb: "Structures skills, education and projects straight from your resume." },
  { icon: "🎯", name: "Job Matching", blurb: "Scores live listings and explains exactly why each role fits." },
  { icon: "🧩", name: "Skill Gap", blurb: "Ranks the missing skills that actually block your hiring." },
  { icon: "🗺️", name: "Learning Planner", blurb: "Builds a prioritized roadmap grounded in real knowledge sources." },
  { icon: "📄", name: "Resume Optimizer", blurb: "Rewrites bullets and summaries targeted at your dream role." },
  { icon: "🎤", name: "Interview Coach", blurb: "Generates practice questions aligned to your gaps and role." }
];

const PIPELINE = [
  { step: "01", title: "Upload resume", text: "PDF, DOCX or text — Gemini extracts a structured candidate profile." },
  { step: "02", title: "Agents reason", text: "Six specialized agents run in a LangGraph pipeline with RAG evidence." },
  { step: "03", title: "Jobs matched", text: "Live Adzuna listings plus curated real job descriptions, scored for you." },
  { step: "04", title: "Act on the plan", text: "Explainable readiness report, 7-day action plan and interview prep." }
];

const STACK = ["Gemini", "LangGraph", "FastAPI", "React", "PostgreSQL", "Qdrant RAG", "Celery", "Adzuna API"];

function Reveal({ children, delay = 0 }: PropsWithChildren<{ delay?: number }>) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${styles.reveal} ${shown ? styles.revealShown : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function TiltCard({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  const ref = useRef<HTMLDivElement | null>(null);

  const onMove = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    node.style.transform = `perspective(900px) rotateX(${py * -10}deg) rotateY(${px * 12}deg) translateZ(6px)`;
    node.style.setProperty("--glow-x", `${(px + 0.5) * 100}%`);
    node.style.setProperty("--glow-y", `${(py + 0.5) * 100}%`);
  }, []);

  const onLeave = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    node.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)";
  }, []);

  return (
    <div ref={ref} className={`${styles.tilt} ${className}`} onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
    </div>
  );
}

export function LandingPage() {
  const { setPage, authUser } = useAppState();
  const heroRef = useRef<HTMLDivElement | null>(null);

  const onHeroMove = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    const node = heroRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    node.style.setProperty("--par-x", `${px * 24}px`);
    node.style.setProperty("--par-y", `${py * 24}px`);
  }, []);

  const enter = () => setPage("upload");

  return (
    <div className={styles.landing}>
      <div className={`${styles.orb} ${styles.orbA}`} />
      <div className={`${styles.orb} ${styles.orbB}`} />
      <div className={`${styles.orb} ${styles.orbC}`} />
      <div className={styles.gridGlow} />

      <nav className={styles.nav}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>◆</span>
          CareerPilot <em>AI</em>
        </div>
        <div className={styles.navLinks}>
          <a href="#agents">Agents</a>
          <a href="#pipeline">How it works</a>
          <a href="#stack">Stack</a>
        </div>
        <div className={styles.navAuth}>
          <GoogleSignIn />
          <button className={styles.navCta} onClick={enter}>
            {authUser ? "Open workspace" : "Launch App"}
          </button>
        </div>
      </nav>

      <header className={styles.hero} ref={heroRef} onMouseMove={onHeroMove}>
        <div className={styles.heroCopy}>
          <span className={styles.badge}>
            <span className={styles.badgeDot} /> Multi-Agent Career Readiness OS
          </span>
          <h1>
            Stop guessing.
            <br />
            <span className={styles.gradientText}>Know exactly what to do next</span>
            <br />
            to get hired.
          </h1>
          <p>
            CareerPilot AI orchestrates six specialized Gemini agents to turn one resume into an
            explainable readiness report — real job matches, ranked skill gaps, a learning roadmap
            and a 7-day action plan.
          </p>
          <div className={styles.heroActions}>
            <button className={styles.primaryCta} onClick={enter}>
              Analyze my resume
              <span className={styles.ctaArrow}>→</span>
            </button>
            <a className={styles.ghostCta} href="#pipeline">
              See how it works
            </a>
          </div>
          <div className={styles.heroMeta}>
            <div>
              <strong>6</strong>
              <span>AI agents</span>
            </div>
            <div>
              <strong>7-day</strong>
              <span>action plans</span>
            </div>
            <div>
              <strong>Live</strong>
              <span>job matching</span>
            </div>
          </div>
        </div>

        <div className={styles.heroStage}>
          <div className={styles.stage3d}>
            <TiltCard className={styles.reportCard}>
              <div className={styles.reportHead}>
                <span>Career Readiness Report</span>
                <span className={styles.livePill}>live</span>
              </div>
              <div className={styles.scoreRow}>
                <div className={styles.scoreRing}>
                  <svg viewBox="0 0 120 120">
                    <circle className={styles.ringTrack} cx="60" cy="60" r="52" />
                    <circle className={styles.ringFill} cx="60" cy="60" r="52" />
                  </svg>
                  <div className={styles.scoreValue}>
                    75<small>%</small>
                  </div>
                </div>
                <div className={styles.scoreInfo}>
                  <p className={styles.scoreLabel}>Backend Developer readiness</p>
                  <div className={styles.miniBars}>
                    <div className={styles.miniBar}>
                      <span>Python</span>
                      <i style={{ width: "92%" }} />
                    </div>
                    <div className={styles.miniBar}>
                      <span>SQL</span>
                      <i style={{ width: "84%" }} />
                    </div>
                    <div className={styles.miniBar}>
                      <span>Docker</span>
                      <i style={{ width: "38%" }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.reportFoot}>
                <span className={styles.gapChip}>Gap: CI/CD</span>
                <span className={styles.gapChip}>Gap: AWS</span>
                <span className={styles.evidenceNote}>evidence-backed ✓</span>
              </div>
            </TiltCard>

            <div className={styles.floatChip} data-pos="a">
              🎯 4 job matches
            </div>
            <div className={styles.floatChip} data-pos="b">
              🗺️ Day 2: Learn Docker
            </div>
            <div className={styles.floatChip} data-pos="c">
              🎤 5 interview drills
            </div>

            <div className={styles.orbit}>
              {AGENTS.map((agent, i) => (
                <span
                  key={agent.name}
                  className={styles.orbitDot}
                  style={{ animationDelay: `${(-24 / 6) * i}s` }}
                >
                  {agent.icon}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section className={styles.section} id="agents">
        <Reveal>
          <div className={styles.sectionHead}>
            <span className={styles.kicker}>The crew</span>
            <h2>
              Six agents. <span className={styles.gradientText}>One coordinated mission.</span>
            </h2>
            <p>Each agent has a single responsibility — a LangGraph orchestrator fuses their outputs into one explainable decision.</p>
          </div>
        </Reveal>
        <div className={styles.agentGrid}>
          {AGENTS.map((agent, i) => (
            <Reveal key={agent.name} delay={i * 80}>
              <TiltCard className={styles.agentCard}>
                <span className={styles.agentIcon}>{agent.icon}</span>
                <h3>{agent.name}</h3>
                <p>{agent.blurb}</p>
                <span className={styles.agentIndex}>0{i + 1}</span>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      <section className={styles.section} id="pipeline">
        <Reveal>
          <div className={styles.sectionHead}>
            <span className={styles.kicker}>How it works</span>
            <h2>
              From resume to <span className={styles.gradientText}>ready in four steps</span>
            </h2>
          </div>
        </Reveal>
        <div className={styles.pipeline}>
          <div className={styles.pipeLine} />
          {PIPELINE.map((item, i) => (
            <Reveal key={item.step} delay={i * 120}>
              <div className={styles.pipeCard}>
                <span className={styles.pipeStep}>{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className={styles.section} id="stack">
        <Reveal>
          <div className={styles.stackBand}>
            <p>Powered by a real agentic stack — no mocks, no single-prompt wrappers.</p>
            <div className={styles.stackMarquee}>
              <div className={styles.stackTrack}>
                {[...STACK, ...STACK].map((item, i) => (
                  <span key={`${item}-${i}`} className={styles.stackChip}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section className={styles.section}>
        <Reveal>
          <TiltCard className={styles.finalCta}>
            <h2>
              Your next role is a <span className={styles.gradientText}>plan away.</span>
            </h2>
            <p>Upload a resume and watch the multi-agent pipeline work in real time.</p>
            <button className={styles.primaryCta} onClick={enter}>
              Launch CareerPilot
              <span className={styles.ctaArrow}>→</span>
            </button>
          </TiltCard>
        </Reveal>
      </section>

      <footer className={styles.footer}>
        <span>© 2026 Team Invictus — CareerPilot AI</span>
        <span>Built with Gemini · LangGraph · FastAPI · React</span>
      </footer>
    </div>
  );
}
