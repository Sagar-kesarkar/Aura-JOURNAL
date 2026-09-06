'use client';
import { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Feather,
  GitBranch,
  Mic,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../lib/auth-context';

export function WelcomePage({ onEnterDemo }: { onEnterDemo: () => void }) {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    setError('');
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message || 'Failed to sign in with Google. Please retry.');
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="welcome-page">
      <header className="welcome-header">
        <div className="brand" aria-label="Aura Journal">
          <span className="brand-mark">
            <Feather size={23} />
          </span>
          aura<span className="brand-dot">.</span>
          <span className="welcome-brand-label">JOURNAL</span>
        </div>
        <span className="welcome-header-note">A LITTLE SPACE FOR YOURSELF</span>
      </header>
      <main className="welcome-main">
        <section className="welcome-intro" aria-labelledby="welcome-title">
          <span className="welcome-emblem">
            <Feather size={30} strokeWidth={1.4} />
          </span>
          <div className="eyebrow">
            <Sparkles size={14} /> YOUR THOUGHTS. A LITTLE CLEARER.
          </div>
          <h1 id="welcome-title">
            A place to pause.
            <br />A little space to <em>just be.</em>
          </h1>
          <p className="welcome-description">
            Write what’s on your mind, speak a thought out loud,
            <br className="welcome-desktop-break" /> and find the threads that
            connect your days.
          </p>
          <div className="welcome-actions">
            <button
              className="primary google-signin"
              disabled={isSigningIn}
              onClick={handleGoogleSignIn}
              aria-describedby="google-availability"
            >
              <span className="google-letter" aria-hidden="true">
                G
              </span>{' '}
              {isSigningIn ? 'Connecting with Google…' : 'Sign in with Google'}{' '}
              <ArrowRight size={17} />
            </button>
            <button className="secondary demo-signin" onClick={onEnterDemo}>
              Explore the demo <ArrowRight size={17} />
            </button>
          </div>
          <p id="google-availability" className="welcome-signin-note">
            Firebase Google Authentication · Cloud sync & Gemini reflections
          </p>
          {error && (
            <div className="welcome-auth-error" role="alert">
              {error}
            </div>
          )}
          <p className="welcome-demo-note">
            Or select &ldquo;Explore the demo&rdquo; to test offline without signing in.
          </p>
        </section>
        <section className="welcome-features" aria-label="Explore Aura Journal">
          <article>
            <span>
              <BookOpen size={21} />
            </span>
            <h2>Let your thoughts land.</h2>
            <p>
              A calm place to write, revisit a moment, and give an unfinished
              thought some room.
            </p>
          </article>
          <article>
            <span>
              <Mic size={21} />
            </span>
            <h2>Sometimes, just say it.</h2>
            <p>
              Record a reflection, listen back, and add a reviewed transcript to
              your journal.
            </p>
          </article>
          <article>
            <span>
              <GitBranch size={21} />
            </span>
            <h2>See a little more clearly.</h2>
            <p>
              Explore sample recurring threads and a weekly review, all in the
              same thoughtful space.
            </p>
          </article>
        </section>
        <div className="welcome-closing">
          <Feather size={15} />
          <span>One thought at a time is enough.</span>
        </div>
      </main>
      <footer className="welcome-footer">
        <span>Aura Journal</span>
        <span>
          A frontend preview · AI and cloud services are not connected
        </span>
      </footer>
    </div>
  );
}
