import './globals.css';
import { AuthProvider } from '@/features/auth/AuthProvider';

export const metadata = {
  title: 'RSVR Secure Authentication',
  description: 'Sign in with an email code or a passkey. One active session per account.',
};

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
