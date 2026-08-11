import { Link } from 'react-router-dom';
export function NotFoundPage() { return <div className="center-screen"><img src="/ssu-logo.png" alt="SSU" className="not-found-logo" /><h1>Page not found</h1><p>The requested portal page does not exist.</p><Link className="primary-btn" to="/">Return home</Link></div>; }
