import './globals.css';
import { Navbar } from '@/components/Navbar';

export const metadata = {
  title: 'VideoMeet',
  description: 'Video calling with chat, transcripts, and AI assistant',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased">
        <Navbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
