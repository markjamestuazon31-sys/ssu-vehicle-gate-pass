import {
  ArrowRight,
  BadgeCheck,
  CarFront,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileCheck2,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const SSU_WEBSITE = 'https://www.ssu.edu.ph/';

export function LandingPage() {
  return (
    <div className="ssu2-home" id="top">
      <header className="ssu2-header">
        <div className="ssu2-header-inner">
          <a className="ssu2-brand" href="#top" aria-label="Samar State University home">
            <img src="/ssu-logo.png" alt="Samar State University seal" />
            <div>
              <strong>Samar State University</strong>
              <span>Vehicle Registration, Security &amp; Gate Pass Program</span>
            </div>
          </a>

          <nav className="ssu2-nav" aria-label="Main navigation">
            <a href="#about">About SSU</a>
            <a href="#process">How it works</a>
            <a href="#guidelines">Guidelines</a>
            <a className="ssu2-site-link" href={SSU_WEBSITE} target="_blank" rel="noreferrer">
              SSU Website <ExternalLink size={14} />
            </a>
            <Link className="ssu2-login-btn" to="/login">Portal Login</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="ssu2-hero">
          <div className="ssu2-hero-copy">
            <span className="ssu2-kicker"> CAMPUS SAFETY &amp; MOBILITY</span>
            <h1>One-Stop Vehicle Registration, Security &amp; Gate Pass Program</h1>
            <p>
              A secure digital service for students, personnel, and authorized stakeholders who bring vehicles inside Samar State University premises.
            </p>

            <div className="ssu2-hero-actions">
              <Link className="ssu2-primary" to="/register">
                Start Registration <ArrowRight size={18} />
              </Link>
              <Link className="ssu2-secondary" to="/login">Track Application</Link>
            </div>

            <div className="ssu2-trust-row">
              <span><ShieldCheck size={17} /> Secure access</span>
              <span><FileCheck2 size={17} /> Document review</span>
              <span><BadgeCheck size={17} /> Approval tracking</span>
            </div>
          </div>

          <div className="ssu2-hero-card" aria-label="Samar State University program overview">
            <div className="ssu2-hero-brand">
              <img src="/ssu-logo.png" alt="SSU seal" />
              <div>
                <small>SAMAR STATE UNIVERSITY</small>
                <strong>We Innovate. We Build. We Serve.</strong>
                <span>Catbalogan City, Samar</span>
              </div>
            </div>

            <div className="ssu2-feature-grid">
              <div><CarFront size={21} /><strong>Register</strong><span>Vehicle details</span></div>
              <div><ClipboardCheck size={21} /><strong>Validate</strong><span>Documents</span></div>
              <div><ShieldCheck size={21} /><strong>Review</strong><span>Administrative check</span></div>
              <div><BadgeCheck size={21} /><strong>Approve</strong><span>Sticker &amp; gate pass</span></div>
            </div>
          </div>
        </section>

        <section className="ssu2-purpose">
          <div className="ssu2-purpose-inner">
            <strong>Purpose of the program</strong>
            <span>Safer campus entry, organized vehicle records, accountable gate-pass issuance, and efficient traffic management.</span>
          </div>
        </section>

        <section className="ssu2-section" id="about">
          <div className="ssu2-section-head ssu2-section-head-left">
            <span className="ssu2-kicker">ABOUT SAMAR STATE UNIVERSITY</span>
            <h2>University identity integrated into a focused campus service.</h2>
            <p>
              This portal keeps the Samar State University identity visible while providing a dedicated online workflow for vehicle registration and gate-pass processing.
            </p>
          </div>

          <div className="ssu2-about-grid">
            <article className="ssu2-about-main">
              <div className="ssu2-about-brand">
                <img src="/ssu-logo.png" alt="Samar State University seal" />
                <div>
                  <span>University</span>
                  <h3>Samar State University</h3>
                  <p>Arteche Boulevard, Catbalogan City, Samar 6700</p>
                </div>
              </div>

              <div className="ssu2-mantra">
                <span>University mantra</span>
                <strong>We Innovate.</strong>
                <strong>We Build.</strong>
                <strong>We Serve.</strong>
              </div>

              <a className="ssu2-inline-link" href={SSU_WEBSITE} target="_blank" rel="noreferrer">
                Visit the official SSU website <ExternalLink size={15} />
              </a>
            </article>

            <div className="ssu2-about-points">
              <article>
                <CheckCircle2 />
                <div><strong>Official university identity</strong><p>SSU branding, institutional colors, and service information are presented consistently throughout the portal.</p></div>
              </article>
              <article>
                <MapPin />
                <div><strong>Campus-focused service</strong><p>The system is designed around vehicle registration, security validation, gate-pass processing, and sticker release.</p></div>
              </article>
              <article>
                <ShieldCheck />
                <div><strong>Role-based access</strong><p>Applicants and administrators use one secure sign-in. Access is determined automatically by the account role.</p></div>
              </article>
            </div>
          </div>
        </section>

        <section className="ssu2-section ssu2-soft" id="process">
          <div className="ssu2-section-head">
            <span className="ssu2-kicker"></span>
            <h2>From registration to sticker release</h2>
            <p>A clear four-step process keeps applicants informed while giving authorized personnel a structured review workflow.</p>
          </div>

          <div className="ssu2-steps">
            <article><span>01</span><h3>Create an account</h3><p>Register using a valid email address and select the appropriate applicant type.</p></article>
            <article><span>02</span><h3>Submit vehicle records</h3><p>Provide driver, vehicle, CR, OR, ownership, and supporting document details.</p></article>
            <article><span>03</span><h3>Administrative review</h3><p>Authorized personnel validate the application and review uploaded supporting documents.</p></article>
            <article><span>04</span><h3>Approval &amp; pickup</h3><p>Approved applicants receive gate-pass, sticker-validity, and pickup instructions in the portal.</p></article>
          </div>
        </section>

        <section className="ssu2-section" id="guidelines">
          <div className="ssu2-section-head ssu2-section-head-left">
            <span className="ssu2-kicker">GENERAL GUIDANCE</span>
            <h2>Important reminders before applying</h2>
          </div>

          <div className="ssu2-guidelines">
            <article><strong>Prepare valid records</strong><p>Keep your driver’s license, CR, OR, vehicle details, and other required information ready before starting.</p></article>
            <article><strong>Use clear document images</strong><p>Uploaded images should be readable and should match the information entered in the registration form.</p></article>
            <article><strong>Keep information current</strong><p>Changes in ownership, plate number, contact information, or relevant vehicle records should be reported.</p></article>
            <article><strong>Follow campus rules</strong><p>Registration does not replace university traffic, parking, inspection, safety, and security requirements.</p></article>
          </div>
        </section>

        <section className="ssu2-cta-wrap">
          <div className="ssu2-cta">
            <div>
              <span>READY TO REGISTER?</span>
              <h2>Complete your vehicle application online.</h2>
              <p>Use one secure account to submit, track, and receive approval or sticker-pickup instructions.</p>
            </div>
            <Link className="ssu2-cta-btn" to="/register">Create Applicant Account <ArrowRight size={18} /></Link>
          </div>
        </section>
      </main>

      <footer className="ssu2-footer">
        <div className="ssu2-footer-inner">
          <div className="ssu2-footer-brand">
            <img src="/ssu-logo.png" alt="SSU seal" />
            <div><strong>Samar State University</strong><span>Catbalogan City, Samar, Philippines</span></div>
          </div>
          <div className="ssu2-footer-copy">
            <strong>Vehicle Registration, Security &amp; Gate Pass Portal</strong>
            <a href={SSU_WEBSITE} target="_blank" rel="noreferrer">Official SSU Website <ExternalLink size={13} /></a>
          </div>
        </div>
      </footer>
    </div>
  );
}
