"use client";

import { Suspense, useActionState, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import {
  signIn,
  requestPasswordReset,
  type LoginState,
  type ResetState,
} from "@/app/auth/actions";
import { Logo } from "@/components/logo";

const inputCls =
  "w-full rounded-lg border border-line-strong bg-white px-3 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-faint focus:border-steel focus:ring-2 focus:ring-steel/20";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/painel";

  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    signIn,
    {},
  );
  const [reset, resetAction, resetting] = useActionState<ResetState, FormData>(
    requestPasswordReset,
    {},
  );
  const [showPw, setShowPw] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold text-ink">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@alumaxi.com.br"
          required
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-[13px] font-semibold text-ink">
          Senha
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPw ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            required
            className={`${inputCls} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? "Ocultar senha" : "Mostrar senha"}
            className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-faint transition-colors hover:text-muted"
          >
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <button
          type="button"
          onClick={() => resetAction(new FormData(formRef.current ?? undefined))}
          disabled={resetting}
          className="mt-2 text-[12.5px] font-medium text-steel hover:underline disabled:opacity-60"
        >
          {resetting ? "Enviando..." : "Esqueceu a senha?"}
        </button>
      </div>

      {state.error && (
        <p className="rounded-lg bg-danger-50 px-3 py-2 text-[12.5px] font-medium text-danger">
          {state.error}
        </p>
      )}
      {reset.error && (
        <p className="rounded-lg bg-danger-50 px-3 py-2 text-[12.5px] font-medium text-danger">
          {reset.error}
        </p>
      )}
      {reset.ok && (
        <p className="rounded-lg bg-success-50 px-3 py-2 text-[12.5px] font-medium text-success">
          {reset.ok}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-steel px-4 py-3 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(46,91,255,0.7)] transition-colors hover:bg-steel-600 disabled:opacity-60"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="grain relative grid min-h-full place-items-center overflow-hidden bg-brand-gradient px-4 py-10">
      {/* halos — ponto de luz no canto inferior direito */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-28 h-[480px] w-[480px] rounded-full bg-steel/25 blur-[130px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#02030c]/80 blur-[120px]"
      />

      <div className="relative z-10 w-full max-w-[380px]">
        <div className="mb-7 flex justify-center">
          <Logo variant="full" priority className="h-14 w-auto" />
        </div>

        <div className="rounded-[22px] border border-white/60 bg-white p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)]">
          <h1 className="font-display text-[20px] text-ink">Entrar</h1>
          <p className="mb-6 mt-1 text-[12.5px] leading-relaxed text-muted">
            Acesse o painel de gestao de obras da Alumaxi.
          </p>
          <Suspense fallback={<div className="h-72" />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-5 text-center text-[11px] tracking-wide text-white/40">
          Alumaxi · gestao de obras
        </p>
      </div>
    </div>
  );
}
