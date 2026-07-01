import { useState, useEffect } from 'react'
import axios from 'axios'
import { Terminal, Code2, Play, Loader2, LogOut, Keyboard } from 'lucide-react'
import Editor from '@monaco-editor/react'

axios.defaults.baseURL = 'https://codeditor-api.onrender.com'

const defaultPython = 'print(f"Hello, World!")'
const defaultCpp = '#include <iostream>\n#include <string>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}'

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')

  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [resetToken, setResetToken] = useState(null)
  const [resetMessage, setResetMessage] = useState('')

  const [language, setLanguage] = useState(localStorage.getItem('codeditor-lang') || 'python')

  const [code, setCode] = useState(() => {
    const initialLang = localStorage.getItem('codeditor-lang') || 'python'
    const savedCode = localStorage.getItem(`codeditor-code-${initialLang}`)
    return savedCode || (initialLang === 'python' ? defaultPython : defaultCpp)
  })
  const [stdin, setStdin] = useState(localStorage.getItem('codeditor-stdin') || '')
  const [output, setOutput] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const tokenFromUrl = urlParams.get('reset_token')
    if (tokenFromUrl) {
      setResetToken(tokenFromUrl)
      window.history.replaceState({}, document.title, "/")
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey

      if (isCmdOrCtrl && e.key === 'Enter') {
        e.preventDefault()
        handleRunCode()
      }

      if (isCmdOrCtrl && e.key === 's') {
        e.preventDefault()

        localStorage.setItem(`codeditor-code-${language}`, code)
        localStorage.setItem('codeditor-stdin', stdin)
        localStorage.setItem('codeditor-lang', language)

        setOutput((prev) => `[System] Workspace saved locally at ${new Date().toLocaleTimeString()}\n\n` + prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [code, language, stdin])

  const handleAuth = async (e) => {
    e.preventDefault()
    setAuthError('')

    try {
      const endpoint = isLogin ? '/login' : '/register'
      const response = await axios.post(endpoint, { email, password })

      if (isLogin) {
        const accessToken = response.data.access_token
        localStorage.setItem('token', accessToken)
        setToken(accessToken)
      } else {
        setIsLogin(true)
        alert("Registration successful! Please log in.")
        setPassword('')
      }
    } catch (err) {
      setAuthError(err.response?.data?.detail || "Authentication failed")
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setAuthError('')
    setResetMessage('')
    try {
      await axios.post('/forgot-password', { email })
      setResetMessage("If an account exists, a reset link has been sent to your email.")
    } catch (err) {
      setAuthError("Failed to process request.")
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setAuthError('')
    try {
      await axios.post('/reset-password', { token: resetToken, new_password: password })
      alert("Password reset successful! Please log in with your new password.")
      setResetToken(null)
      setIsLogin(true)
      setPassword('')
    } catch (err) {
      setAuthError(err.response?.data?.detail || "Failed to reset password. Link may be expired.")
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setOutput('')
  }

  const handleLanguageChange = (e) => {
    const newLang = e.target.value

    localStorage.setItem(`codeditor-code-${language}`, code)

    setLanguage(newLang)
    localStorage.setItem('codeditor-lang', newLang)

    const savedCode = localStorage.getItem(`codeditor-code-${newLang}`)

    if (savedCode) setCode(savedCode)
    else setCode(newLang === 'python' ? defaultPython : defaultCpp)
  }

  const handleRunCode = async () => {
    setIsExecuting(true)
    setOutput('Executing in cloud container...\n')

    try {
      const response = await axios.post('/execute', { language, code, stdin })
      const { stdout, stderr, exit_code, error } = response.data

      if (error) {
        setOutput(`[System Timeout/Error]\n${error}`)
      } else if (exit_code !== 0) {
        setOutput(`[Compilation/Runtime Error - Exit Code ${exit_code}]\n\n${stderr}`)
      } else {
        setOutput(stdout || '[Program finished with no output]')
      }
    } catch (err) {
      setOutput(`[Network Error]\nCould not reach the execution engine.\n\n${err.message}`)
    } finally {
      setIsExecuting(false)
    }
  }

  if (token) {
    return (
      <div className="h-screen bg-[#0A0A0C] text-zinc-300 flex flex-col overflow-hidden font-sans selection:bg-indigo-500/30">
        <header className="bg-[#0E0E11]/80 backdrop-blur-xl border-b border-white/[0.04] px-6 py-3 flex justify-between items-center shrink-0 z-20">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 p-1.5 rounded-lg border border-indigo-500/20 shadow-inner">
                <Code2 size={18} className="text-indigo-400" />
              </div>
              <h1 className="text-base font-semibold tracking-wide text-zinc-100">
                CodeditoR
              </h1>
            </div>

            <div className="h-5 w-px bg-white/[0.08] mx-2"></div>

            <div className="relative group">
              <select
                value={language}
                onChange={handleLanguageChange}
                className="appearance-none bg-[#18181B] border border-white/[0.08] text-sm text-zinc-300 rounded-lg pl-4 pr-10 py-1.5 cursor-pointer hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-sm"
              >
                <option value="python">Python 3.11</option>
                <option value="cpp">C++ (g++)</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 group-hover:text-zinc-300 transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleRunCode}
              disabled={isExecuting}
              title="Run Code"
              className="bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 disabled:from-zinc-800 disabled:to-zinc-800 text-white disabled:text-zinc-500 font-medium px-6 py-1.5 rounded-lg shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] disabled:shadow-none border border-indigo-400/30 disabled:border-transparent transition-all flex items-center gap-2 text-sm"
            >
              {isExecuting ? <Loader2 size={14} className="animate-spin" /> : <Play size={12} className="fill-current" />}
              {isExecuting ? 'Executing...' : 'Run Code'}
            </button>
            <div className="h-5 w-px bg-white/[0.08]"></div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-col lg:flex-row min-h-0 bg-[#0A0A0C]">
          <div className="flex-1 relative pt-4">
            <Editor
              height="100%"
              language={language}
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || '')}
              onMount={(editor, monaco) => {
                editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                  const runBtn = document.querySelector('button[title="Run Code"]');
                  if (runBtn && !runBtn.disabled) {
                    runBtn.click();
                  }
                });

                editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                  const event = new KeyboardEvent('keydown', {
                    key: 's',
                    ctrlKey: true,
                    metaKey: true,
                    bubbles: true
                  });
                  window.dispatchEvent(event);
                });

                monaco.editor.defineTheme('oceanic', {
                  base: 'vs-dark',
                  inherit: true,
                  rules: [],
                  colors: {
                    'editor.background': '#0A0A0C',
                    'editor.lineHighlightBackground': '#FFFFFF05',
                    'editorLineNumber.foreground': '#FFFFFF20',
                    'editorLineNumber.activeForeground': '#FFFFFF60',
                    'editorIndentGuide.background': '#FFFFFF10',
                    'editorIndentGuide.activeBackground': '#FFFFFF30',
                  }
                });
                monaco.editor.setTheme('oceanic');
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                fontLigatures: true,
                padding: { top: 8, bottom: 24 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                lineNumbersMinChars: 4,
                lineDecorationsWidth: 12,
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                formatOnPaste: true,
                scrollbar: {
                  verticalScrollbarSize: 10,
                  horizontalScrollbarSize: 10,
                  useShadows: false,
                }
              }}
            />
          </div>

          <div className="w-full lg:w-[420px] xl:w-[480px] flex flex-col min-h-0 shrink-0 bg-[#0E0E11] border-l border-white/[0.04] shadow-2xl relative z-10">
            <div className="flex flex-col h-[45%] border-b border-white/[0.04] bg-[#0A0A0C]/50">
              <div className="px-5 py-3 flex items-center justify-between shrink-0 bg-white/[0.01] border-b border-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Keyboard size={14} className="text-zinc-500" />
                  <span className="text-[11px] font-bold tracking-widest text-zinc-400 uppercase">Standard Input</span>
                </div>
              </div>
              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                placeholder="Enter input values here..."
                className="w-full flex-1 bg-transparent px-5 py-4 font-mono text-[13px] leading-relaxed text-zinc-300 placeholder:text-zinc-700 resize-none focus:outline-none transition-colors"
                spellCheck="false"
              />
            </div>

            <div className="flex flex-col flex-1 min-h-0 bg-[#0A0A0C]/50">
              <div className="px-5 py-3 flex items-center justify-between shrink-0 bg-white/[0.01] border-b border-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-zinc-500" />
                  <span className="text-[11px] font-bold tracking-widest text-zinc-400 uppercase">Output Console</span>
                </div>
              </div>
              <div className="px-5 py-4 flex-1 overflow-auto">
                <pre className="font-mono text-[13px] text-zinc-300 whitespace-pre-wrap break-words leading-relaxed selection:bg-indigo-500/40">
                  {output || <span className="text-zinc-700 italic">No output yet. Run your code to see results.</span>}
                </pre>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0C] flex font-sans selection:bg-indigo-500/30">
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 bg-[#0E0E11] border-r border-white/[0.04] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none flex items-center justify-center">
          <div className="w-[800px] h-[800px] rounded-full bg-indigo-600/10 blur-[120px] mix-blend-screen"></div>
          <div className="absolute -bottom-1/4 -right-1/4 w-[600px] h-[600px] rounded-full bg-cyan-600/10 blur-[100px] mix-blend-screen"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-20">
            <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 p-2.5 rounded-xl border border-indigo-500/20 shadow-inner">
              <Code2 size={24} className="text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-wide text-zinc-100">CodeditoR</h1>
          </div>

          <div className="space-y-8">
            <h2 className="text-5xl font-bold text-zinc-100 leading-[1.15] tracking-tight">
              Your high-performance <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400">
                cloud workspace.
              </span>
            </h2>

            <div className="space-y-6 mt-12">
              <div className="flex items-center gap-5 text-zinc-400 group">
                <div className="bg-white/[0.03] p-3 rounded-xl border border-white/[0.05] group-hover:bg-white/[0.06] transition-colors"><Terminal size={22} className="text-cyan-400" /></div>
                <p className="text-base font-medium">Isolated cloud containers for secure execution.</p>
              </div>
              <div className="flex items-center gap-5 text-zinc-400 group">
                <div className="bg-white/[0.03] p-3 rounded-xl border border-white/[0.05] group-hover:bg-white/[0.06] transition-colors"><Play size={22} className="text-indigo-400" /></div>
                <p className="text-base font-medium">Real-time compilation for C++ and Python.</p>
              </div>
              <div className="flex items-center gap-5 text-zinc-400 group">
                <div className="bg-white/[0.03] p-3 rounded-xl border border-white/[0.05] group-hover:bg-white/[0.06] transition-colors"><Keyboard size={22} className="text-emerald-400" /></div>
                <p className="text-base font-medium">Full standard I/O support for complex algorithms.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3 text-xs text-zinc-500 font-mono bg-white/[0.02] w-fit px-4 py-2 rounded-full border border-white/[0.04]">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          All Systems Operational • Edge Network
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        <div className="max-w-[400px] w-full space-y-10">
          <div className="text-center lg:text-left space-y-3">
            <h2 className="text-3xl font-bold text-zinc-100 tracking-tight">
              {isLogin ? 'Sign in to CodeditoR' : 'Create an account'}
            </h2>
            <p className="text-zinc-400 text-sm font-medium">
              {isLogin ? 'Welcome back! Please enter your details.' : 'Join the next generation of cloud developers.'}
            </p>
          </div>

          {authError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl flex items-center gap-3 shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"></div>
              {authError}
            </div>
          )}

          {resetToken ? (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-2.5">
                <label className="block text-sm font-semibold text-zinc-300">New Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#18181B] border border-white/[0.08] rounded-xl px-4 py-3.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner"
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" className="w-full bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-semibold py-3.5 rounded-xl mt-2 shadow-[0_0_20px_rgba(99,102,241,0.2)] border border-indigo-400/30 transition-all">
                Update Password
              </button>
            </form>
          ) : isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              {resetMessage && (
                <div className="text-emerald-400 text-sm px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 shadow-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></div>
                  {resetMessage}
                </div>
              )}
              <div className="space-y-2.5">
                <label className="block text-sm font-semibold text-zinc-300">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#18181B] border border-white/[0.08] rounded-xl px-4 py-3.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner"
                  placeholder="name@company.com"
                />
              </div>
              <div className="pt-2 space-y-3">
                <button type="submit" className="w-full bg-zinc-100 hover:bg-white text-zinc-900 font-bold py-3.5 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all">
                  Send Reset Link
                </button>
                <button type="button" onClick={() => setIsForgotPassword(false)} className="w-full text-zinc-500 hover:text-zinc-300 text-sm font-medium transition-colors py-2">
                  Back to Login
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAuth} className="space-y-6">
              <div className="space-y-2.5">
                <label className="block text-sm font-semibold text-zinc-300">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#18181B] border border-white/[0.08] rounded-xl px-4 py-3.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner"
                  placeholder="name@company.com"
                />
              </div>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-semibold text-zinc-300">Password</label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => { setIsForgotPassword(true); setAuthError(''); setResetMessage(''); }}
                      className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#18181B] border border-white/[0.08] rounded-xl px-4 py-3.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner"
                  placeholder="••••••••"
                />
              </div>

              <button type="submit" className="w-full bg-zinc-100 hover:bg-white text-zinc-900 font-bold py-3.5 rounded-xl mt-2 shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all">
                {isLogin ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          )}

          <div className="text-center text-sm font-medium text-zinc-500 pt-2">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setAuthError(''); setEmail(''); setPassword(''); }}
              className="text-zinc-200 hover:text-white transition-colors underline underline-offset-4 decoration-white/20 hover:decoration-white/60 ml-1"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}