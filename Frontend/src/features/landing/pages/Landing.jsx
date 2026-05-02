import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import '../style/landing.scss';
import robotFace from '../../../assets/robot_ai.png';

const Landing = () => {
    const navigate = useNavigate();
    const canvasRef = useRef(null);

    // Animated grid / particle canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const particles = Array.from({ length: 60 }, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            r: Math.random() * 1.5 + 0.5,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            alpha: Math.random() * 0.5 + 0.1,
        }));

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(204,255,0,${p.alpha})`;
                ctx.fill();
            });

            // Draw connecting lines
            particles.forEach((a, i) => {
                particles.slice(i + 1).forEach(b => {
                    const dist = Math.hypot(a.x - b.x, a.y - b.y);
                    if (dist < 140) {
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.strokeStyle = `rgba(204,255,0,${0.07 * (1 - dist / 140)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                });
            });

            animId = requestAnimationFrame(draw);
        };
        draw();

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <div className="landing-page">
            {/* Particle Canvas */}
            <canvas ref={canvasRef} className="particle-canvas" />

            {/* Scanline Overlay */}
            <div className="scanline-overlay" />

            {/* ── Navbar ── */}
            <nav className="landing-navbar">
                <div className="brand">
                    <span className="brand-bracket">[</span>
                    INTERVIEW<span className="brand-accent">_AI</span>
                    <span className="brand-bracket">]</span>
                </div>
               
                <div className="auth-buttons">
                    <button className="btn btn-login" onClick={() => navigate('/login')}>LOGIN</button>
                    <button className="btn btn-signup" onClick={() => navigate('/register')}>START_GRINDING</button>
                </div>
            </nav>

            {/* ── Hero Section ── */}
            <main className="hero-section">
                <div className="hero-left">
                    <div className="hero-tag">
                        <span className="tag-dot" />
                        AI_POWERED // INTERVIEW_PREP
                    </div>
                    <h1 className="hero-title">
                        TERMINATE<br />
                        THE<br />
                        <span className="title-accent">COMPETITION.</span>
                    </h1>
                    <p className="hero-subtitle">
                        Traditional interview prep is dead. Harness raw AI to simulate
                        high-stakes corporate warfare. Feed it your resume. Get a
                        precision battle plan. No mercy. Just results.
                    </p>
                    <div className="hero-cta">
                        <button className="btn btn-primary" onClick={() => navigate('/register')}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9z"/></svg>
                            INITIATE_BOOT_SEQUENCE
                        </button>
                        <button className="btn btn-ghost" onClick={() => navigate('/login')}>
                            EXISTING_PROFILE →
                        </button>
                    </div>
                    <div className="hero-stats">
                        <div className="stat">
                            <span className="stat-value">98%</span>
                            <span className="stat-label">MATCH_ACCURACY</span>
                        </div>
                        <div className="stat-divider" />
                        <div className="stat">
                            <span className="stat-value">30s</span>
                            <span className="stat-label">PLAN_GENERATION</span>
                        </div>
                        <div className="stat-divider" />
                        <div className="stat">
                            <span className="stat-value">50k+</span>
                            <span className="stat-label">CANDIDATES_SERVED</span>
                        </div>
                    </div>
                </div>

                <div className="hero-right">
                    <div className="robot-container">
                        <div className="robot-glow" />
                        <div className="robot-ring robot-ring--outer" />
                        <div className="robot-ring robot-ring--inner" />
                        <img src={robotFace} alt="AI Interview Robot" className="robot-image" />
                        <div className="robot-scan-line" />
                        <div className="robot-label">AI_INTERVIEWER_v4.2</div>
                        <div className="robot-status">
                            <span className="live-dot" />SCANNING_REALTIME
                        </div>
                    </div>
                </div>
            </main>

            {/* ── Weapons / Features ── */}
            <section className="weapons-section">
                <div className="section-header">
                    <div className="section-line" />
                    <span className="section-tag">THE_WEAPONRY</span>
                    <div className="section-line" />
                </div>
                <div className="weapons-grid">
                    <div className="weapon-card">
                        <div className="weapon-num">01</div>
                        <div className="weapon-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                        </div>
                        <h3>TECH_GRIND_ENGINE</h3>
                        <p>AI generates custom technical questions matched to the exact job description. Zero fluff, maximum signal.</p>
                    </div>
                    <div className="weapon-card">
                        <div className="weapon-num">02</div>
                        <div className="weapon-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        </div>
                        <h3>SOFT_SKILLS_ARMORY</h3>
                        <p>Behavioral question bank built from your actual experience. STAR-formatted model answers ready to deploy.</p>
                    </div>
                    <div className="weapon-card">
                        <div className="weapon-num">03</div>
                        <div className="weapon-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                        </div>
                        <h3>ROADMAP_TO_SUCCESS</h3>
                        <p>Day-by-day preparation battle plan. Know exactly what to study, when to study it, and how to prioritize.</p>
                    </div>
                    <div className="weapon-card">
                        <div className="weapon-num">04</div>
                        <div className="weapon-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"/></svg>
                        </div>
                        <h3>MATCH_SCORE_INTEL</h3>
                        <p>Precision gap analysis between your profile and the role. Know your weak points before the interviewer does.</p>
                    </div>
                </div>
            </section>

            {/* ── CTA Banner ── */}
            <section className="cta-banner">
                <div className="cta-banner__inner">
                    <div className="cta-text">
                        <p className="cta-kicker">READY_TO_DESTROY?</p>
                        <p className="cta-sub">Every second you wait, another recruit is grinding.</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => navigate('/register')}>
                        START_SIMULATION_NOW →
                    </button>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="landing-footer">
                <div className="footer-brand">
                    INTERVIEW_AI // TERMINATE THE COMPETITION
                </div>
                <div className="footer-links">
                    <a href="#">MANIFESTO</a>
                    <a href="#">API</a>
                    <a href="#">DISCORD</a>
                    <a href="#">X_FEED</a>
                </div>
                <div className="footer-copy">©2026 INTERVIEW_AI</div>
            </footer>
        </div>
    );
};

export default Landing;
