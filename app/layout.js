import "./globals.css";

export const metadata = {
  title: "AI Radar",
  description: "Ranking operativo de senales de AI Radar",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
