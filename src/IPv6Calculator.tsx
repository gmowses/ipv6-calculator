import { useState, useEffect } from 'react'
import { Calculator, Copy, ChevronDown, ChevronUp, Sun, Moon, Languages } from 'lucide-react'

// ── i18n ─────────────────────────────────────────────────────────────────────
const T = {
  en: {
    title: 'IPv6 Address Calculator', subtitle: 'Analyze and calculate IPv6 blocks. Everything runs client-side.',
    prefixCalc: 'IPv6 Prefix Calculator', prefixDesc: 'Enter an address with prefix (e.g. 2001:db8::/48)',
    cidrLabel: 'IPv6 Block (CIDR)', calculate: 'Calculate',
    expanded: 'Expanded address', compressed: 'Compressed address', network: 'Network',
    firstAddr: 'First address', lastAddr: 'Last address', totalAddr: 'Total addresses',
    hostBits: 'Host bits', type: 'Type', prefixBreakdown: 'Prefix breakdown',
    networkPrefix: 'Network prefix', hostPart: 'Host part', expandedHighlight: 'Expanded address (prefix highlighted)',
    ipv4Mapping: 'IPv4 to IPv6 Mapping', ipv4MappingDesc: 'Convert an IPv4 address to its IPv6-mapped representation',
    ipv4Label: 'IPv4 Address', convert: 'Convert', ipv6Mapped: 'IPv6-mapped (::ffff:x.x.x.x)',
    copied: 'copied', errorInvalid: 'Invalid address. Use format: 2001:db8::/48', errorIpv4: 'Invalid IPv4 address.',
    mappingNote: 'This IPv6 address maps IPv4', mappingNoteDesc: 'The ::ffff:x.x.x.x format represents IPv4 addresses in IPv6 contexts.',
    globalFormat: 'Global format (001)', globalRouting: 'Global routing prefix (/16 TLA)',
    sitePrefix: 'Site prefix (/48)', subnetPrefix: 'Subnet prefix (/64)',
    builtBy: 'Built by',
    unspecified: 'Unspecified (::)', loopback: 'Loopback (::1)', linkLocal: 'Link-local',
    ula: 'Unique Local (ULA)', multicast: 'Multicast', ipv4Mapped: 'IPv4-mapped',
    documentation: 'Documentation (2001:db8::/32)', sixToFour: '6to4', globalUnicast: 'Global Unicast',
  },
  pt: {
    title: 'Calculadora IPv6', subtitle: 'Analise e calcule blocos IPv6. Tudo roda no navegador.',
    prefixCalc: 'Calculadora de Prefixo IPv6', prefixDesc: 'Informe um endereco com prefixo (ex.: 2001:db8::/48)',
    cidrLabel: 'Bloco IPv6 (CIDR)', calculate: 'Calcular',
    expanded: 'Endereco expandido', compressed: 'Endereco comprimido', network: 'Rede',
    firstAddr: 'Primeiro endereco', lastAddr: 'Ultimo endereco', totalAddr: 'Total de enderecos',
    hostBits: 'Bits de host', type: 'Tipo', prefixBreakdown: 'Detalhamento do prefixo',
    networkPrefix: 'Prefixo de rede', hostPart: 'Parte do host', expandedHighlight: 'Endereco expandido (prefixo destacado)',
    ipv4Mapping: 'Mapeamento IPv4 para IPv6', ipv4MappingDesc: 'Converta um endereco IPv4 para sua representacao IPv6 mapeada',
    ipv4Label: 'Endereco IPv4', convert: 'Converter', ipv6Mapped: 'IPv6 mapeado (::ffff:x.x.x.x)',
    copied: 'copiado', errorInvalid: 'Endereco invalido. Use o formato: 2001:db8::/48', errorIpv4: 'IPv4 invalido.',
    mappingNote: 'Mapeamento IPv4', mappingNoteDesc: 'O formato ::ffff:x.x.x.x e usado para representar enderecos IPv4 em contextos IPv6.',
    globalFormat: 'Formato global (001)', globalRouting: 'Prefixo global de roteamento (/16 TLA)',
    sitePrefix: 'Prefixo do site (/48)', subnetPrefix: 'Prefixo da sub-rede (/64)',
    builtBy: 'Criado por',
    unspecified: 'Nao especificado (::)', loopback: 'Loopback (::1)', linkLocal: 'Link-local',
    ula: 'Unique Local (ULA)', multicast: 'Multicast', ipv4Mapped: 'IPv4-mapeado',
    documentation: 'Documentacao (2001:db8::/32)', sixToFour: '6to4', globalUnicast: 'Global Unicast',
  }
} as const
type Lang = keyof typeof T

// ── IPv6 helpers ─────────────────────────────────────────────────────────────
function expandIPv6(addr: string) {
  if (addr.includes('::')) {
    const [l, r] = addr.split('::')
    const left = l ? l.split(':') : [], right = r ? r.split(':') : []
    const zeros = Array(8 - left.length - right.length).fill('0000')
    return [...left.map(g => g.padStart(4, '0')), ...zeros, ...right.map(g => g.padStart(4, '0'))].join(':')
  }
  return addr.split(':').map(g => g.padStart(4, '0')).join(':')
}

function compressIPv6(exp: string) {
  const parts = exp.split(':').map(g => g.replace(/^0+/, '') || '0')
  let bs = -1, bl = 0, cs = -1, cl = 0
  for (let i = 0; i <= parts.length; i++) {
    if (parts[i] === '0') { if (cs === -1) { cs = i; cl = 1 } else cl++ }
    else { if (cl > bl) { bs = cs; bl = cl }; cs = -1; cl = 0 }
  }
  if (bl < 2) return parts.join(':')
  const before = parts.slice(0, bs).join(':'), after = parts.slice(bs + bl).join(':')
  return (!before && !after) ? '::' : !before ? `::${after}` : !after ? `${before}::` : `${before}::${after}`
}

function ipv6ToBigInt(exp: string) { return BigInt('0x' + exp.split(':').join('')) }
function bigIntToIPv6(n: bigint) {
  const hex = n.toString(16).padStart(32, '0')
  const g: string[] = []; for (let i = 0; i < 32; i += 4) g.push(hex.substring(i, i + 4))
  return compressIPv6(g.join(':'))
}

function networkIPv6(exp: string, prefix: number) {
  const full = ipv6ToBigInt(exp), hb = 128n - BigInt(prefix)
  const mask = hb === 0n ? (2n ** 128n - 1n) : ((2n ** 128n - 1n) ^ (2n ** hb - 1n))
  return full & mask
}

function parseIPv6CIDR(input: string) {
  const [addr, ps] = input.trim().split('/')
  const prefix = parseInt(ps, 10)
  if (isNaN(prefix) || prefix < 0 || prefix > 128) return null
  if (!addr?.match(/^[0-9a-fA-F:]+$/) || (addr.match(/::/g) || []).length > 1) return null
  try { const exp = expandIPv6(addr); if (exp.split(':').length !== 8) return null; return { address: addr, expanded: exp, prefix } } catch { return null }
}

function isIPv4Mapped(exp: string) {
  if (!exp.toLowerCase().startsWith('0000:0000:0000:0000:0000:ffff:')) return null
  const last = exp.slice(30).split(':')
  if (last.length !== 2) return null
  const h1 = parseInt(last[0], 16), h2 = parseInt(last[1], 16)
  return `${(h1 >> 8) & 0xff}.${h1 & 0xff}.${(h2 >> 8) & 0xff}.${h2 & 0xff}`
}

function addressType(exp: string, t: Record<string, string>) {
  const big = ipv6ToBigInt(exp)
  if (big === 0n) return t.unspecified
  if (big === 1n) return t.loopback
  if (exp.startsWith('fe80')) return t.linkLocal
  if (exp.startsWith('fc') || exp.startsWith('fd')) return t.ula
  if (exp.startsWith('ff')) return t.multicast
  if (exp.toLowerCase().startsWith('0000:0000:0000:0000:0000:ffff')) return t.ipv4Mapped
  if (exp.startsWith('2001:0db8')) return t.documentation
  if (exp.startsWith('2002')) return t.sixToFour
  return t.globalUnicast
}

function formatTotal(total: bigint, hostBits: number) {
  const n = Number(total)
  if (n > 1e30) return `~${(n / 1e30).toFixed(1)} nonillion (2^${hostBits})`
  if (n > 1e24) return `~${(n / 1e24).toFixed(1)} septillion (2^${hostBits})`
  if (n > 1e18) return `~${(n / 1e18).toFixed(1)} quintillion (2^${hostBits})`
  if (n > 1e12) return `~${(n / 1e12).toFixed(1)} trillion (2^${hostBits})`
  if (n > 1e9) return `~${(n / 1e9).toFixed(1)} billion (2^${hostBits})`
  return total.toLocaleString()
}

// ── ResultRow ────────────────────────────────────────────────────────────────
function ResultRow({ label, value, mono = true, copiedText = 'copied' }: { label: string; value: string; mono?: boolean; copiedText?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-zinc-200 dark:border-zinc-800 last:border-0 px-4">
      <span className="text-sm text-zinc-500 dark:text-zinc-400 w-44 shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-sm break-all ${mono ? 'font-mono' : 'font-medium'}`}>{value}</span>
        <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
          className="shrink-0 rounded p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"><Copy size={12} /></button>
        {copied && <span className="text-[10px] text-blue-500 shrink-0">{copiedText}</span>}
      </div>
    </div>
  )
}

// ── Component ────────────────────────────────────────────────────────────────
export default function IPv6Calculator() {
  const [lang, setLang] = useState<Lang>(() => navigator.language.startsWith('pt') ? 'pt' : 'en')
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [input, setInput] = useState('2001:db8::/48')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [showBreak, setShowBreak] = useState(false)
  const [ipv4Input, setIpv4Input] = useState('')
  const [mapped, setMapped] = useState('')
  const [ipv4Err, setIpv4Err] = useState('')
  const [mapCopied, setMapCopied] = useState(false)

  const t = T[lang]
  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])

  const handleCalc = () => {
    const parsed = parseIPv6CIDR(input)
    if (!parsed) { setError(t.errorInvalid); setResult(null); return }
    setError('')
    const { expanded, prefix } = parsed
    const hb = 128 - prefix, netBig = networkIPv6(expanded, prefix)
    const firstBig = prefix === 128 ? netBig : netBig + 1n
    const lastBig = prefix === 128 ? netBig : netBig + (2n ** BigInt(hb)) - 2n
    const totalAddr = 2n ** BigInt(hb)
    const mappedIPv4 = isIPv4Mapped(expanded)
    const breakpoints = [{ bits: 3, name: t.globalFormat }, { bits: 16, name: t.globalRouting }, { bits: 48, name: t.sitePrefix }, { bits: 64, name: t.subnetPrefix }].filter(b => prefix >= b.bits)

    setResult({
      input: parsed.address, expanded, compressed: compressIPv6(expanded), prefix,
      network: bigIntToIPv6(netBig) + `/${prefix}`, firstAddr: bigIntToIPv6(firstBig), lastAddr: bigIntToIPv6(lastBig),
      totalAddr: formatTotal(totalAddr, hb), hostBits: hb,
      type: addressType(expanded, t), mappedIPv4, breakdown: breakpoints,
    })
  }

  const convertIPv4 = () => {
    const octets = ipv4Input.trim().split('.')
    if (octets.length !== 4 || octets.some(o => isNaN(parseInt(o)) || parseInt(o) < 0 || parseInt(o) > 255)) { setIpv4Err(t.errorIpv4); setMapped(''); return }
    setIpv4Err('')
    const [a, b, c, d] = octets.map(Number)
    setMapped(`::ffff:${((a << 8) | b).toString(16).padStart(4, '0')}:${((c << 8) | d).toString(16).padStart(4, '0')}`)
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors">
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center"><Calculator size={18} className="text-white" /></div>
            <span className="font-semibold">IPv6 Calculator</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(l => l === 'en' ? 'pt' : 'en')} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><Languages size={14} />{lang.toUpperCase()}</button>
            <button onClick={() => setDark(d => !d)} className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
            <a href="https://github.com/gmowses/ipv6-calculator" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="max-w-4xl mx-auto space-y-8">
          <div><h1 className="text-3xl font-bold">{t.title}</h1><p className="mt-2 text-zinc-500 dark:text-zinc-400">{t.subtitle}</p></div>

          {/* Prefix Calculator */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5">
            <div><h2 className="font-semibold">{t.prefixCalc}</h2><p className="text-sm text-zinc-500 dark:text-zinc-400">{t.prefixDesc}</p></div>
            <div className="flex gap-3">
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCalc()} placeholder="2001:db8::/48"
                className="flex-1 h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500" />
              <button onClick={handleCalc} className="flex items-center gap-2 rounded-lg bg-violet-500 px-4 h-10 text-sm font-medium text-white hover:bg-violet-600 transition-colors"><Calculator size={15} />{t.calculate}</button>
            </div>
            {error && <p className="rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

            {result && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-500">/{result.prefix}</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700">{result.type}</span>
                  {result.mappedIPv4 && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">IPv4: {result.mappedIPv4}</span>}
                </div>
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <ResultRow label={t.expanded} value={result.expanded} copiedText={t.copied} />
                  <ResultRow label={t.compressed} value={result.compressed} copiedText={t.copied} />
                  <ResultRow label={t.network} value={result.network} copiedText={t.copied} />
                  <ResultRow label={t.firstAddr} value={result.firstAddr} copiedText={t.copied} />
                  <ResultRow label={t.lastAddr} value={result.lastAddr} copiedText={t.copied} />
                  <ResultRow label={t.totalAddr} value={result.totalAddr} mono={false} copiedText={t.copied} />
                  <ResultRow label={t.hostBits} value={`${result.hostBits} bits`} mono={false} copiedText={t.copied} />
                </div>

                {result.mappedIPv4 && (
                  <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-1">{t.mappingNote}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.mappingNoteDesc} <span className="font-mono font-medium">{result.mappedIPv4}</span></p>
                  </div>
                )}

                <button onClick={() => setShowBreak(b => !b)} className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
                  {showBreak ? <ChevronUp size={13} /> : <ChevronDown size={13} />}{t.prefixBreakdown}
                </button>
                {showBreak && (
                  <div className="space-y-2">
                    {result.breakdown.map((b: any) => (
                      <div key={b.bits} className="flex items-center gap-3 rounded-md bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 px-3 py-2">
                        <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">/{b.bits}</span>
                        <span className="text-xs">{b.name}</span>
                      </div>
                    ))}
                    <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 p-4 overflow-x-auto">
                      <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-2">{t.expandedHighlight}</p>
                      <div className="font-mono text-sm">
                        {(() => {
                          const hex = result.expanded.replace(/:/g, '')
                          const prefixChars = Math.ceil(result.prefix / 4)
                          const full = hex; const groups: string[] = []
                          for (let i = 0; i < 32; i += 4) groups.push(full.substring(i, i + 4))
                          const formatted = groups.join(':')
                          const splitAt = prefixChars + Math.floor(prefixChars / 4)
                          return (<><span className="text-violet-500">{formatted.slice(0, splitAt)}</span><span className="text-zinc-400">{formatted.slice(splitAt)}</span></>)
                        })()}
                      </div>
                      <div className="flex gap-4 mt-2 text-[10px]">
                        <span><span className="inline-block w-3 h-3 rounded-sm bg-violet-500 mr-1 align-middle" />{t.networkPrefix}</span>
                        <span><span className="inline-block w-3 h-3 rounded-sm bg-zinc-300 dark:bg-zinc-600 mr-1 align-middle" />{t.hostPart}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* IPv4 to IPv6 */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
            <div><h2 className="font-semibold">{t.ipv4Mapping}</h2><p className="text-sm text-zinc-500 dark:text-zinc-400">{t.ipv4MappingDesc}</p></div>
            <div className="flex gap-3">
              <input value={ipv4Input} onChange={e => setIpv4Input(e.target.value)} onKeyDown={e => e.key === 'Enter' && convertIPv4()} placeholder="192.168.1.1"
                className="flex-1 h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500" />
              <button onClick={convertIPv4} className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 h-10 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">{t.convert}</button>
            </div>
            {ipv4Err && <p className="rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">{ipv4Err}</p>}
            {mapped && (
              <div className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-3">
                <div><p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-0.5">{t.ipv6Mapped}</p><p className="font-mono text-sm">{mapped}</p></div>
                <div className="flex items-center gap-2">
                  {mapCopied && <span className="text-[10px] text-violet-500">{t.copied}</span>}
                  <button onClick={() => { navigator.clipboard.writeText(mapped); setMapCopied(true); setTimeout(() => setMapCopied(false), 1500) }}
                    className="rounded p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"><Copy size={14} /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs text-zinc-400">
          <span>{t.builtBy} <a href="https://github.com/gmowses" className="text-zinc-600 dark:text-zinc-300 hover:text-violet-500 transition-colors">Gabriel Mowses</a></span>
          <span>MIT License</span>
        </div>
      </footer>
    </div>
  )
}
