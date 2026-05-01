import React from 'react';
import { useNavigate } from 'react-router';
import '../style/landing.scss';

const Landing = () => {
    const navigate = useNavigate();

    return (
        <div className="landing-page">
            <nav className="landing-navbar">
                <div className="brand">InterviewAi</div>
                <div className="auth-buttons">
                    <button className="btn btn-login" onClick={() => navigate('/login')}>Login</button>
                    <button className="btn btn-signup" onClick={() => navigate('/register')}>Sign Up</button>
                </div>
            </nav>

            <main className="hero-section">
                <div className="hero-content">
                    <h1 className="hero-title">
                        Master Your Next Interview with <span className="gradient-text">InterviewAi</span>
                    </h1>
                    <p className="hero-subtitle">
                        Experience AI-driven personalized interview preparation. Upload your resume, target a job description, and let our intelligent engine craft the ultimate winning strategy just for you.
                    </p>
                    <div className="hero-cta">
                        <button className="btn btn-primary" onClick={() => navigate('/register')}>
                            Get Started Free
                        </button>
                        <button className="btn btn-secondary" onClick={() => navigate('/login')}>
                            Already have an account?
                        </button>
                    </div>
                </div>

                <div className="features-section">
                    <div className="feature-card">
                        <div className="feature-icon">📄</div>
                        <h3>Resume Analysis</h3>
                        <p>We analyze your resume against job descriptions to highlight your strengths.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">🎯</div>
                        <h3>Targeted Strategy</h3>
                        <p>Get actionable insights and custom preparation plans tailored to your target role.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">🚀</div>
                        <h3>Confidence Boost</h3>
                        <p>Walk into your next interview feeling fully prepared and confident to succeed.</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Landing;
