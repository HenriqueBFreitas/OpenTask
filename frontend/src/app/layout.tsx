import type { Metadata } from 'next';
import { Inter, Lora } from 'next/font/google';
import ExcalidrawWrapper from '../../components/ExcalidrawWrapper';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const lora = Lora({ subsets: ['latin'], variable: '--font-lora' });

export const metadata: Metadata = {
  title: 'OpenTask',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
        <body className={`${inter.variable} ${lora.variable} ${inter.className}`} suppressHydrationWarning>
          {children}
        </body>
      </html>
  );
  
}