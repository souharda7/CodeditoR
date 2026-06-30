import { useState } from 'react'
import axios from 'axios'
import { Terminal, Code2, LogIn, UserPlus, Play, Loader2, LogOut, Keyboard } from 'lucide-react'
import Editor from '@monaco-editor/react'

axios.defaults.baseURL = 'http://127.0.0.1:8000'

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')

  const [language, setLanguage] = useState('python')
  const [code, setCode] = useState('name = input("Enter name: ")\nprint(f"Hello, {name}!")')
  const [stdin, setStdin] = useState('')
  const [output, setOutput] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)

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

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
  }

  const handleLanguageChange = (e) => {
    const newLang = e.target.value
    setLanguage(newLang)
    
    if (newLang === 'python') {
      setCode('name = input("Enter name: ")\nprint(f"Hello, {name}!")')
    } else if (newLang === 'cpp') {
      setCode('#include <iostream>\n#include <string>\n\nint main() {\n    std::string name;\n    std::cout << "Enter name: ";\n    std::cin >> name;\n    std::cout << "Hello, " << name << "!" << std::endl;\n    return 0;\n}')
    }
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
      <div className="h-screen bg-gray-950 text-gray-100 flex flex-col overflow-hidden">
        <header className="bg-gray-900 border-b border-gray-800 p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <Code2 className="text-blue-500" />
            <h1 className="text-xl font-bold tracking-tight">Cloud Editor</h1>
            
            <select 
              value={language} 
              onChange={handleLanguageChange}
              className="ml-4 bg-gray-950 border border-gray-700 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:border-blue-500"
            >
              <option value="python">Python 3</option>
              <option value="cpp">C++ (g++)</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={handleRunCode}
              disabled={isExecuting}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-medium px-4 py-1.5 rounded transition flex items-center gap-2"
            >
              {isExecuting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              {isExecuting ? 'Running...' : 'Run Code'}
            </button>
            <button 
              onClick={handleLogout}
              className="text-gray-400 hover:text-white transition flex items-center gap-2"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-col lg:flex-row min-h-0">
          <div className="flex-1 border-r border-gray-800 relative">
            <Editor
              height="100%"
              language={language}
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 15,
                fontFamily: 'monospace',
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
              }}
            />
          </div>

          <div className="w-full lg:w-1/3 bg-[#1e1e1e] flex flex-col min-h-0 shrink-0 border-l border-gray-800">
            <div className="flex flex-col h-1/2 border-b border-gray-800">
              <div className="bg-gray-900 px-4 py-2 flex items-center gap-2 shrink-0 border-b border-gray-800">
                <Keyboard size={16} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-300">Input (stdin)</span>
              </div>
              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                placeholder="Type inputs here before running the code..."
                className="w-full flex-1 bg-gray-950 p-4 font-mono text-sm text-gray-300 resize-none focus:outline-none p-4"
              />
            </div>

            <div className="flex flex-col h-1/2 min-h-0">
              <div className="bg-gray-900 px-4 py-2 flex items-center gap-2 shrink-0 border-b border-gray-800">
                <Terminal size={16} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-300">Terminal Output</span>
              </div>
              <div className="p-4 flex-1 overflow-auto bg-gray-950">
                <pre className="font-mono text-sm text-green-400 whitespace-pre-wrap break-words">
                  {output}
                </pre>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-900 rounded-xl shadow-2xl border border-gray-800 p-8 space-y-6">
        <div className="text-center space-y-2">
          <Code2 size={40} className="mx-auto text-blue-500" />
          <h2 className="text-3xl font-bold text-white">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-gray-400">
            {isLogin ? 'Enter your credentials to access your workspace' : 'Sign up to start saving your code snippets'}
          </p>
        </div>

        {authError && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded">
            {authError}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded px-4 py-2 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              placeholder="developer@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded px-4 py-2 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded transition flex justify-center items-center gap-2"
          >
            {isLogin ? <><LogIn size={18} /> Sign In</> : <><UserPlus size={18} /> Register</>}
          </button>
        </form>

        <div className="text-center text-sm text-gray-500">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button"
            onClick={() => { setIsLogin(!isLogin); setAuthError(''); }}
            className="text-blue-500 hover:text-blue-400 font-medium transition"
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </div>
      </div>
    </div>
  )
}