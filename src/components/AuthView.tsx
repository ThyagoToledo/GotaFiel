import React, { useState } from 'react';
import { LogIn, UserPlus, Sparkles, ShieldCheck, Droplets, Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
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
      <section className="w-full max-w-sm bg-surface-container-lowest border border-outline-variant/80 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col gap-5">
        {/* App Logo & Branding */}
        <div className="flex flex-col items-center justify-center text-center gap-2.5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-navy via-primary to-primary-container p-0.5 shadow-lg flex items-center justify-center">
            <img
              src="/icon.svg"
              alt="GotaFiel Logo"
              className="w-full h-full rounded-[14px] object-cover"
            />
          </div>

          <div>
            <h2 className="text-primary font-black text-2xl tracking-tight flex items-center justify-center gap-1.5">
              GotaFiel
            </h2>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">
              Tecnologia & Metrologia de Pulverização
            </p>
          </div>
        </div>

        {/* Form Title */}
        <div className="text-center">
          <h1 className="text-xl font-bold text-on-surface">
            {mode === 'login' ? 'Acessar sua Conta' : 'Criar Novo Cadastro'}
          </h1>
          <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
            Seus dados, fotos e históricos de talhões ficam salvos e sincronizados com segurança.
          </p>
        </div>

        {error && (
          <div role="alert" className="p-3 rounded-xl bg-error-container text-on-error-container border border-error/40 text-xs leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-xs font-bold text-on-surface-variant">
            Nome de Usuário
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
              maxLength={80}
              autoComplete="username"
              className="h-11 rounded-xl border border-outline-variant bg-surface px-3.5 text-sm text-on-surface font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs"
              placeholder="Digite seu nome ou usuário"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-bold text-on-surface-variant">
            Senha
            <div className="relative flex items-center">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                maxLength={200}
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full h-11 rounded-xl border border-outline-variant bg-surface pl-3.5 pr-11 text-sm text-on-surface font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs"
                placeholder="Mínimo de 8 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-1 w-9 h-9 flex items-center justify-center text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
                title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-primary" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </label>

          <button
            disabled={isSubmitting}
            className="h-12 rounded-xl bg-primary text-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-primary-container active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 mt-1"
          >
            {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {isSubmitting ? 'Validando…' : mode === 'login' ? 'Entrar no GotaFiel' : 'Criar Conta Gratuita'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError('');
          }}
          className="text-xs text-primary font-bold hover:underline text-center cursor-pointer py-1"
        >
          {mode === 'login' ? 'Ainda não tem conta? Crie uma agora' : 'Já possui cadastro? Clique para entrar'}
        </button>
      </section>
    </main>
  );
};
