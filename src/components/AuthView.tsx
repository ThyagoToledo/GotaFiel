import React, { useState } from 'react';
import { Droplets, LogIn, UserPlus } from 'lucide-react';
import { api, AuthUser } from '../api/client';

interface AuthViewProps {
  onAuthenticated: (user: AuthUser) => Promise<void> | void;
  initialError?: string;
}

const messages: Record<string, string> = {
  NOME_INVALIDO: 'Informe um nome entre 2 e 80 caracteres.',
  SENHA_INVALIDA: 'A senha precisa ter entre 8 e 200 caracteres.',
  NOME_JA_CADASTRADO: 'Esse nome já está cadastrado. Entre ou escolha outro.',
  CREDENCIAIS_INVALIDAS: 'Nome ou senha inválidos.',
  MUITAS_TENTATIVAS: 'Muitas tentativas para este nome. Aguarde 15 minutos e tente novamente.',
  BANCO_INDISPONIVEL: 'O banco não está disponível. Confira a conexão Neon da Vercel e tente novamente.',
};

export const AuthView: React.FC<AuthViewProps> = ({ onAuthenticated, initialError }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialError ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const result = mode === 'login' ? await api.login(name, password) : await api.register(name, password);
      await onAuthenticated(result.user);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : 'BANCO_INDISPONIVEL';
      setError(messages[code] ?? 'Não foi possível concluir a operação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface dark:bg-background flex items-center justify-center p-4">
      <section className="w-full max-w-sm bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col items-center justify-center gap-2">
          <img src="/icon.svg" alt="GotaFiel Logo" className="w-16 h-16 rounded-2xl shadow-md" />
          <span className="text-primary font-extrabold text-2xl tracking-tight">GotaFiel</span>
        </div>
        <h1 className="text-2xl font-bold text-on-surface text-center mt-6">{mode === 'login' ? 'Entrar' : 'Criar usuário'}</h1>
        <p className="text-sm text-on-surface-variant text-center mt-2 leading-relaxed">Suas análises e imagens privadas ficam separadas por usuário e só aparecem depois da autenticação.</p>
        {error && <div role="alert" className="mt-5 p-3 rounded-xl bg-error-container text-on-error-container border border-error/40 text-xs leading-relaxed">{error}</div>}
        <form onSubmit={submit} className="flex flex-col gap-4 mt-6">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-on-surface-variant">Nome<input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={80} autoComplete="username" className="h-12 rounded-xl border border-outline-variant bg-surface px-3 text-base text-on-surface focus:outline-none focus:border-primary" placeholder="Seu nome" /></label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-on-surface-variant">Senha<input value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} maxLength={200} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="h-12 rounded-xl border border-outline-variant bg-surface px-3 text-base text-on-surface focus:outline-none focus:border-primary" placeholder="Mínimo de 8 caracteres" /></label>
          <button disabled={isSubmitting} className="h-12 rounded-xl bg-primary text-on-primary font-bold flex items-center justify-center gap-2 disabled:opacity-50">{mode === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}{isSubmitting ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}</button>
        </form>
        <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} className="w-full mt-4 text-sm text-primary font-semibold hover:underline">{mode === 'login' ? 'Ainda não tenho conta' : 'Já tenho uma conta'}</button>
      </section>
    </main>
  );
};
