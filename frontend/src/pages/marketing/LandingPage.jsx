import { useState } from 'react';
import {
  Layers,
  ArrowRight,
  MessageSquare,
  ShieldCheck,
  Video,
  CheckSquare,
  Megaphone,
  Sliders,
  Menu,
  X,
  ChevronDown,
  Sparkles,
  Lock,
  Hash,
  Send,
  XCircle,
} from 'lucide-react';

const LandingPage = ({ onNavigateAuth }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleNavClick = (e, targetId) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const faqs = [
    {
      question: 'How are new team members added to the workspace?',
      answer:
        'To prevent organizational clutter and unauthorized access, all team members are created and provisioned directly by the Workspace Administrator. Users receive an account invite with temporary credentials and set their private password upon their initial sign-in.',
    },
    {
      question: 'Does Google Meet require a paid Google Workspace account?',
      answer:
        'No. SAAS Nexus seamlessly schedules video syncs with standard Google Meet integration or automated fallback meeting rooms that work immediately for all invited team members without requiring extra enterprise licensing.',
    },
    {
      question: 'Can administrators restrict who posts in specific channels?',
      answer:
        'Yes. Every channel supports granular permissions: "Everyone Can Chat" for active cross-functional collaboration, or "Admin Only" for broadcast announcements and town halls where team members listen without noise.',
    },
    {
      question: 'Are file attachments, voice notes, and media secure?',
      answer:
        'All documents, screenshots, photos, and voice notes uploaded within channels are bound directly to your private workspace boundary and restricted solely to authenticated members of that specific group.',
    },
  ];

  return (
    <div className="landing-page">
      {/* 1. NAVBAR (Sticky) */}
      <header className="landing-navbar">
        <div className="landing-container landing-navbar-inner">
          <a
            href="#"
            className="landing-brand"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <div className="landing-brand-icon">
              <Layers size={20} />
            </div>
            <span>
              SAAS <span style={{ color: '#818cf8' }}>Nexus</span>
            </span>
          </a>

          {/* Desktop Nav Links */}
          <nav aria-label="Main Navigation">
            <ul className="landing-nav-links">
              <li>
                <a
                  href="#features"
                  className="landing-nav-link"
                  onClick={(e) => handleNavClick(e, 'features')}
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  className="landing-nav-link"
                  onClick={(e) => handleNavClick(e, 'how-it-works')}
                >
                  How It Works
                </a>
              </li>
              <li>
                <a
                  href="#why-different"
                  className="landing-nav-link"
                  onClick={(e) => handleNavClick(e, 'why-different')}
                >
                  Why Nexus
                </a>
              </li>
              <li>
                <a
                  href="#faq"
                  className="landing-nav-link"
                  onClick={(e) => handleNavClick(e, 'faq')}
                >
                  FAQ
                </a>
              </li>
            </ul>
          </nav>

          {/* Desktop Action CTAs */}
          <div className="landing-nav-actions">
            <button
              type="button"
              onClick={() => onNavigateAuth && onNavigateAuth(true)}
              className="landing-btn-login"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => onNavigateAuth && onNavigateAuth(false)}
              className="landing-btn-cta"
            >
              <span>Get Started</span>
              <ArrowRight size={15} />
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            className="landing-hamburger"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        <div className={`landing-mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <a
            href="#features"
            className="landing-nav-link"
            onClick={(e) => handleNavClick(e, 'features')}
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="landing-nav-link"
            onClick={(e) => handleNavClick(e, 'how-it-works')}
          >
            How It Works
          </a>
          <a
            href="#why-different"
            className="landing-nav-link"
            onClick={(e) => handleNavClick(e, 'why-different')}
          >
            Why Nexus
          </a>
          <a
            href="#faq"
            className="landing-nav-link"
            onClick={(e) => handleNavClick(e, 'faq')}
          >
            FAQ
          </a>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                if (onNavigateAuth) onNavigateAuth(true);
              }}
              className="landing-btn-secondary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                if (onNavigateAuth) onNavigateAuth(false);
              }}
              className="landing-btn-cta"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* 2. HERO SECTION */}
        <section className="landing-hero">
          <div className="landing-container">
            <div className="landing-hero-grid">
              <div>
                <div className="landing-hero-badge">
                  <Sparkles size={14} />
                  <span>The Governed Company Workspace</span>
                </div>
                <h1>
                  One Unified Workspace for Your{' '}
                  <span className="landing-hero-gradient-text">Entire Company.</span>
                </h1>
                <p className="landing-hero-subhead">
                  Real-time channels, Google Meet video sync, Kanban task management, and
                  announcements — centralized under clean Administrator governance.
                </p>
                <div className="landing-hero-ctas">
                  <button
                    type="button"
                    onClick={() => onNavigateAuth && onNavigateAuth(false)}
                    className="landing-btn-cta"
                    style={{ padding: '12px 24px', fontSize: '15px' }}
                  >
                    <span>Get Started — Create Workspace</span>
                    <ArrowRight size={16} />
                  </button>
                  <a
                    href="#how-it-works"
                    className="landing-btn-secondary"
                    onClick={(e) => handleNavClick(e, 'how-it-works')}
                    style={{ padding: '12px 20px', fontSize: '15px' }}
                  >
                    See how it works
                  </a>
                </div>
              </div>

              {/* Flat UI Dashboard Mockup */}
              <div className="landing-mockup-wrapper">
                <div className="landing-mockup-glow" />
                <div className="landing-mockup-frame">
                  <div className="landing-mockup-topbar">
                    <div className="landing-mockup-dot" style={{ backgroundColor: '#EF4444' }} />
                    <div className="landing-mockup-dot" style={{ backgroundColor: '#F59E0B' }} />
                    <div className="landing-mockup-dot" style={{ backgroundColor: '#10B981' }} />
                    <span
                      style={{
                        marginLeft: '12px',
                        fontSize: '11px',
                        color: '#64748B',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      nexus.corp/#chat/engineering
                    </span>
                  </div>
                  <div className="landing-mockup-body">
                    {/* Mockup Sidebar */}
                    <div className="landing-mockup-sidebar">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '4px',
                            background: '#4F46E5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          N
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#F8FAFC' }}>
                          Nexus Corp
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '10px',
                          color: '#64748B',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          marginTop: '6px',
                        }}
                      >
                        Channels
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(79, 70, 229, 0.25)',
                          color: '#FFFFFF',
                          fontSize: '11.5px',
                        }}
                      >
                        <Hash size={13} color="#818CF8" />
                        <span>engineering</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 6px',
                          color: '#94A3B8',
                          fontSize: '11.5px',
                        }}
                      >
                        <Lock size={13} color="#F59E0B" />
                        <span>announcements</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 6px',
                          color: '#94A3B8',
                          fontSize: '11.5px',
                        }}
                      >
                        <Hash size={13} />
                        <span>general</span>
                      </div>
                    </div>

                    {/* Mockup Main Chat Preview */}
                    <div className="landing-mockup-chat">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              backgroundColor: '#4F46E5',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                          >
                            AM
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#F8FAFC' }}>
                                Alex Morgan
                              </span>
                              <span
                                style={{
                                  fontSize: '9.5px',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  backgroundColor: 'rgba(79, 70, 229, 0.2)',
                                  color: '#818CF8',
                                }}
                              >
                                Admin
                              </span>
                              <span style={{ fontSize: '10px', color: '#64748B' }}>10:30 AM</span>
                            </div>
                            <div
                              style={{
                                fontSize: '12px',
                                color: '#CBD5E1',
                                marginTop: '3px',
                                lineHeight: 1.4,
                              }}
                            >
                              Team, I've scheduled our Sprint Sync on Google Meet. Let's review the API
                              task board.
                            </div>
                          </div>
                        </div>

                        {/* Interactive Google Meet Card Badge */}
                        <div
                          style={{
                            marginLeft: '36px',
                            padding: '8px 12px',
                            backgroundColor: '#1E293B',
                            border: '1px solid rgba(79, 70, 229, 0.3)',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Video size={16} color="#818CF8" />
                            <div>
                              <div
                                style={{ fontSize: '11.5px', fontWeight: 600, color: '#F8FAFC' }}
                              >
                                Sprint Architecture Sync
                              </div>
                              <div style={{ fontSize: '10px', color: '#94A3B8' }}>
                                Today · 11:00 AM · Google Meet
                              </div>
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 600,
                              color: '#818CF8',
                              backgroundColor: 'rgba(79, 70, 229, 0.15)',
                              padding: '3px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            Join Call
                          </span>
                        </div>
                      </div>

                      {/* Mockup Composer Input */}
                      <div
                        style={{
                          marginTop: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          backgroundColor: '#1E293B',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                          Message #engineering...
                        </span>
                        <Send size={14} color="#818CF8" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. TRUST / STATS STRIP */}
        <section className="landing-stats-strip" aria-label="Key Platform Capabilities">
          <div className="landing-container">
            <div className="landing-stats-grid">
              <div className="landing-stat-chip">
                <MessageSquare size={18} className="landing-stat-chip-icon" />
                <span>Real-Time Team Chat</span>
              </div>
              <div className="landing-stat-chip">
                <Video size={18} className="landing-stat-chip-icon" />
                <span>Google Meet Built In</span>
              </div>
              <div className="landing-stat-chip">
                <ShieldCheck size={18} className="landing-stat-chip-icon" />
                <span>Admin-Controlled Access</span>
              </div>
              <div className="landing-stat-chip">
                <CheckSquare size={18} className="landing-stat-chip-icon" />
                <span>Kanban Task Tracking</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. FEATURES GRID */}
        <section id="features" className="landing-section">
          <div className="landing-container">
            <div className="landing-section-header">
              <span className="landing-section-tag">Core Capabilities</span>
              <h2>Everything Your Team Needs Under One Roof</h2>
              <p>
                Eliminate disconnected subscriptions. SAAS Nexus integrates messaging, video
                conferencing, task execution, and broadcasts in a unified interface.
              </p>
            </div>

            <div className="landing-features-grid">
              {/* Feature 1 */}
              <div className="landing-feature-card">
                <div className="landing-feature-icon-wrapper">
                  <MessageSquare size={24} />
                </div>
                <h3>Team Chat & Rich Media</h3>
                <p>
                  Instant WebSockets messaging with support for document attachments, photo
                  galleries, interactive emoji reactions, and crystal-clear voice notes.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="landing-feature-card">
                <div className="landing-feature-icon-wrapper">
                  <Sliders size={24} />
                </div>
                <h3>Groups & Permissions</h3>
                <p>
                  Administrators curate channels, assign team members, and toggle posting
                  permissions between open discussion and broadcast-only modes.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="landing-feature-card">
                <div className="landing-feature-icon-wrapper">
                  <Video size={24} />
                </div>
                <h3>Google Meet Integration</h3>
                <p>
                  Schedule video syncs directly from any channel with automatic calendar syncing,
                  instant Google Meet links, and team notifications.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="landing-feature-card">
                <div className="landing-feature-icon-wrapper">
                  <CheckSquare size={24} />
                </div>
                <h3>Task & Work Management</h3>
                <p>
                  Interactive Kanban workflows. Assign tasks with priorities, deadline countdowns,
                  status transitions from To Do to Done, and activity auditing.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="landing-feature-card">
                <div className="landing-feature-icon-wrapper">
                  <Megaphone size={24} />
                </div>
                <h3>Targeted Announcements</h3>
                <p>
                  Publish company-wide alerts or department notices with sticky pinning, ensuring
                  critical organizational updates never get lost in chat noise.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="landing-feature-card">
                <div className="landing-feature-icon-wrapper">
                  <ShieldCheck size={24} />
                </div>
                <h3>Centralized Admin Governance</h3>
                <p>
                  One Admin account manages user provisioning, group memberships, and role
                  permissions. No unauthorized self-signup or security sprawl.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. HOW IT WORKS */}
        <section id="how-it-works" className="landing-section landing-section-alt">
          <div className="landing-container">
            <div className="landing-section-header">
              <span className="landing-section-tag">Simple Workflow</span>
              <h2>How SAAS Nexus Powers Your Team</h2>
              <p>
                From initial setup to daily execution, getting your organization productive takes
                just four straightforward steps.
              </p>
            </div>

            <div className="landing-timeline-grid">
              <div className="landing-timeline-card">
                <div className="landing-timeline-number">1</div>
                <h3>Create Workspace</h3>
                <p>
                  The Administrator signs up, initializes the company workspace, and configures the
                  organization profile.
                </p>
              </div>

              <div className="landing-timeline-card">
                <div className="landing-timeline-number">2</div>
                <h3>Provision Team & Channels</h3>
                <p>
                  Admin adds colleagues with role titles, creates project channels, and sets
                  permissions.
                </p>
              </div>

              <div className="landing-timeline-card">
                <div className="landing-timeline-number">3</div>
                <h3>Collaborate in Real-Time</h3>
                <p>
                  Team members log in, chat in channels, start Google Meet video calls, and track
                  assigned tasks.
                </p>
              </div>

              <div className="landing-timeline-card">
                <div className="landing-timeline-number">4</div>
                <h3>Retain Full Control</h3>
                <p>
                  Admin monitors audit activity logs, manages permissions, and adjusts channels as
                  the team scales.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. WHY IT'S DIFFERENT */}
        <section id="why-different" className="landing-section">
          <div className="landing-container">
            <div className="landing-section-header">
              <span className="landing-section-tag">Comparison</span>
              <h2>Why Teams Choose SAAS Nexus</h2>
              <p>
                Consolidating your communication stack reduces cognitive friction, saves budget, and
                maintains total administrative oversight.
              </p>
            </div>

            <div className="landing-diff-grid">
              {/* Fragmented Tooling */}
              <div className="landing-diff-card negative">
                <div className="landing-diff-header">
                  <XCircle size={24} color="#EF4444" />
                  <h3>Fragmented Multi-App Stack</h3>
                </div>
                <ul className="landing-diff-list">
                  <li className="landing-diff-item">
                    <span>❌</span>
                    <span>
                      Juggling 4 separate subscriptions for chat, video conferencing, task boards,
                      and notifications.
                    </span>
                  </li>
                  <li className="landing-diff-item">
                    <span>❌</span>
                    <span>
                      Uncontrolled self-signups leading to orphan accounts and inconsistent member
                      directories.
                    </span>
                  </li>
                  <li className="landing-diff-item">
                    <span>❌</span>
                    <span>
                      Context switching between disconnected browser tabs just to find files or
                      meeting links.
                    </span>
                  </li>
                </ul>
              </div>

              {/* SAAS Nexus Unified */}
              <div className="landing-diff-card positive">
                <div className="landing-diff-header">
                  <ShieldCheck size={24} color="#818CF8" />
                  <h3>SAAS Nexus Unified Hub</h3>
                </div>
                <ul className="landing-diff-list">
                  <li className="landing-diff-item">
                    <span>✅</span>
                    <span>
                      All-in-one workspace with zero context switching — chat, meetings, tasks, and
                      files live together.
                    </span>
                  </li>
                  <li className="landing-diff-item">
                    <span>✅</span>
                    <span>
                      Strict Admin provisioning ensures only verified team members access company
                      assets and data.
                    </span>
                  </li>
                  <li className="landing-diff-item">
                    <span>✅</span>
                    <span>
                      Automated Google Meet scheduling and Kanban task synchronization with real-time
                      push updates.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 7. FAQ SECTION */}
        <section id="faq" className="landing-section landing-section-alt">
          <div className="landing-container">
            <div className="landing-section-header">
              <span className="landing-section-tag">Frequently Asked Questions</span>
              <h2>Common Questions & Answers</h2>
              <p>
                Have questions about SAAS Nexus? Here is everything you need to know about setup and
                governance.
              </p>
            </div>

            <div className="landing-faq-list">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="landing-faq-item">
                    <button
                      type="button"
                      className="landing-faq-question"
                      onClick={() => toggleFaq(idx)}
                      aria-expanded={isOpen}
                    >
                      <span>{faq.question}</span>
                      <ChevronDown
                        size={18}
                        style={{
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform var(--transition-fast)',
                          color: '#818CF8',
                        }}
                      />
                    </button>
                    {isOpen && <div className="landing-faq-answer">{faq.answer}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 8. FINAL CTA BANNER */}
        <section className="landing-container">
          <div className="landing-cta-banner">
            <div className="landing-cta-banner-inner">
              <h2>Ready to Unify Your Company's Work?</h2>
              <p>
                Set up your company workspace in under 2 minutes. Empower your team with real-time
                communication and clean administrative control.
              </p>
              <button
                type="button"
                onClick={() => onNavigateAuth && onNavigateAuth(false)}
                className="landing-btn-banner-cta"
              >
                <span>Launch Your Workspace Now</span>
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* 9. FOOTER */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-grid">
            <div className="landing-footer-brand">
              <div className="landing-brand">
                <div className="landing-brand-icon">
                  <Layers size={20} />
                </div>
                <span>
                  SAAS <span style={{ color: '#818cf8' }}>Nexus</span>
                </span>
              </div>
              <p>
                The modern internal collaboration platform built for teams who value focus, speed,
                and centralized administrative governance.
              </p>
            </div>

            <div className="landing-footer-col">
              <h4>Product</h4>
              <ul>
                <li>
                  <a href="#features" onClick={(e) => handleNavClick(e, 'features')}>
                    Features
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" onClick={(e) => handleNavClick(e, 'how-it-works')}>
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="#why-different" onClick={(e) => handleNavClick(e, 'why-different')}>
                    Why Nexus
                  </a>
                </li>
                <li>
                  <a href="#faq" onClick={(e) => handleNavClick(e, 'faq')}>
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            <div className="landing-footer-col">
              <h4>Platform</h4>
              <ul>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigateAuth && onNavigateAuth(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: '#94A3B8',
                      cursor: 'pointer',
                      fontSize: '13.5px',
                    }}
                  >
                    Admin Sign In
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigateAuth && onNavigateAuth(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: '#94A3B8',
                      cursor: 'pointer',
                      fontSize: '13.5px',
                    }}
                  >
                    Create Workspace
                  </button>
                </li>
                <li>
                  <a href="#features">API & Integrations</a>
                </li>
                <li>
                  <a href="#features">Security & RBAC</a>
                </li>
              </ul>
            </div>

            <div className="landing-footer-col">
              <h4>Company</h4>
              <ul>
                <li>
                  <a href="#">About SAAS Nexus</a>
                </li>
                <li>
                  <a href="#">Security Overview</a>
                </li>
                <li>
                  <a href="#">Privacy Policy</a>
                </li>
                <li>
                  <a href="#">Terms of Service</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="landing-footer-bottom">
            <span>&copy; {new Date().getFullYear()} SAAS Nexus Technologies Inc. All rights reserved.</span>
            <span>Enterprise Internal Workspace Platform</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
