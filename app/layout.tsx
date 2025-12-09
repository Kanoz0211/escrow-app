// app/layout.tsx
import './globals.css'
import Navbar from '../components/Navbar' // 👈 Import มาใช้

export const metadata = {
  title: 'Escrow Marketplace',
  description: 'ตลาดกลางซื้อขายปลอดภัย',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Navbar /> {/* 👈 แปะไว้ตรงนี้ (เหนือ children) */}
        {children} {/* นี่คือเนื้อหาของแต่ละหน้า (Page) */}
      </body>
    </html>
  )
}