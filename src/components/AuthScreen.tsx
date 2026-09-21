import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../state/AuthContext";
import { AuthApiError } from "../services/auth/userAuthService";

export default function AuthScreen(): React.JSX.Element {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password);
    } catch (cause: unknown) {
      setError(cause instanceof AuthApiError ? cause.message : "请求失败，请稍后重试。");
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-card" aria-labelledby="auth-title">
        <p className="auth-kicker">PROMETHEUS · GLOBAL GUARDIAN</p>
        <h1 id="auth-title">全球灾害态势</h1>
        <p className="auth-description">登录后查看实时监测、分析报告和 AI 会话。</p>

        <div className="auth-tabs" role="tablist" aria-label="账号操作">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            登录
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "register"}
            className={mode === "register" ? "active" : ""}
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            注册
          </button>
        </div>

        <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
          <label htmlFor="auth-email">邮箱</label>
          <input
            id="auth-email"
            autoComplete="email"
            type="email"
            maxLength={320}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <label htmlFor="auth-password">密码</label>
          <input
            id="auth-password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            type="password"
            minLength={mode === "register" ? 12 : undefined}
            maxLength={128}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {mode === "register" && <p className="auth-help">密码长度为 12 至 128 个字符。</p>}
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <button className="auth-submit" type="submit" disabled={pending}>
            {pending ? "处理中…" : mode === "login" ? "登录系统" : "创建账号"}
          </button>
        </form>
      </section>
    </main>
  );
}
