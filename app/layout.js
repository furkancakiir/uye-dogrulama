import "./globals.css";

export const metadata = {
  title: "Üye Doğrulama | AK Parti Başakşehir",
  description: "AK Parti Başakşehir İlçe Teşkilatı Üye Doğrulama Sistemi",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Source+Sans+3:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
