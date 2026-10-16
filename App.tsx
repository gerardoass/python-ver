import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react'

type Language = 'en' | 'es'
type AuthMode = 'login' | 'signup'
type ToolId = 'target' | 'launcher' | 'traffic' | 'user' | 'aux'
type FieldState = Record<string, string>

const dictionary = {
  en: {
    auth: {
      eyebrow: 'RESTRICTED SYSTEM // NODE 05',
      title: 'Identify yourself.',
      subtitle: 'A secure interface for controlled security diagnostics.',
      login: 'Log in',
      signup: 'Create account',
      username: 'Username',
      password: 'Password',
      userPlaceholder: 'enter_codename',
      passwordPlaceholder: 'minimum 6 characters',
      submitLogin: 'AUTHENTICATE',
      submitSignup: 'CREATE IDENTITY',
      switchSignup: 'Need an identity?',
      switchLogin: 'Already registered?',
      create: 'Sign up',
      enter: 'Log in',
      secure: 'LOCAL ENCRYPTED SESSION',
      validationUser: 'Use 3–18 letters, numbers, _ or -.',
      validationPassword: 'Password must contain at least 6 characters.',
      invalid: 'Credentials do not match.',
      exists: 'This username is already registered.',
      granted: 'ACCESS GRANTED',
      denied: 'ACCESS DENIED',
    },
    nav: {
      console: 'CONTROL CONSOLE',
      operator: 'OPERATOR',
      logout: 'LOGOUT',
      menu: 'Open navigation',
    },
    common: {
      tools: 'TOOLKIT',
      ready: 'SYSTEM READY',
      safe: 'SIMULATION MODE',
      run: 'RUN',
      stop: 'STOP',
      running: 'RUNNING',
      clear: 'CLEAR',
      terminal: 'OUTPUT TERMINAL',
      parameters: 'CONFIGURATION',
      status: 'STATUS',
      idle: 'IDLE',
      active: 'ACTIVE',
      target: 'TARGET',
      noData: 'Awaiting command. Select a module and configure a safe simulation.',
      disclaimer: 'Local simulation only — no network requests are transmitted.',
    },
    tools: {
      target: {
        name: 'IP TARGET',
        short: 'Target Scanner',
        description: 'Simulate host discovery, port mapping, and service fingerprinting.',
      },
      launcher: {
        name: 'LAUNCHER',
        short: 'Main Engine',
        description: 'Coordinate a controlled, local diagnostic workflow.',
      },
      traffic: {
        name: 'TRAFIC',
        short: 'Traffic Analyzer',
        description: 'Model packet flow and inspect simulated protocol telemetry.',
      },
      user: {
        name: 'USER SCANNER',
        short: 'OSINT Search',
        description: 'Simulate a public username footprint search across known services.',
      },
      aux: {
        name: 'XD',
        short: 'Auxiliary Script',
        description: 'Run local integrity and environment verification routines.',
      },
    },
    fields: {
      ip: 'Target IP',
      ipPlaceholder: '192.168.1.10',
      ports: 'Port range',
      portsPlaceholder: '1-1024',
      profile: 'Execution profile',
      profileOptions: ['Passive audit', 'Service inventory', 'Full diagnostic'],
      module: 'Engine module',
      moduleOptions: ['Recon sequence', 'Integrity check', 'Report compiler'],
      interface: 'Network interface',
      interfaceOptions: ['eth0 (simulated)', 'wlan0 (simulated)', 'loopback'],
      duration: 'Capture window',
      durationOptions: ['15 seconds', '30 seconds', '60 seconds'],
      username: 'Username query',
      usernamePlaceholder: 'elliot_alderson',
      depth: 'Search depth',
      depthOptions: ['Surface web', 'Known platforms', 'Extended index'],
      routine: 'Routine',
      routineOptions: ['Dependency audit', 'Hash verification', 'Environment check'],
      output: 'Output format',
      outputOptions: ['Terminal', 'JSON preview', 'Compact report'],
    },
    logs: {
      target: [
        'Initializing isolated scanner module...',
        'Validating target syntax: {value}',
        'Opening simulated socket map...',
        'PORT 22/tcp  OPEN   ssh     OpenSSH 9.2',
        'PORT 80/tcp  OPEN   http    nginx',
        'Fingerprint confidence: 94%',
        'Scan simulation completed. 0 packets transmitted.',
      ],
      launcher: [
        'Loading fsociety engine manifest...',
        'Sandbox boundary verified.',
        'Mounting module: {value}',
        'Running preflight diagnostics...',
        'All local checks returned nominal.',
        'Workflow completed successfully.',
      ],
      traffic: [
        'Attaching to virtual interface: {value}',
        'Traffic generation disabled in safe mode.',
        'Reading simulated packet buffer...',
        'TCP  192.168.1.12:443 → 10.0.0.8:51820  ACK',
        'DNS  query A api.local  response 127.0.0.1',
        'Captured 128 virtual packets. 0 packets transmitted.',
      ],
      user: [
        'Preparing OSINT query: {value}',
        'Searching cached public-source index...',
        '[+] GitHub       profile pattern found',
        '[+] Reddit       username unavailable',
        '[-] Mastodon     no indexed result',
        'Search completed. Results are simulated.',
      ],
      aux: [
        'Invoking auxiliary routine: {value}',
        'Checking runtime integrity...',
        'Verifying local dependency signatures...',
        'SHA256 manifest: MATCH',
        'Environment status: CLEAN',
        'Auxiliary routine complete.',
      ],
      stopped: 'Process interrupted by operator.',
      prompt: 'operator@fsociety:~$',
    },
  },
  es: {
    auth: {
      eyebrow: 'SISTEMA RESTRINGIDO // NODO 05',
      title: 'Identifícate.',
      subtitle: 'Una interfaz segura para diagnósticos de seguridad controlados.',
      login: 'Iniciar sesión',
      signup: 'Crear cuenta',
      username: 'Usuario',
      password: 'Contraseña',
      userPlaceholder: 'introduce_alias',
      passwordPlaceholder: 'mínimo 6 caracteres',
      submitLogin: 'AUTENTICAR',
      submitSignup: 'CREAR IDENTIDAD',
      switchSignup: '¿Necesitas una identidad?',
      switchLogin: '¿Ya estás registrado?',
      create: 'Regístrate',
      enter: 'Inicia sesión',
      secure: 'SESIÓN LOCAL CIFRADA',
      validationUser: 'Usa de 3 a 18 letras, números, _ o -.',
      validationPassword: 'La contraseña debe tener al menos 6 caracteres.',
      invalid: 'Las credenciales no coinciden.',
      exists: 'Este usuario ya está registrado.',
      granted: 'ACCESO CONCEDIDO',
      denied: 'ACCESO DENEGADO',
    },
    nav: {
      console: 'CONSOLA DE CONTROL',
      operator: 'OPERADOR',
      logout: 'SALIR',
      menu: 'Abrir navegación',
    },
    common: {
      tools: 'HERRAMIENTAS',
      ready: 'SISTEMA LISTO',
      safe: 'MODO SIMULACIÓN',
      run: 'EJECUTAR',
      stop: 'DETENER',
      running: 'EJECUTANDO',
      clear: 'LIMPIAR',
      terminal: 'TERMINAL DE SALIDA',
      parameters: 'CONFIGURACIÓN',
      status: 'ESTADO',
      idle: 'INACTIVO',
      active: 'ACTIVO',
      target: 'OBJETIVO',
      noData: 'Esperando comando. Selecciona un módulo y configura una simulación segura.',
      disclaimer: 'Solo simulación local — no se transmite ninguna solicitud de red.',
    },
    tools: {
      target: {
        name: 'IP TARGET',
        short: 'Escáner de objetivos',
        description: 'Simula el descubrimiento de hosts, puertos y huellas de servicios.',
      },
      launcher: {
        name: 'LAUNCHER',
        short: 'Motor principal',
        description: 'Coordina un flujo de diagnóstico local y controlado.',
      },
      traffic: {
        name: 'TRAFIC',
        short: 'Analizador de tráfico',
        description: 'Modela el flujo de paquetes e inspecciona telemetría simulada.',
      },
      user: {
        name: 'USER SCANNER',
        short: 'Búsqueda OSINT',
        description: 'Simula la búsqueda de un usuario en servicios públicos conocidos.',
      },
      aux: {
        name: 'XD',
        short: 'Script auxiliar',
        description: 'Ejecuta rutinas locales de integridad y verificación del entorno.',
      },
    },
    fields: {
      ip: 'IP objetivo',
      ipPlaceholder: '192.168.1.10',
      ports: 'Rango de puertos',
      portsPlaceholder: '1-1024',
      profile: 'Perfil de ejecución',
      profileOptions: ['Auditoría pasiva', 'Inventario de servicios', 'Diagnóstico completo'],
      module: 'Módulo del motor',
      moduleOptions: ['Secuencia de reconocimiento', 'Control de integridad', 'Compilador de informes'],
      interface: 'Interfaz de red',
      interfaceOptions: ['eth0 (simulada)', 'wlan0 (simulada)', 'loopback'],
      duration: 'Ventana de captura',
      durationOptions: ['15 segundos', '30 segundos', '60 segundos'],
      username: 'Usuario a buscar',
      usernamePlaceholder: 'elliot_alderson',
      depth: 'Profundidad de búsqueda',
      depthOptions: ['Web superficial', 'Plataformas conocidas', 'Índice ampliado'],
      routine: 'Rutina',
      routineOptions: ['Auditoría de dependencias', 'Verificación de hashes', 'Revisión del entorno'],
      output: 'Formato de salida',
      outputOptions: ['Terminal', 'Vista previa JSON', 'Informe compacto'],
    },
    logs: {
      target: [
        'Iniciando módulo de escáner aislado...',
        'Validando sintaxis del objetivo: {value}',
        'Abriendo mapa de sockets simulado...',
        'PUERTO 22/tcp  ABIERTO   ssh     OpenSSH 9.2',
        'PUERTO 80/tcp  ABIERTO   http    nginx',
        'Confianza de la huella: 94%',
        'Simulación finalizada. 0 paquetes transmitidos.',
      ],
      launcher: [
        'Cargando manifiesto del motor fsociety...',
        'Límite del entorno aislado verificado.',
        'Montando módulo: {value}',
        'Ejecutando diagnóstico previo...',
        'Todos los controles locales son correctos.',
        'Flujo completado correctamente.',
      ],
      traffic: [
        'Conectando a interfaz virtual: {value}',
        'Generación de tráfico desactivada en modo seguro.',
        'Leyendo búfer de paquetes simulado...',
        'TCP  192.168.1.12:443 → 10.0.0.8:51820  ACK',
        'DNS  consulta A api.local  respuesta 127.0.0.1',
        '128 paquetes virtuales capturados. 0 transmitidos.',
      ],
      user: [
        'Preparando consulta OSINT: {value}',
        'Buscando en índice local de fuentes públicas...',
        '[+] GitHub       patrón de perfil encontrado',
        '[+] Reddit       usuario no disponible',
        '[-] Mastodon     sin resultado indexado',
        'Búsqueda completa. Los resultados son simulados.',
      ],
      aux: [
        'Invocando rutina auxiliar: {value}',
        'Comprobando integridad del runtime...',
        'Verificando firmas de dependencias locales...',
        'Manifiesto SHA256: COINCIDE',
        'Estado del entorno: LIMPIO',
        'Rutina auxiliar completada.',
      ],
      stopped: 'Proceso interrumpido por el operador.',
      prompt: 'operador@fsociety:~$',
    },
  },
} as const

const toolIds: ToolId[] = ['target', 'launcher', 'traffic', 'user', 'aux']

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>,
    launcher: <><path d="m14.5 5.5 4 4L8 20H4v-4Z" /><path d="m12.5 7.5 4 4M4 20l3-3" /></>,
    traffic: <><path d="M4 18V9M9 18V5M14 18v-7M19 18V3" /><path d="M2 21h20" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    aux: <><path d="M8 3h8l1 5 4 3-2 8H5l-2-8 4-3Z" /><path d="m9 12 2 2 4-4" /></>,
    logout: <><path d="M9 5H5v14h4M13 8l4 4-4 4M17 12H9" /></>,
    shield: <><path d="M12 3 4 6v5c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6Z" /><path d="m9 12 2 2 4-4" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

async function hashValue(value: string) {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function LanguageToggle({ language, onChange }: { language: Language; onChange: (language: Language) => void }) {
  return (
    <div className="language-toggle" aria-label="Language">
      {(['en', 'es'] as Language[]).map((item) => (
        <button key={item} type="button" className={language === item ? 'active' : ''} onClick={() => onChange(item)}>
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

function AuthScreen({ language, onLanguage, onAuthenticated }: {
  language: Language
  onLanguage: (language: Language) => void
  onAuthenticated: (username: string) => void
}) {
  const t = dictionary[language]
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [transition, setTransition] = useState<'granted' | 'denied' | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!/^[a-zA-Z0-9_-]{3,18}$/.test(username)) return setError(t.auth.validationUser)
    if (password.length < 6) return setError(t.auth.validationPassword)

    setLoading(true)
    const passwordHash = await hashValue(password)
    const accounts: Record<string, string> = JSON.parse(localStorage.getItem('fs_accounts') || '{}')
    const normalized = username.toLowerCase()
    let allowed = false

    if (mode === 'signup') {
      if (accounts[normalized]) {
        setError(t.auth.exists)
      } else {
        accounts[normalized] = passwordHash
        localStorage.setItem('fs_accounts', JSON.stringify(accounts))
        allowed = true
      }
    } else {
      allowed = accounts[normalized] === passwordHash
      if (!allowed) setError(t.auth.invalid)
    }

    setTransition(allowed ? 'granted' : 'denied')
    window.setTimeout(() => {
      setLoading(false)
      setTransition(null)
      if (allowed) onAuthenticated(username)
    }, allowed ? 1250 : 900)
  }

  const changeMode = () => {
    setMode((value) => value === 'login' ? 'signup' : 'login')
    setError('')
  }

  return (
    <main className="auth-shell">
      <div className="noise" />
      <div className="auth-topbar">
        <div className="brand brand-small" data-text="fsociety">fsociety<span>_</span></div>
        <LanguageToggle language={language} onChange={onLanguage} />
      </div>

      <section className="auth-layout">
        <div className="auth-context">
          <div className="context-index">/ 05</div>
          <p className="eyebrow">{t.auth.eyebrow}</p>
          <p className="manifesto">
            CONTROL<br />
            IS AN <span>ILLUSION.</span>
          </p>
          <div className="context-line" />
          <p className="context-copy">PRIVATE // LOCAL // CONTROLLED</p>
        </div>

        <div className="auth-card">
          <div className="card-corner corner-tl" />
          <div className="card-corner corner-br" />
          <div className="auth-icon"><Icon name="lock" size={21} /></div>
          <p className="eyebrow">{mode === 'login' ? t.auth.login : t.auth.signup} // 0{mode === 'login' ? '1' : '2'}</p>
          <h1>{t.auth.title}</h1>
          <p className="auth-subtitle">{t.auth.subtitle}</p>

          <form onSubmit={submit} noValidate>
            <label>
              <span>{t.auth.username}</span>
              <div className="input-wrap">
                <b>›</b>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder={t.auth.userPlaceholder}
                  autoComplete="username"
                  spellCheck={false}
                  autoFocus
                />
              </div>
            </label>
            <label>
              <span>{t.auth.password}</span>
              <div className="input-wrap">
                <b>›</b>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={t.auth.passwordPlaceholder}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </div>
            </label>
            <div className={`form-message ${error ? 'visible' : ''}`} role="alert">{error || 'placeholder'}</div>
            <button className="primary-button auth-submit" type="submit" disabled={loading}>
              <span>{mode === 'login' ? t.auth.submitLogin : t.auth.submitSignup}</span>
              <Icon name="chevron" size={18} />
            </button>
          </form>

          <div className="auth-switch">
            <span>{mode === 'login' ? t.auth.switchSignup : t.auth.switchLogin}</span>
            <button type="button" onClick={changeMode}>{mode === 'login' ? t.auth.create : t.auth.enter}</button>
          </div>
          <div className="secure-label"><Icon name="shield" size={14} /> {t.auth.secure}</div>
        </div>
      </section>

      {transition && (
        <div className={`access-overlay ${transition}`}>
          <div className="access-mark">{transition === 'granted' ? '01' : '×'}</div>
          <p data-text={transition === 'granted' ? t.auth.granted : t.auth.denied}>
            {transition === 'granted' ? t.auth.granted : t.auth.denied}
          </p>
          <span>{transition === 'granted' ? 'SESSION TOKEN VERIFIED' : 'INVALID CREDENTIAL HASH'}</span>
        </div>
      )}
    </main>
  )
}

function TextField({ label, value, placeholder, onChange }: {
  label: string
  value: string
  placeholder: string
  onChange: (value: string) => void
}) {
  return (
    <label className="control-field">
      <span>{label}</span>
      <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} spellCheck={false} />
    </label>
  )
}

function SelectField({ label, value, options, onChange }: {
  label: string
  value: string
  options: readonly string[]
  onChange: (value: string) => void
}) {
  return (
    <label className="control-field">
      <span>{label}</span>
      <div className="select-wrap">
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => <option key={option}>{option}</option>)}
        </select>
        <span>⌄</span>
      </div>
    </label>
  )
}

function Dashboard({ language, username, onLanguage, onLogout }: {
  language: Language
  username: string
  onLanguage: (language: Language) => void
  onLogout: () => void
}) {
  const t = dictionary[language]
  const [activeTool, setActiveTool] = useState<ToolId>('target')
  const [mobileNav, setMobileNav] = useState(false)
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const timerRef = useRef<number[]>([])
  const terminalRef = useRef<HTMLDivElement>(null)
  const [fields, setFields] = useState<FieldState>({
    ip: '192.168.1.10',
    ports: '1-1024',
    profile: t.fields.profileOptions[0],
    module: t.fields.moduleOptions[0],
    interface: t.fields.interfaceOptions[0],
    duration: t.fields.durationOptions[1],
    username: 'elliot_alderson',
    depth: t.fields.depthOptions[0],
    routine: t.fields.routineOptions[0],
    output: t.fields.outputOptions[0],
  })

  useEffect(() => () => timerRef.current.forEach(window.clearTimeout), [])
  useEffect(() => {
    terminalRef.current?.scrollTo({ top: terminalRef.current.scrollHeight, behavior: 'smooth' })
  }, [logs])

  const updateField = (key: string, value: string) => setFields((current) => ({ ...current, [key]: value }))

  const fieldConfig = useMemo(() => ({
    target: [
      <TextField key="ip" label={t.fields.ip} value={fields.ip} placeholder={t.fields.ipPlaceholder} onChange={(value) => updateField('ip', value)} />,
      <TextField key="ports" label={t.fields.ports} value={fields.ports} placeholder={t.fields.portsPlaceholder} onChange={(value) => updateField('ports', value)} />,
      <SelectField key="profile" label={t.fields.profile} value={fields.profile} options={t.fields.profileOptions} onChange={(value) => updateField('profile', value)} />,
    ],
    launcher: [
      <SelectField key="module" label={t.fields.module} value={fields.module} options={t.fields.moduleOptions} onChange={(value) => updateField('module', value)} />,
      <TextField key="ip" label={t.fields.ip} value={fields.ip} placeholder={t.fields.ipPlaceholder} onChange={(value) => updateField('ip', value)} />,
      <SelectField key="output" label={t.fields.output} value={fields.output} options={t.fields.outputOptions} onChange={(value) => updateField('output', value)} />,
    ],
    traffic: [
      <SelectField key="interface" label={t.fields.interface} value={fields.interface} options={t.fields.interfaceOptions} onChange={(value) => updateField('interface', value)} />,
      <SelectField key="duration" label={t.fields.duration} value={fields.duration} options={t.fields.durationOptions} onChange={(value) => updateField('duration', value)} />,
      <SelectField key="output" label={t.fields.output} value={fields.output} options={t.fields.outputOptions} onChange={(value) => updateField('output', value)} />,
    ],
    user: [
      <TextField key="username" label={t.fields.username} value={fields.username} placeholder={t.fields.usernamePlaceholder} onChange={(value) => updateField('username', value)} />,
      <SelectField key="depth" label={t.fields.depth} value={fields.depth} options={t.fields.depthOptions} onChange={(value) => updateField('depth', value)} />,
      <SelectField key="output" label={t.fields.output} value={fields.output} options={t.fields.outputOptions} onChange={(value) => updateField('output', value)} />,
    ],
    aux: [
      <SelectField key="routine" label={t.fields.routine} value={fields.routine} options={t.fields.routineOptions} onChange={(value) => updateField('routine', value)} />,
      <SelectField key="output" label={t.fields.output} value={fields.output} options={t.fields.outputOptions} onChange={(value) => updateField('output', value)} />,
    ],
  }), [fields, t])

  const run = () => {
    timerRef.current.forEach(window.clearTimeout)
    setLogs([])
    setRunning(true)
    const replacement = activeTool === 'target' ? fields.ip :
      activeTool === 'launcher' ? fields.module :
      activeTool === 'traffic' ? fields.interface :
      activeTool === 'user' ? fields.username : fields.routine
    const sequence = [...t.logs[activeTool]]
    sequence.forEach((message, index) => {
      const timer = window.setTimeout(() => {
        setLogs((current) => [...current, message.replace('{value}', replacement)])
        if (index === sequence.length - 1) setRunning(false)
      }, 280 + index * 560)
      timerRef.current.push(timer)
    })
  }

  const stop = () => {
    timerRef.current.forEach(window.clearTimeout)
    timerRef.current = []
    if (running) setLogs((current) => [...current, t.logs.stopped])
    setRunning(false)
  }

  const selectTool = (tool: ToolId) => {
    stop()
    setLogs([])
    setActiveTool(tool)
    setMobileNav(false)
  }

  const active = t.tools[activeTool]

  return (
    <main className="dashboard-shell">
      <div className="noise" />
      <header className="navbar">
        <div className="nav-left">
          <button className="menu-button" onClick={() => setMobileNav(!mobileNav)} aria-label={t.nav.menu}>
            <Icon name={mobileNav ? 'close' : 'menu'} />
          </button>
          <div className="brand" data-text="fsociety">fsociety<span>_</span></div>
          <div className="nav-divider" />
          <span className="console-name">{t.nav.console}</span>
        </div>
        <div className="nav-right">
          <LanguageToggle language={language} onChange={onLanguage} />
          <div className="operator">
            <span>{t.nav.operator}</span>
            <strong>{username}</strong>
          </div>
          <button className="logout-button" onClick={onLogout}>
            <Icon name="logout" size={17} />
            <span>{t.nav.logout}</span>
          </button>
        </div>
      </header>

      <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span>{t.common.tools}</span>
          <small>05 MODULES</small>
        </div>
        <nav>
          {toolIds.map((tool, index) => (
            <button key={tool} className={activeTool === tool ? 'active' : ''} onClick={() => selectTool(tool)}>
              <span className="tool-icon"><Icon name={tool} /></span>
              <span className="tool-label">
                <strong>{t.tools[tool].name}</strong>
                <small>{t.tools[tool].short}</small>
              </span>
              <span className="tool-index">0{index + 1}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="status-dot" />
          <div><strong>{t.common.ready}</strong><small>v2.4.0 // LOCAL</small></div>
        </div>
      </aside>

      {mobileNav && <button className="nav-backdrop" aria-label="Close" onClick={() => setMobileNav(false)} />}

      <section className="workspace">
        <div className="workspace-header">
          <div>
            <div className="breadcrumb">ROOT / TOOLKIT / <span>{active.name}</span></div>
            <h1 data-text={active.name}>{active.name}</h1>
            <p>{active.description}</p>
          </div>
          <div className="simulation-badge"><Icon name="shield" size={15} /> {t.common.safe}</div>
        </div>

        <div className="control-panel">
          <div className="panel-heading">
            <span>{t.common.parameters}</span>
            <small>// MODULE 0{toolIds.indexOf(activeTool) + 1}</small>
          </div>
          <div className="fields-grid">{fieldConfig[activeTool]}</div>
          <div className="action-row">
            <div className="safety-note"><span>!</span> {t.common.disclaimer}</div>
            <div className="actions">
              <button type="button" className="stop-button" onClick={stop} disabled={!running}>{t.common.stop}</button>
              <button type="button" className="primary-button run-button" onClick={run} disabled={running}>
                <span>{running ? t.common.running : t.common.run}</span>
                <span className={running ? 'spinner' : 'play'}>{running ? '' : '›'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="terminal-panel">
          <div className="terminal-header">
            <div className="terminal-title">
              <div className="window-dots"><i /><i /><i /></div>
              <span>{t.common.terminal}</span>
            </div>
            <div className="terminal-actions">
              <span><i className={running ? 'live' : ''} /> {running ? t.common.active : t.common.idle}</span>
              <button onClick={() => setLogs([])} aria-label={t.common.clear}><Icon name="trash" size={15} /> {t.common.clear}</button>
            </div>
          </div>
          <div className="terminal-body" ref={terminalRef}>
            <div className="terminal-meta">
              <span>fsociety toolkit [v2.4.0]</span>
              <span>{new Date().toISOString().slice(0, 10)}</span>
            </div>
            {logs.length === 0 ? (
              <div className="terminal-empty">
                <div className="empty-symbol">_</div>
                <p>{t.common.noData}</p>
                <span>{t.logs.prompt} <b className="cursor" /></span>
              </div>
            ) : (
              <div className="log-lines">
                {logs.map((line, index) => (
                  <div key={`${line}-${index}`} className={`log-line ${line.includes('[+]') || line.includes('OPEN') || line.includes('ABIERTO') || line.includes('MATCH') || line.includes('COINCIDE') ? 'success' : line.includes('disabled') || line.includes('desactivada') || line.includes('interrupted') || line.includes('interrumpido') ? 'warning' : ''}`}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <p>{line}</p>
                  </div>
                ))}
                {running && <div className="log-line"><span>››</span><p><b className="cursor" /></p></div>}
                {!running && <div className="terminal-prompt">{t.logs.prompt} <b className="cursor" /></div>}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

export default function App() {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('fs_language')
    if (saved === 'en' || saved === 'es') return saved
    return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en'
  })
  const [username, setUsername] = useState(() => localStorage.getItem('fs_session') || '')

  const changeLanguage = (value: Language) => {
    setLanguage(value)
    localStorage.setItem('fs_language', value)
    document.documentElement.lang = value
  }

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const authenticate = (user: string) => {
    localStorage.setItem('fs_session', user)
    setUsername(user)
  }

  const logout = () => {
    localStorage.removeItem('fs_session')
    setUsername('')
  }

  return username
    ? <Dashboard language={language} username={username} onLanguage={changeLanguage} onLogout={logout} />
    : <AuthScreen language={language} onLanguage={changeLanguage} onAuthenticated={authenticate} />
}
