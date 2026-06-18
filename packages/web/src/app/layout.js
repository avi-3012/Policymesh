import { Providers } from './providers';
import './globals.css';

export const metadata = {
  title: 'PolicyMesh — Hedera Procurement Agent',
  description: 'Autonomous decentralized infrastructure procurement with policy enforcement',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
