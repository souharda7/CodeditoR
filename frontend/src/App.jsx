import { useState, useEffect } from 'react'
import axios from 'axios'
import { Terminal, Code2, LogIn, UserPlus, Play, Loader2, LogOut, Keyboard } from 'lucide-react'
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
      // Clear the token from the URL bar so it looks clean
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

  // --- WORKSPACE UI (Logged In) ---
  if (token) {
    return (
      <div className="h-screen bg-[#09090b] text-zinc-300 flex flex-col overflow-hidden font-sans selection:bg-indigo-500/30">

        {/* Classy Glassmorphism Header */}
        <header className="bg-black/20 backdrop-blur-md border-b border-white/5 px-6 py-4 flex justify-between items-center shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/10 p-1.5 rounded-md border border-indigo-500/20">
              <Code2 size={20} className="text-indigo-400" />
            </div>
            <h1 className="text-lg font-semibold tracking-wide text-zinc-100">
              CodeditoR
            </h1>

            <div className="h-4 w-px bg-white/10 mx-3"></div> {/* Elegant divider */}

            <select
              value={language}
              onChange={handleLanguageChange}
              className="bg-transparent text-sm text-zinc-400 hover:text-zinc-200 cursor-pointer focus:outline-none transition-colors"
            >
              <option value="python" className="bg-zinc-900">Python 3.11</option>
              <option value="cpp" className="bg-zinc-900">C++ (g++)</option>
            </select>
          </div>

          <div className="flex items-center gap-5">
            <button
              onClick={handleRunCode}
              disabled={isExecuting}
              title="Run Code"
              className="bg-zinc-100 hover:bg-white text-zinc-900 disabled:bg-zinc-800 disabled:text-zinc-500 font-medium px-5 py-1.5 rounded-full shadow-sm transition-all flex items-center gap-2 text-sm"
            >
              {isExecuting ? <Loader2 size={16} className="animate-spin" /> : <Play size={14} className="fill-current" />}
              {isExecuting ? 'Executing...' : 'Run'}
            </button>
            <button
              onClick={handleLogout}
              className="text-zinc-500 hover:text-red-400 transition-colors"
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Main Split Interface */}
        <main className="flex-1 flex flex-col lg:flex-row min-h-0">

          {/* Left Pane: Monaco Editor */}
          <div className="flex-1 relative bg-[#09090b]">
            <Editor
              height="100%"
              language={language}
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || '')}
              onMount={(editor, monaco) => {
                // Shortcut for Ctrl + Enter (Run Code)
                editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                  // Trigger the hidden run button dynamically
                  const runBtn = document.querySelector('button[title="Run Code"]');
                  if (runBtn && !runBtn.disabled) {
                    runBtn.click();
                  } else {
                    // Fallback if title is just "Run"
                    document.querySelector('button')?.parentElement?.querySelector('button')?.click();
                  }
                });

                // Shortcut for Ctrl + S (Save Code)
                editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                  // Trigger standard browser save event so our window listener catches it
                  const event = new KeyboardEvent('keydown', {
                    key: 's',
                    ctrlKey: true,
                    metaKey: true,
                    bubbles: true
                  });
                  window.dispatchEvent(event);
                });
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontLigatures: true,
                padding: { top: 24 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                lineNumbersMinChars: 4,
                lineDecorationsWidth: 0,
              }}
            />
          </div>

          {/* Right Pane: Premium Terminal */}
          <div className="w-full lg:w-1/3 flex flex-col min-h-0 shrink-0 border-l border-white/5 bg-[#09090b] shadow-2xl">
            <div className="flex flex-col h-[45%] border-b border-white/5">
              <div className="px-5 py-3 flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">Standard Input</span>
              </div>
              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                placeholder="Type your inputs here..."
                className="w-full flex-1 bg-transparent px-5 py-2 font-mono text-sm text-zinc-400 placeholder:text-zinc-700 resize-none focus:outline-none transition-colors"
              />
            </div>

            <div className="flex flex-col flex-1 min-h-0">
              <div className="px-5 py-3 flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">Output Console</span>
              </div>
              <div className="px-5 py-2 flex-1 overflow-auto">
                <pre className="font-mono text-sm text-zinc-300 whitespace-pre-wrap break-words leading-relaxed">
                  {output}
                </pre>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // --- LOGIN UI (Logged Out) ---
  return (
    <div className="min-h-screen bg-[#09090b] flex font-sans selection:bg-indigo-500/30">
      {/* Left Side - Branding & Features (Hidden on mobile) */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 bg-zinc-950 border-r border-white/5 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-indigo-500/10 blur-[120px]"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20">
              <Code2 size={24} className="text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-wide text-zinc-100">CodeditoR</h1>
          </div>

          <div className="space-y-8">
            <h2 className="text-4xl font-bold text-zinc-100 leading-tight">
              Your high-performance <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                cloud workspace.
              </span>
            </h2>

            <div className="space-y-6 mt-8">
              <div className="flex items-center gap-4 text-zinc-400">
                <div className="bg-white/5 p-2 rounded-md"><Terminal size={20} className="text-cyan-400" /></div>
                <p className="text-sm">Isolated cloud containers for secure execution.</p>
              </div>
              <div className="flex items-center gap-4 text-zinc-400">
                <div className="bg-white/5 p-2 rounded-md"><Play size={20} className="text-indigo-400" /></div>
                <p className="text-sm">Real-time compilation for C++ and Python.</p>
              </div>
              <div className="flex items-center gap-4 text-zinc-400">
                <div className="bg-white/5 p-2 rounded-md"><Keyboard size={20} className="text-emerald-400" /></div>
                <p className="text-sm">Full standard I/O support for complex algorithms.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-zinc-600 font-mono">
          System Status: All Systems Operational • Region: Global Edge
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center lg:text-left space-y-2">
            <h2 className="text-3xl font-semibold text-zinc-100 tracking-tight">
              {isLogin ? 'Sign in to CodeditoR' : 'Create your account'}
            </h2>
            <p className="text-zinc-400 text-sm">
              {isLogin ? 'Welcome back! Please enter your details.' : 'Join developers building in the cloud.'}
            </p>
          </div>

          {authError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-lg flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
              {authError}
            </div>
          )}

          {/* THE DYNAMIC AUTH FORMS */}
          {resetToken ? (
            /* --- 1. SET NEW PASSWORD SCREEN --- */
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-300">Enter New Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-white/10 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:border-indigo-500/50"
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-lg mt-4">
                Update Password
              </button>
            </form>

          ) : isForgotPassword ? (
            /* --- 2. REQUEST RESET LINK SCREEN --- */
            <form onSubmit={handleForgotPassword} className="space-y-5">
              {resetMessage && <div className="text-emerald-400 text-sm p-4 bg-emerald-400/10 rounded-lg">{resetMessage}</div>}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-300">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-white/10 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:border-indigo-500/50"
                  placeholder="name@domain.com"
                />
              </div>
              <button type="submit" className="w-full bg-zinc-100 hover:bg-white text-zinc-900 font-semibold py-3 rounded-lg mt-4">
                Send Reset Link
              </button>
              <button type="button" onClick={() => setIsForgotPassword(false)} className="w-full text-zinc-400 hover:text-white text-sm mt-2">
                Back to Login
              </button>
            </form>

          ) : (
            /* --- 3. STANDARD LOGIN/REGISTER SCREEN --- */
            <form onSubmit={handleAuth} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-300">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-white/10 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:border-indigo-500/50"
                  placeholder="name@domain.com"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-zinc-300">Password</label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => { setIsForgotPassword(true); setAuthError(''); setResetMessage(''); }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
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
                  className="w-full bg-zinc-950/50 border border-white/10 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:border-indigo-500/50"
                  placeholder="••••••••"
                />
              </div>

              <button type="submit" className="w-full bg-zinc-100 hover:bg-white text-zinc-900 font-semibold py-3 rounded-lg mt-4">
                {isLogin ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          )}

          <div className="text-center text-sm text-zinc-500 pt-4">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setAuthError(''); setEmail(''); setPassword(''); }}
              className="text-white hover:text-indigo-300 font-medium transition-colors underline underline-offset-4 decoration-white/20"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}