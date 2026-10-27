import type { ReactNode } from 'react';
import { Providers } from '../src/providers';

export const metadata = { title: 'Notification service' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
