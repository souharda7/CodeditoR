import { useState, useEffect } from 'react'
import axios from 'axios'
import { Terminal, Code2, Play, Loader2, LogOut, Keyboard, Cpu, Sparkles } from 'lucide-react'
import Editor from '@monaco-editor/react'

axios.defaults.baseURL = 'https://codeditor-api.onrender.com'

const defaultPython = 'print(f"Hello, World!")'
const defaultCpp = '#include <iostream>\n#include <string>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}'

// Shared type system + a handful of custom keyframes the Tailwind
// arbitrary-value utilities below lean on (shimmer sweep, soft rise-in).
function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

      .font-display { font-family: 'Playfair Display', Georgia, serif; }
      .font-ui { font-family: 'Inter', system-ui, -apple-system, sans-serif; }

      @keyframes shimmer {
        100% { transform: translateX(220%); }
      }
      @keyframes riseIn {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .animate-riseIn { animation: riseIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
    `}</style>
  )
}

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
      <div className="h-screen bg-[#0A0A0C] text-[#DCD8D1] flex flex-col overflow-hidden font-ui selection:bg-[#C9A876]/25">
        <GlobalStyle />

        <header className="flex justify-between items-center shrink-0 px-6 py-5 border-b border-white/[0.05]">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 group cursor-default">
              <div className="relative w-10 h-10 shrink-0">
                <div className="absolute inset-0 rounded-full border border-white/[0.08] transition-all duration-500 group-hover:border-[#C9A876]/40 group-hover:scale-105"></div>
                <div className="absolute inset-[3px] rounded-full border border-[#C9A876]/30 bg-gradient-to-br from-[#C9A876]/[0.08] to-transparent flex items-center justify-center transition-all duration-500 group-hover:border-[#C9A876]/60 group-hover:from-[#C9A876]/[0.14]">
                  <Code2 size={16} className="text-[#D9BC85] transition-transform duration-500 group-hover:-rotate-6" />
                </div>
              </div>
              <div className="leading-tight">
                <h1 className="text-[1.05rem] font-display italic tracking-wide text-[#F3F0EA]">
                  CodeditoR
                </h1>
                <p className="text-[9px] font-ui font-semibold tracking-[0.28em] text-[#7F7A72] uppercase -mt-0.5">
                  Workspace
                </p>
              </div>
            </div>

            <div className="h-8 w-px bg-gradient-to-b from-transparent via-white/[0.12] to-transparent"></div>

            <div className="relative group">
              <select
                value={language}
                onChange={handleLanguageChange}
                className="appearance-none bg-transparent text-sm font-medium text-[#B4AEA5] rounded-lg pl-3 pr-8 py-1.5 cursor-pointer hover:text-[#F3F0EA] focus:outline-none transition-colors duration-300"
              >
                <option value="python" className="bg-[#131316] text-[#DCD8D1]">Python 3.11</option>
                <option value="cpp" className="bg-[#131316] text-[#DCD8D1]">C++ (g++)</option>
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#7F7A72] group-hover:text-[#C9A876] transition-colors duration-300">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
              <div className="absolute -bottom-0.5 left-3 right-8 h-px bg-[#C9A876]/0 group-hover:bg-[#C9A876]/40 transition-all duration-300"></div>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="hidden md:flex items-center gap-2 text-[10px] font-ui font-semibold tracking-[0.15em] uppercase text-[#8C867C] px-4 py-1.5 rounded-full bg-white/[0.02] border border-white/[0.06] transition-colors duration-300 hover:border-[#7FAF94]/30">
              <Cpu size={12} className="text-[#7FAF94]" />
              Container Active
            </div>

            <button
              onClick={handleRunCode}
              disabled={isExecuting}
              title="Run Code"
              className="group relative bg-gradient-to-b from-[#E4C989] to-[#C9A876] hover:from-[#EAD29B] hover:to-[#D3B287] disabled:from-[#2A2A2E] disabled:to-[#2A2A2E] text-[#1A1509] disabled:text-[#6B6660] font-ui font-semibold px-6 py-2 rounded-full shadow-[0_2px_18px_rgba(201,168,118,0.25)] hover:shadow-[0_4px_26px_rgba(201,168,118,0.4)] disabled:shadow-none transition-all duration-300 flex items-center gap-2 text-sm overflow-hidden hover:-translate-y-[1px] active:translate-y-0"
            >
              {!isExecuting && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.2s_ease-in-out]"></div>
              )}
              {isExecuting ? <Loader2 size={14} className="animate-spin" /> : <Play size={12} className="fill-current" />}
              {isExecuting ? 'Executing...' : 'Run Code'}
            </button>

            <button
              onClick={handleLogout}
              className="group p-2 rounded-full text-[#8C867C] hover:text-[#C97B7B] hover:bg-[#C97B7B]/[0.08] transition-all duration-300 border border-transparent hover:border-[#C97B7B]/25"
              title="Sign Out"
            >
              <LogOut size={16} className="transition-transform duration-300 group-hover:translate-x-0.5" />
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-col lg:flex-row gap-5 p-5 pt-5 min-h-0 max-w-[1920px] w-full mx-auto">
          <div className="group/panel flex-1 relative bg-[#111113] rounded-2xl border border-white/[0.06] hover:border-[#C9A876]/[0.18] overflow-hidden shadow-2xl flex flex-col transition-colors duration-500">
            <div className="h-12 border-b border-white/[0.05] flex items-center px-4 bg-white/[0.012]">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/[0.03] border border-white/[0.04]">
                <Sparkles size={12} className="text-[#C9A876]" />
                <span className="text-xs font-ui font-medium text-[#C3BDB3]">
                  main.{language === 'python' ? 'py' : 'cpp'}
                </span>
              </div>
            </div>

            <div className="flex-1 relative py-4">
              <Editor
                height="100%"
                language={language}
                theme="elegant-dark"
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

                  monaco.editor.defineTheme('elegant-dark', {
                    base: 'vs-dark',
                    inherit: true,
                    rules: [],
                    colors: {
                      'editor.background': '#111113',
                      'editor.lineHighlightBackground': '#FFFFFF06',
                      'editorLineNumber.foreground': '#FFFFFF25',
                      'editorLineNumber.activeForeground': '#D9BC85B0',
                      'editorIndentGuide.background': '#FFFFFF10',
                      'editorIndentGuide.activeBackground': '#C9A87640',
                      'editorCursor.foreground': '#D9BC85',
                    }
                  });
                  monaco.editor.setTheme('elegant-dark');
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                  fontLigatures: true,
                  padding: { top: 0, bottom: 24 },
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  lineNumbersMinChars: 4,
                  lineDecorationsWidth: 12,
                  cursorBlinking: "smooth",
                  cursorSmoothCaretAnimation: "on",
                  formatOnPaste: true,
                  scrollbar: {
                    verticalScrollbarSize: 8,
                    horizontalScrollbarSize: 8,
                    useShadows: false,
                  }
                }}
              />
            </div>
          </div>

          <div className="w-full lg:w-[400px] xl:w-[460px] flex flex-col gap-5 min-h-0 shrink-0">
            <div className="group/panel flex flex-col h-[35%] bg-[#111113] rounded-2xl border border-white/[0.06] hover:border-[#C9A876]/[0.18] overflow-hidden shadow-2xl transition-colors duration-500">
              <div className="px-5 py-3.5 flex items-center justify-between shrink-0 bg-white/[0.012] border-b border-white/[0.04]">
                <div className="flex items-center gap-2.5">
                  <Keyboard size={13} className="text-[#7F7A72]" />
                  <span className="text-[10px] font-ui font-bold tracking-[0.24em] text-[#8C867C] uppercase">Input</span>
                </div>
              </div>
              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                placeholder="Standard input arguments..."
                className="w-full flex-1 bg-transparent px-5 py-4 font-mono text-[13px] leading-relaxed text-[#DCD8D1] placeholder:text-[#4A4742] resize-none focus:outline-none transition-colors"
                spellCheck="false"
              />
            </div>

            <div className="group/panel flex flex-col flex-1 min-h-0 bg-[#111113] rounded-2xl border border-white/[0.06] hover:border-[#C9A876]/[0.18] overflow-hidden shadow-2xl transition-colors duration-500">
              <div className="px-5 py-3.5 flex items-center justify-between shrink-0 bg-white/[0.012] border-b border-white/[0.04]">
                <div className="flex items-center gap-2.5">
                  <Terminal size={13} className="text-[#7F7A72]" />
                  <span className="text-[10px] font-ui font-bold tracking-[0.24em] text-[#8C867C] uppercase">Console</span>
                </div>
              </div>
              <div className="px-5 py-4 flex-1 overflow-auto">
                <pre className="font-mono text-[13px] text-[#DCD8D1] whitespace-pre-wrap break-words leading-relaxed selection:bg-[#C9A876]/30">
                  {output || <span className="text-[#4A4742] italic">Ready for execution.</span>}
                </pre>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0C] flex font-ui selection:bg-[#C9A876]/25">
      <GlobalStyle />

      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 bg-[#0D0D10] border-r border-white/[0.05] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none flex items-center justify-center">
          <div className="w-[800px] h-[800px] rounded-full bg-[#C9A876]/[0.06] blur-[130px] mix-blend-screen"></div>
          <div className="absolute -bottom-1/4 -right-1/4 w-[600px] h-[600px] rounded-full bg-[#7FAF94]/[0.05] blur-[110px] mix-blend-screen"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3.5 mb-24 group cursor-default w-fit">
            <div className="relative w-12 h-12 shrink-0">
              <div className="absolute inset-0 rounded-full border border-white/[0.1] transition-all duration-500 group-hover:border-[#C9A876]/50 group-hover:scale-105"></div>
              <div className="absolute inset-[3px] rounded-full border border-[#C9A876]/35 bg-gradient-to-br from-[#C9A876]/[0.1] to-transparent flex items-center justify-center transition-all duration-500 group-hover:from-[#C9A876]/[0.18]">
                <Code2 size={20} className="text-[#D9BC85] transition-transform duration-500 group-hover:-rotate-6" />
              </div>
            </div>
            <div className="leading-tight">
              <h1 className="text-2xl font-display italic tracking-wide text-[#F3F0EA]">CodeditoR</h1>
              <p className="text-[10px] font-ui font-semibold tracking-[0.3em] text-[#7F7A72] uppercase">Cloud Workspace</p>
            </div>
          </div>

          <div className="space-y-8">
            <h2 className="text-5xl font-display font-semibold text-[#F3F0EA] leading-[1.15] tracking-tight">
              Your high-performance <br />
              <span className="italic text-[#D9BC85]">
                cloud workspace.
              </span>
            </h2>

            <div className="h-px w-16 bg-gradient-to-r from-[#C9A876] to-transparent"></div>

            <div className="space-y-5 mt-10">
              <div className="flex items-center gap-5 text-[#B4AEA5] group cursor-default">
                <div className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.06] group-hover:border-[#7FAF94]/30 group-hover:bg-white/[0.04] group-hover:-translate-y-0.5 transition-all duration-300 shadow-sm"><Terminal size={20} className="text-[#7FAF94]" /></div>
                <p className="text-[15px] font-medium tracking-wide">Isolated cloud containers for secure execution.</p>
              </div>
              <div className="flex items-center gap-5 text-[#B4AEA5] group cursor-default">
                <div className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.06] group-hover:border-[#C9A876]/30 group-hover:bg-white/[0.04] group-hover:-translate-y-0.5 transition-all duration-300 shadow-sm"><Play size={20} className="text-[#D9BC85]" /></div>
                <p className="text-[15px] font-medium tracking-wide">Real-time compilation for C++ and Python.</p>
              </div>
              <div className="flex items-center gap-5 text-[#B4AEA5] group cursor-default">
                <div className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.06] group-hover:border-white/[0.2] group-hover:bg-white/[0.04] group-hover:-translate-y-0.5 transition-all duration-300 shadow-sm"><Keyboard size={20} className="text-[#C3BDB3]" /></div>
                <p className="text-[15px] font-medium tracking-wide">Full standard I/O support for complex algorithms.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3 text-xs font-mono text-[#8C867C] bg-white/[0.02] w-fit px-4 py-2 rounded-full border border-white/[0.06] transition-colors duration-300 hover:border-[#7FAF94]/25">
          <div className="w-2 h-2 rounded-full bg-[#7FAF94] animate-pulse"></div>
          All Systems Operational &nbsp;·&nbsp; Edge Network
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        <div className="max-w-[400px] w-full space-y-10 animate-riseIn">
          <div className="text-center lg:text-left space-y-3">
            <h2 className="text-3xl font-display font-semibold text-[#F3F0EA] tracking-tight">
              {isLogin ? 'Sign in to CodeditoR' : 'Create an account'}
            </h2>
            <p className="text-[#8C867C] text-sm font-medium tracking-wide">
              {isLogin ? 'Welcome back! Please enter your details.' : 'Join the next generation of cloud developers.'}
            </p>
          </div>

          {authError && (
            <div className="bg-[#C97B7B]/[0.08] border border-[#C97B7B]/25 text-[#D99999] text-sm px-4 py-3 rounded-xl flex items-center gap-3 shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-[#D99999] shrink-0"></div>
              {authError}
            </div>
          )}

          {resetToken ? (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-2.5">
                <label className="block text-sm font-semibold text-[#C3BDB3] tracking-wide">New Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#131316] border border-white/[0.08] hover:border-white/[0.14] rounded-xl px-4 py-3.5 text-[#F3F0EA] placeholder:text-[#4A4742] focus:outline-none focus:border-[#C9A876]/60 focus:ring-1 focus:ring-[#C9A876]/40 transition-all duration-300 shadow-inner"
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" className="group relative w-full bg-gradient-to-b from-[#E4C989] to-[#C9A876] hover:from-[#EAD29B] hover:to-[#D3B287] text-[#1A1509] font-ui font-semibold py-3.5 rounded-xl mt-2 shadow-[0_2px_20px_rgba(201,168,118,0.25)] hover:shadow-[0_4px_28px_rgba(201,168,118,0.4)] transition-all duration-300 overflow-hidden hover:-translate-y-[1px] active:translate-y-0">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.2s_ease-in-out]"></div>
                <span className="relative">Update Password</span>
              </button>
            </form>
          ) : isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              {resetMessage && (
                <div className="text-[#8FC1A6] text-sm px-4 py-3 bg-[#7FAF94]/[0.08] border border-[#7FAF94]/25 rounded-xl flex items-center gap-3 shadow-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#8FC1A6] shrink-0"></div>
                  {resetMessage}
                </div>
              )}
              <div className="space-y-2.5">
                <label className="block text-sm font-semibold text-[#C3BDB3] tracking-wide">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#131316] border border-white/[0.08] hover:border-white/[0.14] rounded-xl px-4 py-3.5 text-[#F3F0EA] placeholder:text-[#4A4742] focus:outline-none focus:border-[#C9A876]/60 focus:ring-1 focus:ring-[#C9A876]/40 transition-all duration-300 shadow-inner"
                  placeholder="name@company.com"
                />
              </div>
              <div className="pt-2 space-y-3">
                <button type="submit" className="group relative w-full bg-[#F3F0EA] hover:bg-white text-[#151316] font-ui font-bold py-3.5 rounded-xl shadow-[0_2px_20px_rgba(255,255,255,0.06)] hover:shadow-[0_4px_26px_rgba(255,255,255,0.12)] transition-all duration-300 overflow-hidden hover:-translate-y-[1px] active:translate-y-0">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/[0.06] to-transparent -translate-x-full group-hover:animate-[shimmer_1.2s_ease-in-out]"></div>
                  <span className="relative">Send Reset Link</span>
                </button>
                <button type="button" onClick={() => setIsForgotPassword(false)} className="group relative w-full text-[#8C867C] hover:text-[#C3BDB3] text-sm font-medium transition-colors duration-300 py-2">
                  <span className="relative">
                    Back to Login
                    <span className="absolute left-0 -bottom-0.5 w-0 group-hover:w-full h-px bg-[#C9A876]/50 transition-all duration-300"></span>
                  </span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAuth} className="space-y-6">
              <div className="space-y-2.5">
                <label className="block text-sm font-semibold text-[#C3BDB3] tracking-wide">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#131316] border border-white/[0.08] hover:border-white/[0.14] rounded-xl px-4 py-3.5 text-[#F3F0EA] placeholder:text-[#4A4742] focus:outline-none focus:border-[#C9A876]/60 focus:ring-1 focus:ring-[#C9A876]/40 transition-all duration-300 shadow-inner"
                  placeholder="name@company.com"
                />
              </div>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-semibold text-[#C3BDB3] tracking-wide">Password</label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => { setIsForgotPassword(true); setAuthError(''); setResetMessage(''); }}
                      className="relative text-xs font-medium text-[#D9BC85] hover:text-[#E8CB93] transition-colors duration-300 group"
                    >
                      Forgot password?
                      <span className="absolute left-0 -bottom-0.5 w-0 group-hover:w-full h-px bg-[#D9BC85]/60 transition-all duration-300"></span>
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#131316] border border-white/[0.08] hover:border-white/[0.14] rounded-xl px-4 py-3.5 text-[#F3F0EA] placeholder:text-[#4A4742] focus:outline-none focus:border-[#C9A876]/60 focus:ring-1 focus:ring-[#C9A876]/40 transition-all duration-300 shadow-inner"
                  placeholder="••••••••"
                />
              </div>

              <button type="submit" className="group relative w-full bg-[#F3F0EA] hover:bg-white text-[#151316] font-ui font-bold py-3.5 rounded-xl mt-2 shadow-[0_2px_20px_rgba(255,255,255,0.06)] hover:shadow-[0_4px_26px_rgba(255,255,255,0.12)] transition-all duration-300 overflow-hidden hover:-translate-y-[1px] active:translate-y-0">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/[0.06] to-transparent -translate-x-full group-hover:animate-[shimmer_1.2s_ease-in-out]"></div>
                <span className="relative">{isLogin ? 'Sign In' : 'Create Account'}</span>
              </button>
            </form>
          )}

          <div className="text-center text-sm font-medium text-[#7F7A72] pt-2">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setAuthError(''); setEmail(''); setPassword(''); }}
              className="relative text-[#D9BC85] hover:text-[#E8CB93] transition-colors duration-300 ml-1 group"
            >
              {isLogin ? 'Sign up' : 'Log in'}
              <span className="absolute left-0 -bottom-0.5 w-0 group-hover:w-full h-px bg-[#D9BC85]/60 transition-all duration-300"></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}