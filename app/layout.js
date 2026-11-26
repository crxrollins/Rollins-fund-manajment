import './globals.css';

export const metadata = {
  title: 'Rollins Fund Management',
  description: 'Track your investments, transactions and projects in one place.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
