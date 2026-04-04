'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    setError('');
    setSuccess('');

    const url = isLogin
      ? 'http://localhost:8000/api/users/login/'
      : 'http://localhost:8000/api/users/register/';

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || data.username?.[0] || 'Algo deu errado.');
        return;
      }
      if (isLogin) {
        localStorage.setItem('access', data.access);
        localStorage.setItem('refresh', data.refresh);
        document.cookie = `access=${data.access}; path=/`;
        router.push('/');
      } else {
        setSuccess('Conta criada! Agora é só entrar.');
        setIsLogin(true);
        setUsername('');
        setPassword('');
      }
    } catch {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: '#f0ede8', backgroundImage: 'radial-gradient(#c8c4be 1px, transparent 1px)', backgroundSize: '20px 20px' }}
    >
      {/* Logo */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold text-gray- mt-3" style={{ fontFamily: 'var(--font-lora)' }}>
          {isLogin ? 'Entrar ou cadastrar-se' : 'Criar sua conta'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Começe a se organizar com a StudyXP</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-500 text-sm text-center">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-green-600 text-sm text-center">{success}</p>
          </div>
        )}

        <div className="space-y-3">
          {/* Username */}
          <input
            type="text"
            placeholder="Digite seu usuário"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            disabled={loading}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all shadow-sm"
          />

          {/* Password */}
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              disabled={loading}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all shadow-sm pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!username.trim() || !password.trim() || loading}
            className="w-full py-3 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-400 text-white text-sm font-medium rounded-xl transition-all active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                {isLogin ? 'Entrando...' : 'Criando...'}
              </>
            ) : (
              isLogin ? 'Continuar' : 'Criar conta'
            )}
          </button>
        </div>

        {/* Switch */}
        <p className="text-center text-sm text-gray-500 mt-5">
          {isLogin ? 'Não tem conta?' : 'Já tem conta?'}{' '}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setSuccess('');
              setUsername('');
              setPassword('');
            }}
            className="text-gray-700 font-semibold hover:underline cursor-pointer"
          >
            {isLogin ? 'Cadastre-se' : 'Entrar'}
          </button>
        </p>
      </div>

      {/* Footer */}
      <p className="mt-12 text-xs text-gray-400">StudyXP © 2026</p>
    </div>
  );
}