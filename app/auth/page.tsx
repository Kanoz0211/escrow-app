// app/auth/page.tsx
import AuthForm from '../../components/AuthForm' // แก้ path ให้ถูกต้อง

export default function AuthPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f4f9' }}>
      <AuthForm />
    </main>
  )
}