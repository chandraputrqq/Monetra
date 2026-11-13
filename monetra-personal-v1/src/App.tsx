import { useEffect, useMemo, useRef, useState } from 'react'
import { NatasyaChat, ReminderNotice, QuoteNotice } from './Natasya'
import { pickQuote } from './reminders'
import { ChallengesPage } from './Challenges'
import { monthRecap, evaluateChallenge, challengeTitle } from './features'
import type { Challenge, Recap } from './features'
import { useCloudSync, CloudPanel } from './CloudSync'
import { ProfilePage, AnimalAvatar, analyze, resolveAnimal, DEFAULT_PROFILE, ANIMALS } from './Profile'
import type { ProfilePrefs } from './Profile'
import { t, tr, getLang, setLang } from './i18n'
import type { Lang } from './i18n'
import type { ReactNode, FormEvent, ChangeEvent } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  LayoutDashboard, ArrowLeftRight, Wallet, ChartNoAxesCombined, CalendarDays,
  Target, FileText, Settings, Plus, Search, Bell, ChevronDown, ChevronLeft,
  ChevronRight, ArrowUpRight, ArrowDownRight, MoreHorizontal, Pencil, Trash2,
  X, Download, Upload, TrendingUp, TrendingDown, CircleHelp, SlidersHorizontal,
  Menu, Check, AlertTriangle, PiggyBank, CircleDollarSign, Sparkles, RotateCcw, Trophy, RefreshCw, Users, Languages, PawPrint,
  UtensilsCrossed, Car, ShoppingBag, Clapperboard, GraduationCap, Zap, HeartPulse, Home, Repeat, Shapes, Eye, EyeOff
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts'

gsap.registerPlugin(ScrollTrigger)

type TxType = 'income' | 'expense'
type Transaction = { id: string; name: string; amount: number; type: TxType; category: string; date: string; notes?: string; recurringId?: string }
type Recurring = { id: string; name: string; amount: number; type: TxType; category: string; frequency: 'weekly' | 'monthly'; day: number; startDate: string; notes?: string; active: boolean; lastGenerated?: string }
type Budget = { category: string; limit: number }
type GoalContribution = { id:string; type:'deposit'|'withdrawal'; amount:number; date:string; notes:string; balance:number }
type Goal = { id:string; name:string; target:number; saved:number; date:string; category?:string; description?:string; priority?:'Low'|'Medium'|'High'; paused?:boolean; completed?:boolean; contributions?:GoalContribution[] }
type DebtPayment = { id: string; amount: number; date: string; notes?: string }
type Debt = { id: string; person: string; direction: 'lent' | 'borrowed'; amount: number; date: string; due?: string; notes?: string; payments: DebtPayment[] }
type Page = 'Dashboard' | 'Challenges' | 'Transactions' | 'Monthly Budget' | 'Analytics' | 'Financial Calendar' | 'Savings Goals' | 'Debts' | 'Monthly Reports' | 'Profile' | 'Settings'

const EXPENSE_CATEGORIES = ['Food & Beverages','Transportation','Shopping','Entertainment','Education','Bills & Utilities','Health','Housing','Subscriptions','Other']
const INCOME_CATEGORIES = ['Salary','Business','Freelance','Investment Returns','Other Income']
const NAV: { label: Page; icon: typeof LayoutDashboard }[] = [
  { label:'Dashboard', icon:LayoutDashboard }, { label:'Transactions', icon:ArrowLeftRight },
  { label:'Monthly Budget', icon:Wallet }, { label:'Analytics', icon:ChartNoAxesCombined },
  { label:'Financial Calendar', icon:CalendarDays }, { label:'Savings Goals', icon:Target }, { label:'Challenges', icon:Trophy }, { label:'Debts', icon:Users },
  { label:'Monthly Reports', icon:FileText }, { label:'Profile', icon:PawPrint }, { label:'Settings', icon:Settings }
]
// Menu dikelompokkan; semua halaman lama tetap ada. Label grup memakai kunci i18n 'grp.*'.
const NAV_GROUPS: { key: string; items: Page[] }[] = [
  { key:'grp.overview', items:['Dashboard'] },
  { key:'grp.finance', items:['Transactions','Monthly Budget','Savings Goals','Challenges','Debts'] },
  { key:'grp.analysis', items:['Analytics','Financial Calendar','Monthly Reports'] },
  { key:'grp.account', items:['Profile','Settings'] }
]
const PRIMARY_MOBILE: Page[] = ['Dashboard','Transactions','Monthly Budget','Savings Goals']
const COLORS = ['#34d399','#2dd4bf','#10b981','#d6a45a','#6ee7b7','#38bdf8','#a3e635','#94a3b8','#f0abfc','#fb923c']
const KEY = 'monetra-v1'
// Teks bahasa & label kategori hanya untuk tampilan; nilai kategori yang tersimpan tidak berubah.
const Lx = (id: string, en: string) => getLang() === 'id' ? id : en
const CAT_ID: Record<string,string> = {'Food & Beverages':'Makanan & Minuman','Transportation':'Transportasi','Shopping':'Belanja','Entertainment':'Hiburan','Education':'Pendidikan','Bills & Utilities':'Tagihan & Utilitas','Health':'Kesehatan','Housing':'Tempat Tinggal','Subscriptions':'Langganan','Other':'Lainnya','Salary':'Gaji','Business':'Bisnis','Freelance':'Freelance','Investment Returns':'Hasil Investasi','Other Income':'Pemasukan Lain'}
const catLabel = (c: string) => getLang() === 'id' ? (CAT_ID[c] || c) : c
const CAT_ICON: Record<string, any> = {'Food & Beverages':UtensilsCrossed,'Transportation':Car,'Shopping':ShoppingBag,'Entertainment':Clapperboard,'Education':GraduationCap,'Bills & Utilities':Zap,'Health':HeartPulse,'Housing':Home,'Subscriptions':Repeat,'Other':Shapes}

// Mode privasi: kalau aktif, semua nominal uang di layar disamarkan. fmtMoney tetap angka asli (untuk ekspor).
let HIDE = false
const fmtMoney = (n: number) => new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', maximumFractionDigits:0 }).format(Math.round(n || 0))
const MASK = 'Rp •••••'
const money = (n: number) => HIDE ? MASK : fmtMoney(n)
const digitsOnly = (value: string) => value.replace(/\D/g, '')
const formatDigits = (value: string) => { const digits = digitsOnly(value); return digits ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(digits)) : '' }
const MAX_FINANCIAL_INPUT = 1_000_000_000
const limitedDigits = (value: string) => { const digits = digitsOnly(value).replace(/^0+(?=\d)/, ''); return digits ? String(Math.min(Number(digits), MAX_FINANCIAL_INPUT)) : '' }
const shortMoney = (n: number) => HIDE ? '•••' : n >= 1_000_000 ? `Rp${(n/1_000_000).toFixed(1).replace('.',',')}jt` : n >= 1000 ? `Rp${Math.round(n/1000)}rb` : money(n)
const dateISO = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const monthKey = (date: string) => date.slice(0,7)
const currentMonth = dateISO().slice(0,7)
const monthLabel = (key: string) => new Date(Number(key.slice(0,4)), Number(key.slice(5,7))-1, 1).toLocaleDateString(getLang()==='id'?'id-ID':'en-US',{month:'long',year:'numeric'})
const uid = () => Math.random().toString(36).slice(2,10)
const readStore = () => {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null } catch { return null }
}
const initialData = () => {
  const stored = readStore()
  if (stored) return stored
  return { transactions: [], budgets: [], goals: [], currency:'IDR', demo:false }
}
const monthShift = (key: string, offset: number) => {
  const d = new Date(Number(key.slice(0,4)), Number(key.slice(5,7))-1+offset, 1)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}
const dueDates = (r: Recurring, after: string, upTo: string): string[] => {
  const out: string[] = []
  if (r.frequency === 'weekly') {
    const d = new Date(`${r.startDate}T12:00:00`)
    for (let n = 0; n < 1200; n++) { const iso = dateISO(d); if (iso > upTo) break; if (iso > after) out.push(iso); d.setDate(d.getDate() + 7) }
  } else {
    let key = r.startDate.slice(0,7)
    for (let n = 0; n < 400; n++) {
      const y = Number(key.slice(0,4)), m = Number(key.slice(5,7)), last = new Date(y, m, 0).getDate()
      const iso = `${key}-${String(Math.min(r.day, last)).padStart(2,'0')}`
      if (iso > upTo) break
      if (iso >= r.startDate && iso > after) out.push(iso)
      key = monthShift(key, 1)
    }
  }
  return out
}
const nextDueDate = (r: Recurring): string => {
  const today = dateISO(), far = new Date(); far.setDate(far.getDate() + 400)
  return dueDates(r, today, dateISO(far))[0] || ''
}
const sum = (items: Transaction[], type: TxType) => items.filter(t=>t.type===type).reduce((a,t)=>a+t.amount,0)
const download = (name: string, content: string, type: string) => {
  const blob = new Blob([content],{type}); const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href=url; a.download=name; a.click(); URL.revokeObjectURL(url)
}

export default function App() {
  const [store,setStore] = useState<any>(initialData)
  const cloud = useCloudSync(store,setStore)
  const [page,setPageState] = useState<Page>(()=>{try{const v=localStorage.getItem('monetra-page') as Page|null;return v&&NAV.some(n=>n.label===v)?v:'Dashboard'}catch{return 'Dashboard'}})
  const setPage = (p:Page)=>{setPageState(p);try{localStorage.setItem('monetra-page',p)}catch{/* ignore */}}
  const [month,setMonth] = useState(currentMonth)
  const [modal,setModal] = useState(false)
  const [editing,setEditing] = useState<Transaction|null>(null)
  const [query,setQuery] = useState('')
  const [filterType,setFilterType] = useState('all')
  const [filterCategory,setFilterCategory] = useState('all')
  const [filterMonth,setFilterMonth] = useState(currentMonth)
  const [selectedDate,setSelectedDate] = useState(dateISO())
  const [mobileNav,setMobileNav] = useState(false)
  const [moreOpen,setMoreOpen] = useState(false)
  const [booting,setBooting] = useState(true)
  useEffect(()=>{ const id=window.setTimeout(()=>setBooting(false),420); return ()=>window.clearTimeout(id) },[])
  const [confirmClear,setConfirmClear] = useState(false)
  const [recModal,setRecModal] = useState(false)
  const [editingRec,setEditingRec] = useState<Recurring|null>(null)
  const [toast,setToast] = useState('')
  const [lang,setLangState] = useState<Lang>(getLang())
  const changeLang = (l:Lang) => { setLang(l); setLangState(l); document.documentElement.lang = l }
  const [chatOpen,setChatOpen] = useState(false)
  const [hideNums,setHideNums] = useState(()=>{ try{ return localStorage.getItem('monetra-privacy')==='1' }catch{ return false } })
  HIDE = hideNums
  const togglePrivacy = ()=>setHideNums(v=>{ const n=!v; try{ localStorage.setItem('monetra-privacy',n?'1':'0') }catch{ /* ignore */ } return n })
  const [reminder,setReminder] = useState(false)
  const [quote,setQuote] = useState<string|null>(null)
  const guardRef = useRef({chat:false,budget:false})
  guardRef.current = {chat:chatOpen,budget:reminder}
  // Reminder semangat dari Natasya: acak, paling sering sekali tiap 1 jam.
  useEffect(()=>{
    const KEY='monetra-quote-last', HOUR=3600000
    const tick=()=>{
      if (document.hidden || guardRef.current.chat || guardRef.current.budget) return
      let last=0; try{ last=Number(window.localStorage.getItem(KEY))||0 }catch{ /* ignore */ }
      if (Date.now()-last<HOUR) return
      try{ window.localStorage.setItem(KEY,String(Date.now())) }catch{ /* ignore */ }
      setQuote(pickQuote())
    }
    const first=window.setTimeout(tick,6000), iv=window.setInterval(tick,60000)
    return ()=>{ window.clearTimeout(first); window.clearInterval(iv) }
  },[])
  const mainRef = useRef<HTMLDivElement>(null)

  const transactions: Transaction[] = store.transactions || []
  const budgets: Budget[] = store.budgets || []
  const goals: Goal[] = store.goals || []
  const recurring: Recurring[] = store.recurring || []
  const debts: Debt[] = store.debts || []
  const challenges: Challenge[] = store.challenges || []
  const sp:any = store.profile || {}
  const profilePrefs: ProfilePrefs = {
    name: typeof sp.name==='string'?sp.name:DEFAULT_PROFILE.name, motto: typeof sp.motto==='string'?sp.motto:DEFAULT_PROFILE.motto,
    mode: sp.mode==='manual'?'manual':'auto', animal: ANIMALS.some(a=>a.key===sp.animal)?sp.animal:DEFAULT_PROFILE.animal,
    accent: /^#[0-9a-fA-F]{6}$/.test(sp.accent)?sp.accent:DEFAULT_PROFILE.accent, frame: ['ring','glow','none'].includes(sp.frame)?sp.frame:DEFAULT_PROFILE.frame }
  const analysis = useMemo(()=>analyze(transactions,budgets,goals,debts,month),[transactions,budgets,goals,debts,month])
  const myAnimal = resolveAnimal(profilePrefs,analysis)
  const saveProfile = (p:ProfilePrefs) => setStore((s:any)=>({...s,profile:p}))

  // Personal mode: persist all records in this browser only. No account or cloud connection.
  useEffect(()=>{
    try {
      window.localStorage.setItem(KEY, JSON.stringify(store))
    } catch (error) {
      console.error('MONETRA local save failed', error)
      notify(tr("Browser storage is unavailable. Export a backup before leaving this page."))
    }
  },[store])
  useGSAP(()=> {
    if (booting || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.fromTo('.page-enter',{y:10,opacity:0},{y:0,opacity:1,duration:.28,ease:'power2.out',stagger:.04,clearProps:'opacity,transform'})
    gsap.fromTo('.metric-card',{y:12,opacity:0},{y:0,opacity:1,duration:.3,ease:'power2.out',stagger:.045,delay:.04,clearProps:'opacity,transform'})
    gsap.utils.toArray<HTMLElement>('.panel:not(.page-enter)').forEach((panel)=>gsap.fromTo(panel,{y:8,opacity:0},{y:0,opacity:1,duration:.26,ease:'power2.out',clearProps:'opacity,transform',scrollTrigger:{trigger:panel,start:'top 96%',toggleActions:'play none none none'}}))
  },{scope:mainRef,dependencies:[page,booting]})

  const notify = (message: string) => { setToast(message); window.setTimeout(()=>setToast(''),2600) }
  // Auto-record: every active recurring rule writes its due transactions once, then remembers the last run date.
  useEffect(()=>{
    const list: Recurring[] = store.recurring || []
    const todayIso = dateISO()
    const created: Transaction[] = []
    const updated = list.map((r: Recurring)=>{
      if (!r.active) return r
      const dates = dueDates(r, r.lastGenerated || '', todayIso)
      if (!dates.length) return r
      dates.forEach((d: string)=>created.push({ id:`rec-${r.id}-${d}`, name:r.name, amount:r.amount, type:r.type, category:r.category, date:d, notes:r.notes?`${r.notes} · Auto-recorded`:'Auto-recorded', recurringId:r.id }))
      return { ...r, lastGenerated: todayIso }
    })
    if (!created.length) return
    setStore((s:any)=>{
      const known = new Set((s.transactions || []).map((t:Transaction)=>t.id))
      return { ...s, recurring: updated, transactions: [...created.filter((t:Transaction)=>!known.has(t.id)), ...(s.transactions || [])] }
    })
    notify(`${created.length} recurring transaction${created.length>1?'s':''} recorded automatically`)
  },[store.recurring])
  const saveDebt = (d: Debt) => {
    setStore((s:any)=>{
      const list: Debt[] = s.debts || []
      return { ...s, debts: list.some((x:Debt)=>x.id===d.id) ? list.map((x:Debt)=>x.id===d.id?d:x) : [d, ...list] }
    })
    notify(tr("Debt record saved"))
  }
  const deleteDebt = (id: string) => {
    if (!window.confirm(tr("Delete this debt record and its payment history? This cannot be undone."))) return
    setStore((s:any)=>({ ...s, debts:(s.debts || []).filter((x:Debt)=>x.id!==id) })); notify(tr("Debt record deleted"))
  }
  const saveRecurring = (r: Recurring) => {
    setStore((s:any)=>{
      const list: Recurring[] = s.recurring || []
      return { ...s, recurring: list.some((x:Recurring)=>x.id===r.id) ? list.map((x:Recurring)=>x.id===r.id?r:x) : [...list, r] }
    })
    setRecModal(false); setEditingRec(null); notify(editingRec?tr("Recurring rule updated"):tr("Recurring rule saved"))
  }
  const deleteRecurring = (id: string) => {
    if (!window.confirm(tr("Delete this recurring rule? Transactions already recorded will stay."))) return
    setStore((s:any)=>({ ...s, recurring:(s.recurring || []).filter((x:Recurring)=>x.id!==id) })); notify(tr("Recurring rule deleted"))
  }
  const toggleRecurring = (id: string) => {
    setStore((s:any)=>({ ...s, recurring:(s.recurring || []).map((x:Recurring)=>x.id===id ? (x.active ? { ...x, active:false } : { ...x, active:true, lastGenerated:dateISO() }) : x) }))
  }
  const saveChallenge = (c: Challenge) => {
    setStore((s:any)=>({ ...s, challenges:[c, ...(s.challenges || [])] }))
    notify(Lx('Tantangan dimulai! Semangat 💪','Challenge started! Good luck 💪'))
  }
  const deleteChallenge = (id: string) => setStore((s:any)=>({ ...s, challenges:(s.challenges || []).filter((x:Challenge)=>x.id!==id) }))
  const monthTx = useMemo(()=>transactions.filter(t=>monthKey(t.date)===month),[transactions,month])
  const income = sum(monthTx,'income'), expenses = sum(monthTx,'expense'), balance = income-expenses
  const savingsRate = income>0 ? Math.max(0,(balance/income)*100) : 0
  const allocated = budgets.reduce((a,b)=>a+b.limit,0)
  const budgetUsed = expenses
  const utilization = allocated>0 ? budgetUsed/allocated*100 : 0
  const curSpent = transactions.filter((x:Transaction)=>x.type==='expense'&&monthKey(x.date)===currentMonth).reduce((a:number,x:Transaction)=>a+x.amount,0)
  const curUtil = allocated>0 ? curSpent/allocated*100 : 0
  // Reminder dari Natasya: one budget warning per day once 80% of the budget is used.
  useEffect(()=>{
    if (curUtil < 80 || allocated <= 0) return
    const k = 'monetra-reminder-' + dateISO()
    try {
      if (window.localStorage.getItem(k) === '1') return
      window.localStorage.setItem(k, '1')
    } catch { /* still show the notice if storage is unavailable */ }
    setReminder(true)
  }, [Math.floor(curUtil / 10), allocated])

  const addOrUpdate = (tx: Transaction) => {
    setStore((s:any)=>({...s,transactions: editing ? s.transactions.map((t:Transaction)=>t.id===tx.id?tx:t) : [tx,...s.transactions]}))
    setEditing(null); setModal(false); notify(editing?tr("Transaction updated"):tr("Transaction saved"))
  }
  const removeTx = (id: string) => {
    if (!window.confirm(tr("Delete this transaction? This cannot be undone."))) return
    setStore((s:any)=>({...s,transactions:s.transactions.filter((t:Transaction)=>t.id!==id)})); notify(tr("Transaction deleted"))
  }
  const openEdit = (tx: Transaction) => { setEditing(tx); setModal(true) }
  const openAdd = () => { setEditing(null); setModal(true) }
  const filtered = useMemo(()=>transactions.filter(t=>
    (filterMonth==='all'||monthKey(t.date)===filterMonth) &&
    (filterType==='all'||t.type===filterType) &&
    (filterCategory==='all'||t.category===filterCategory) &&
    `${t.name} ${t.category} ${t.notes||''}`.toLowerCase().includes(query.toLowerCase())
  ).sort((a,b)=>b.date.localeCompare(a.date)),[transactions,filterMonth,filterType,filterCategory,query])

  const categoryData = useMemo(()=>EXPENSE_CATEGORIES.map((name,i)=>({
    name, value:monthTx.filter(t=>t.type==='expense'&&t.category===name).reduce((a,t)=>a+t.amount,0), color:COLORS[i]
  })).filter(x=>x.value>0).sort((a,b)=>b.value-a.value),[monthTx])
  const monthlyData = useMemo(()=>Array.from({length:6},(_,i)=>{
    const key=monthShift(month,-5+i), list=transactions.filter(t=>monthKey(t.date)===key)
    return {month:new Date(Number(key.slice(0,4)),Number(key.slice(5,7))-1,1).toLocaleDateString(getLang()==='id'?'id-ID':'en-US',{month:'short'}), income:sum(list,'income'), expenses:sum(list,'expense'), savings:sum(list,'income')-sum(list,'expense')}
  }),[transactions,month])
  const recap = useMemo(()=>monthRecap(transactions,month,dateISO()),[transactions,month])
  const chlActive = useMemo(()=>challenges.map(c=>({c,r:evaluateChallenge(c,transactions,dateISO())})).filter(x=>x.r.status==='active'),[challenges,transactions])
  const previousTx = transactions.filter(t=>monthKey(t.date)===monthShift(month,-1))
  const previousExpense=sum(previousTx,'expense')
  const expenseChange=previousExpense>0?((expenses-previousExpense)/previousExpense)*100:null
  const highestCategory=categoryData[0]
  const budgetFor=(category:string)=>budgets.find(b=>b.category===category)?.limit||0

  const saveBudget = (category:string,limit:number) => setStore((s:any)=>({...s,budgets:[...s.budgets.filter((b:Budget)=>b.category!==category),...(limit>0?[{category,limit:Math.min(limit,MAX_FINANCIAL_INPUT)}]:[])]}))
  const saveGoal = (goal:Goal) => setStore((s:any)=>({...s,goals:s.goals.some((g:Goal)=>g.id===goal.id)?s.goals.map((g:Goal)=>g.id===goal.id?goal:g):[...s.goals,goal]}))
  const deleteGoal = (id:string) => setStore((s:any)=>({...s,goals:s.goals.filter((g:Goal)=>g.id!==id)}))
  const exportCSV = () => {
    const rows=[['Date','Name','Type','Category','Amount','Notes'],...filtered.map(t=>[t.date,t.name,t.type,t.category,String(t.amount),t.notes||''])]
    download(`monetra-transactions-${filterMonth}.csv`,rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n'),'text/csv;charset=utf-8')
  }
  const exportReport = () => {
    const rows=[['MONETRA MONTHLY REPORT',monthLabel(month)],['Income',String(income)],['Expenses',String(expenses)],['Net cash flow',String(balance)],['Savings rate',`${savingsRate.toFixed(1)}%`],['Category','Amount'],...categoryData.map(c=>[c.name,String(c.value)])]
    download(`monetra-report-${month}.csv`,rows.map(r=>r.join(',')).join('\n'),'text/csv;charset=utf-8')
  }
  const exportPDF = async () => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    doc.setFillColor(16,18,16); doc.rect(0,0,210,297,'F')
    doc.setTextColor(235,239,231); doc.setFontSize(24); doc.text('MONETRA',18,24)
    doc.setFontSize(11); doc.setTextColor(155,214,165); doc.text(monthLabel(month),18,34)
    doc.setTextColor(235,239,231); doc.setFontSize(12)
    ;[['Total income',fmtMoney(income)],['Total expenses',fmtMoney(expenses)],['Net cash flow',fmtMoney(balance)],['Savings rate',`${savingsRate.toFixed(1)}%`]].forEach((r,i)=>{doc.text(r[0],18,56+i*13);doc.text(r[1],190,56+i*13,{align:'right'})})
    doc.setFontSize(14); doc.text('Expense breakdown',18,125)
    doc.setFontSize(10); categoryData.forEach((c,i)=>doc.text(`${c.name} — ${fmtMoney(c.value)}`,18,138+i*9))
    doc.save(`monetra-report-${month}.pdf`)
  }
  const loadDemo = () => {
    if (transactions.length && !window.confirm(tr("Demo data will be added alongside your existing records. Continue?"))) return
    const y=Number(month.slice(0,4)),m=Number(month.slice(5,7))-1
    const demo:Transaction[]=[
      ['Monthly salary',6500000,'income','Salary',3],['Freelance project',1250000,'income','Freelance',8],
      ['Groceries & meals',780000,'expense','Food & Beverages',4],['Ride-hailing',245000,'expense','Transportation',6],
      ['Internet & electricity',420000,'expense','Bills & Utilities',9],['Books and course',325000,'expense','Education',12],
      ['Coffee with friends',165000,'expense','Food & Beverages',15],['Household items',390000,'expense','Shopping',18],
      ['Streaming subscription',89000,'expense','Subscriptions',20],['Health check',210000,'expense','Health',22]
    ].map((x:any)=>({id:uid(),name:x[0],amount:x[1],type:x[2],category:x[3],date:`${y}-${String(m+1).padStart(2,'0')}-${String(x[4]).padStart(2,'0')}`,notes:'Demo data'}))
    setStore((s:any)=>({...s,transactions:[...demo,...s.transactions],demo:true})); notify(tr("Demo transactions added"))
  }

  const renderPage = () => {
    switch(page) {
      case 'Dashboard': return <Dashboard month={month} setMonth={setMonth} income={income} expenses={expenses} balance={balance} savingsRate={savingsRate} totalSaved={goals.reduce((a:number,g:Goal)=>a+g.saved,0)} utilization={utilization} allocated={allocated} categoryData={categoryData} monthlyData={monthlyData} transactions={monthTx} highestCategory={highestCategory} expenseChange={expenseChange} budgets={budgets} onAdd={openAdd} onNavigate={setPage} onEdit={openEdit} onChat={()=>setChatOpen(true)} recap={recap} chlActive={chlActive} />
      case 'Transactions': return <div className="page-stack"><TransactionsPage rows={filtered} query={query} setQuery={setQuery} filterType={filterType} setFilterType={setFilterType} filterCategory={filterCategory} setFilterCategory={setFilterCategory} filterMonth={filterMonth} setFilterMonth={setFilterMonth} onAdd={openAdd} onEdit={openEdit} onDelete={removeTx} onCSV={exportCSV} /><RecurringPanel rules={recurring} onAdd={()=>{setEditingRec(null);setRecModal(true)}} onEdit={(r:Recurring)=>{setEditingRec(r);setRecModal(true)}} onDelete={deleteRecurring} onToggle={toggleRecurring} /></div>
      case 'Monthly Budget': return <BudgetPage budgets={budgets} transactions={monthTx} onSave={saveBudget} month={month} setMonth={setMonth} />
      case 'Analytics': return <AnalyticsPage categoryData={categoryData} monthlyData={monthlyData} month={month} setMonth={setMonth} transactions={transactions} />
      case 'Financial Calendar': return <CalendarPage month={month} setMonth={setMonth} transactions={transactions} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
      case 'Savings Goals': return <GoalsPage goals={goals} onSave={saveGoal} onDelete={deleteGoal} />
      case 'Challenges': return <ChallengesPage challenges={challenges} transactions={transactions} today={dateISO()} money={money} onSave={saveChallenge} onDelete={deleteChallenge} />
      case 'Debts': return <DebtsPage debts={debts} onSave={saveDebt} onDelete={deleteDebt} />
      case 'Monthly Reports': return <ReportsPage month={month} setMonth={setMonth} income={income} expenses={expenses} balance={balance} savingsRate={savingsRate} categoryData={categoryData} monthlyData={monthlyData} onCSV={exportReport} onPDF={exportPDF} transactions={monthTx} />
      case 'Profile': return <ProfilePage analysis={analysis} prefs={profilePrefs} onChange={saveProfile} txCount={transactions.length} />
      case 'Settings': return <SettingsPage cloud={cloud} lang={lang} setLang={changeLang} store={store} onDemo={loadDemo} onClear={()=>setConfirmClear(true)} onImport={(data:any)=>setStore(data)} />
    }
  }

  return <div className={`app-shell ${hideNums?'privacy-on':''}`}>
    <aside className={`sidebar ${mobileNav?'sidebar-open':''}`}>
      <div className="brand"><div className="brand-mark"><span /></div><span>monetra</span><small>{tr("STUDENT FINANCE")}</small></div>
      <nav aria-label={t('workspace')}>{NAV_GROUPS.map(g=><div className="nav-group" key={g.key}><div className="nav-group-label">{t(g.key)}</div>{g.items.map(label=>{const Icon=NAV.find(n=>n.label===label)!.icon;return <button key={label} className={`nav-item ${page===label?'active':''}`} onClick={()=>{setPage(label);setMobileNav(false)}} title={t('nav.'+label)} data-tip={t('nav.'+label)} aria-current={page===label?'page':undefined}><Icon size={18}/><span>{t('nav.'+label)}</span>{page===label&&<i/>}</button>})}</div>)}</nav>
      <div className="sidebar-bottom">
        <div className="profile" role="button" tabIndex={0} onClick={()=>{setPage('Profile');setMobileNav(false)}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){setPage('Profile');setMobileNav(false)}}}><AnimalAvatar animal={myAnimal} accent={profilePrefs.accent} frame={profilePrefs.frame} size={30}/><div><strong>{profilePrefs.name.trim()||tr("My workspace")}</strong><span>{myAnimal.emoji} {getLang()==='id'?myAnimal.name[0]:myAnimal.name[1]}</span></div><MoreHorizontal size={17}/></div>
      </div>
    </aside>
    {mobileNav&&<button className="mobile-scrim" onClick={()=>setMobileNav(false)} aria-label={tr("Close menu")}/>}
    <main className="main-area" ref={mainRef}>
      <header className="topbar">
        <button className="mobile-menu icon-button" onClick={()=>setMobileNav(!mobileNav)} aria-label={tr("Toggle navigation")}><Menu size={19}/></button>
        <div className="breadcrumb"><span>{t('crumb')}</span><span className="crumb-slash">/</span><strong>{t('nav.'+page)}</strong></div>
        <div className="top-actions"><span className="today-label">{new Date().toLocaleDateString(lang==='id'?'id-ID':'en-US',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</span><button className="icon-button privacy-toggle" aria-pressed={hideNums} aria-label={hideNums?Lx('Tampilkan angka','Show numbers'):Lx('Sembunyikan angka','Hide numbers')} title={hideNums?Lx('Tampilkan angka','Show numbers'):Lx('Sembunyikan angka','Hide numbers')} onClick={togglePrivacy}>{hideNums?<EyeOff size={17}/>:<Eye size={17}/>}</button><button className="icon-button notification" aria-label={tr("Notifications")} onClick={()=>{ if(curUtil>=80) setReminder(true); else setQuote(pickQuote()) }}><Bell size={17}/><i/></button><button className="profile-chip" onClick={()=>setPage('Profile')} aria-label="Profile"><AnimalAvatar animal={myAnimal} accent={profilePrefs.accent} frame={profilePrefs.frame} size={26}/><ChevronDown size={14}/></button></div>
      </header>
      <div className="page-content">{booting?<PageSkeleton/>:renderPage()}</div>
      <footer className="app-footer"><span>MONETRA <i>·</i> {tr("Know your money. Control your future.")}</span><span>{tr("Private on this browser")} <b>●</b> {tr("Saved on this device")}</span></footer>
    </main>
    {recModal&&<RecurringModal initial={editingRec} onClose={()=>{setRecModal(false);setEditingRec(null)}} onSave={saveRecurring}/>}
    {modal&&<TransactionModal initial={editing} onClose={()=>{setModal(false);setEditing(null)}} onSave={addOrUpdate}/>}
    {confirmClear&&<ConfirmModal title={tr("Clear all financial data?")} body={tr("This permanently removes transactions, budgets, and goals stored in this browser. Export your data first if you need a backup.")} onCancel={()=>setConfirmClear(false)} onConfirm={()=>{setStore({transactions:[],budgets:[],goals:[],recurring:[],debts:[],profile:store.profile,currency:'IDR',demo:false});setConfirmClear(false);notify(tr("Local data cleared"))}}/>}
    <nav className="bottom-nav" aria-label={tr("Quick navigation")}>{PRIMARY_MOBILE.map(p=>{const I=NAV.find(n=>n.label===p)!.icon;return <button key={p} className={page===p?'active':''} onClick={()=>{setPage(p);setMoreOpen(false)}} aria-current={page===p?'page':undefined}><I size={20}/><span>{t('nav.'+p)}</span></button>})}<button className={`${!PRIMARY_MOBILE.includes(page)||moreOpen?'active':''}`} onClick={()=>setMoreOpen(v=>!v)} aria-expanded={moreOpen} aria-haspopup="dialog"><MoreHorizontal size={20}/><span>{t('nav.more')}</span></button></nav>
    {moreOpen&&<><button className="more-scrim" aria-label={tr("Close menu")} onClick={()=>setMoreOpen(false)}/><div className="more-sheet" role="dialog" aria-label={t('nav.more')}><div className="more-grab"/><div className="more-grid">{NAV.filter(n=>!PRIMARY_MOBILE.includes(n.label)).map(({label,icon:Icon})=><button key={label} className={page===label?'active':''} onClick={()=>{setPage(label);setMoreOpen(false)}}><span className="more-icon"><Icon size={19}/></span><span>{t('nav.'+label)}</span></button>)}</div></div></>}
    {quote&&!reminder&&!chatOpen&&<QuoteNotice key={quote} text={quote} onClose={()=>setQuote(null)} onChat={()=>{setQuote(null);setChatOpen(true)}}/>}
    {reminder&&<ReminderNotice percent={curUtil} left={money(Math.max(0,allocated-curSpent))} onClose={()=>setReminder(false)} onChat={()=>{setReminder(false);setChatOpen(true)}}/>}
    <NatasyaChat open={chatOpen} onOpen={()=>setChatOpen(true)} onClose={()=>setChatOpen(false)} transactions={transactions} budgets={budgets} goals={goals} debts={debts} challenges={challenges} month={month} money={money} expenseCats={EXPENSE_CATEGORIES} incomeCats={INCOME_CATEGORIES} onSave={(tx)=>{setStore((s:any)=>({...s,transactions:[tx,...(s.transactions||[])]}));notify(t('n.savedToast'))}}/>
    {toast&&<div className="toast"><Check size={15}/>{toast}</div>}
  </div>
}

// Angka yang bergerak halus saat nilainya berubah (±350ms, ease-out). Mengikuti prefers-reduced-motion.
function CountUp({value,format}:{value:number,format:(n:number)=>string}) {
  const [shown,setShown]=useState(value)
  const fromRef=useRef(value)
  useEffect(()=>{
    const from=fromRef.current
    if(from===value||window.matchMedia('(prefers-reduced-motion: reduce)').matches){fromRef.current=value;setShown(value);return}
    let raf=0;const start=performance.now(),dur=350
    const step=(now:number)=>{const k=Math.min(1,(now-start)/dur),e=1-Math.pow(1-k,3);const v=from+(value-from)*e;fromRef.current=v;setShown(v);if(k<1)raf=requestAnimationFrame(step);else{fromRef.current=value;setShown(value)}}
    raf=requestAnimationFrame(step)
    return ()=>cancelAnimationFrame(raf)
  },[value])
  return <>{format(shown)}</>
}
function PageSkeleton() {
  return <div className="page-stack skeleton-page" aria-busy="true" aria-label="Loading"><div className="sk sk-title"/><div className="sk-row"><div className="sk sk-card sk-hero"/><div className="sk sk-card"/><div className="sk sk-card"/></div><div className="sk-row two"><div className="sk sk-panel"/><div className="sk sk-panel"/></div></div>
}
function PageHeading({eyebrow,title,description,action}:{eyebrow:string,title:string,description:string,action?:ReactNode}) {
  return <div className="page-heading page-enter"><div><div className="eyebrow"><span/>{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>
}
function MonthControl({month,setMonth}:{month:string,setMonth:(v:string)=>void}) {
  return <div className="month-control"><button onClick={()=>setMonth(monthShift(month,-1))} aria-label={tr("Previous month")}><ChevronLeft size={16}/></button><span>{monthLabel(month)}</span><button onClick={()=>setMonth(monthShift(month,1))} aria-label={tr("Next month")}><ChevronRight size={16}/></button></div>
}
function Metric({label,value,sub,icon:Icon,tone='neutral',trend,raw,format}:{label:string,value:string,sub:string,icon:any,tone?:string,trend?:string,raw?:number,format?:(n:number)=>string}) {
  const [open,setOpen]=useState(false)
  return <>
    <button type="button" className={`metric-card metric-card-button tone-${tone}`} onClick={()=>setOpen(true)} aria-label={`Open details for ${label}`}>
      <span className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon size={17}/></span></span>
      <span className="metric-value">{raw!==undefined?<CountUp value={raw} format={format||money}/>:value}</span>
      <span className="metric-foot"><span>{sub}</span>{trend&&<span className="metric-trend">{trend}</span>}</span>
    </button>
    {open&&<div className="modal-backdrop metric-detail-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
      <section className="modal metric-detail-modal" role="dialog" aria-modal="true" aria-label={`${label} details`}>
        <div className="modal-head"><div><span className="panel-kicker">{tr("QUICK OVERVIEW")}</span><h2>{label}</h2></div><button type="button" className="icon-button" onClick={()=>setOpen(false)} aria-label={tr("Close details")}><X size={18}/></button></div>
        <div className={`metric-detail-icon ${tone}`}><Icon size={21}/></div>
        <strong className="metric-detail-value">{value}</strong>
        <p>{sub}{trend?` · ${trend}`:''}</p>
        <button type="button" className="primary-button metric-detail-close" onClick={()=>setOpen(false)}>{tr("Got it")}</button>
      </section>
    </div>}
  </>
}
function ChartTip({active,payload,label}:any) {
  if(!active||!payload?.length)return null
  return <div className="chart-tooltip"><span>{label}</span>{payload.map((p:any)=><strong key={p.dataKey}>{p.name||p.dataKey}: {money(p.value)}</strong>)}</div>
}
function Dashboard(p:any) {
  const {month,setMonth,income,expenses,balance,savingsRate,totalSaved,utilization,allocated,categoryData,monthlyData,transactions,highestCategory,expenseChange,budgets,onAdd,onNavigate,onEdit,onChat,recap,chlActive}=p
  return <div className="page-stack">
    <PageHeading eyebrow={t('d.eyebrow')} title={t('d.title')} description={t('d.desc')} action={<button className="primary-button" onClick={onAdd}><Plus size={16}/> {t('add')} <span className="button-arrow"><ArrowUpRight size={14}/></span></button>}/>
    <div className="overview-toolbar"><div className="live-status"><span className="live-dot"/>{Lx(`${transactions.length} catatan bulan ini`,`${transactions.length} records this month`)}</div><MonthControl month={month} setMonth={setMonth}/></div>
    <div className="metric-grid">
      <Metric label={t('m.income')} value={money(income)} raw={income} sub={t('m.income.sub')} icon={ArrowDownRight} tone="green"/>
      <Metric label={t('m.expense')} value={money(expenses)} raw={expenses} sub={t('m.expense.sub')} icon={ArrowUpRight} tone="amber" trend={expenseChange===null?'':`${expenseChange>=0?'+':''}${expenseChange.toFixed(1)}% ${t('vsLast')}`}/>
      <Metric label={t('m.balance')} value={money(balance)} raw={balance} sub={t('m.balance.sub')} icon={Wallet} tone="mint"/>
      <Metric label={t('m.saved')} value={money(totalSaved)} raw={totalSaved} sub={t('m.saved.sub')} icon={PiggyBank} tone="blue"/><Metric label={t('m.rate')} value={`${savingsRate.toFixed(1)}%`} raw={savingsRate} format={(n:number)=>`${n.toFixed(1)}%`} sub={t('m.rate.sub')} icon={TrendingUp} tone="mint"/>
    </div>
    <div className="dashboard-grid">
      <section className="panel cashflow-panel page-enter"><div className="panel-heading"><div><span className="panel-kicker">{t('p.cash')}</span><h2>{t('p.incexp')}</h2></div><button className="text-link" onClick={()=>onNavigate('Analytics')}>{t('p.viewAn')} <ArrowUpRight size={14}/></button></div>
        <div className="chart-legend"><span><i className="legend-income"/>{t('income')}</span><span><i className="legend-expense"/>{t('expenses')}</span></div>
        <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthlyData} barGap={7}><CartesianGrid stroke="#ffffff0c" vertical={false}/><XAxis dataKey="month" tick={{fill:'#777f77',fontSize:11}} axisLine={false} tickLine={false}/><YAxis tickFormatter={shortMoney} tick={{fill:'#777f77',fontSize:10}} axisLine={false} tickLine={false} width={54}/><Tooltip content={<ChartTip/>} cursor={{fill:'#ffffff08'}}/><Bar dataKey="income" name="Income" fill="#34d399" radius={[4,4,0,0]} maxBarSize={18}/><Bar dataKey="expenses" name="Expenses" fill="#d6a45a" radius={[4,4,0,0]} maxBarSize={18}/></BarChart></ResponsiveContainer></div>
      </section>
      <section className="panel spending-panel page-enter"><div className="panel-heading"><div><span className="panel-kicker">{t('p.mix')}</span><h2>{t('p.where')}</h2></div><button className="icon-button subtle" onClick={()=>onNavigate('Analytics')} aria-label={tr("More analytics")}><ArrowUpRight size={16}/></button></div>
        {categoryData.length?<><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryData} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="91%" paddingAngle={3} stroke="none">{categoryData.map((d:any)=><Cell key={d.name} fill={d.color}/>)}</Pie><Tooltip formatter={(v:any)=>money(v)}/></PieChart></ResponsiveContainer><div className="donut-center"><strong>{shortMoney(expenses)}</strong><span>{tr("Total spent")}</span></div></div><div className="category-legend">{categoryData.slice(0,4).map((c:any)=><div key={c.name}><span><i style={{background:c.color}}/>{catLabel(c.name)}</span><strong>{Math.round(c.value/expenses*100)}%</strong></div>)}</div></>:<EmptyChart text="Add expenses to see your spending mix."/>}
      </section>
      <section className="panel budget-panel page-enter"><div className="panel-heading"><div><span className="panel-kicker">{t('p.plan')}</span><h2>{t('p.pulse')}</h2></div><button className="text-link" onClick={()=>onNavigate('Monthly Budget')}>{t('p.manage')} <ArrowUpRight size={14}/></button></div>
        <div className="budget-total"><strong>{money(expenses)}</strong><span>{Lx('terpakai','spent')} {allocated?`${Lx('dari','of')} ${money(allocated)}`:`· ${Lx('belum ada anggaran','no budget set')}`}</span></div>
        <div className="progress-track large"><span style={{width:`${Math.min(utilization,100)}%`}}/></div>
        <div className="budget-caption"><span>{allocated?`${utilization.toFixed(0)}% of total budget used`:tr("Set category limits to track your budget")}</span><strong>{allocated?money(Math.max(0,allocated-expenses)):'—'}</strong></div>
        <div className="budget-mini-list">{budgets.slice(0,3).map((b: Budget)=>{const spent=transactions.filter((t:Transaction)=>t.type==='expense'&&t.category===b.category).reduce((a:number,t:Transaction)=>a+t.amount,0);const pct=b.limit?spent/b.limit*100:0;return <div className="budget-mini" key={b.category}><div><span>{catLabel(b.category)}</span><strong>{money(spent)} <em>/ {money(b.limit)}</em></strong></div><div className="progress-track"><span className={pct>=100?'over':pct>=70?'warn':''} style={{width:`${Math.min(pct,100)}%`}}/></div></div>})}{!budgets.length&&<p className="muted-note">{tr("Your budget starts with one simple limit. Add one in Monthly Budget.")}</p>}</div>
      </section>
      <section className="panel insight-panel page-enter"><div className="insight-head"><div className="insight-symbol"><Sparkles size={17}/></div><span className="panel-kicker">{t('p.clarity')}</span></div><h2>{t('p.persp')}</h2>
        {transactions.length? <div className="insight-copy">{highestCategory?<p>{tr("Your biggest expense this month is")} <strong>{catLabel(highestCategory.name)}</strong>, <strong>{money(highestCategory.value)}</strong>.</p>:<p>{tr("No expense category has been recorded yet. Add an expense to begin.")}</p>}{expenseChange!==null&&<p>{tr("Spending is")} <strong>{Math.abs(expenseChange).toFixed(1)}% {expenseChange>=0?tr("higher"):tr("lower")}</strong> {tr("than last month.")}</p>}<p>{tr("Your current cash-flow savings rate is")} <strong>{savingsRate.toFixed(1)}%</strong>.</p></div>:<p className="muted-note">{tr("Insights appear when you have enough real transaction history. Start by recording income and expenses.")}</p>}
        <div className="insight-actions"><button className="primary-button small" onClick={onChat}><Sparkles size={14}/> {t('rem.btn')}</button><button className="text-link" onClick={()=>onNavigate('Analytics')}>{t('p.explore')} <ArrowUpRight size={14}/></button></div>
      </section>
    <RecapCard recap={recap} active={chlActive} onNavigate={onNavigate}/>
    <section className="panel recent-panel page-enter dash-recent"><div className="panel-heading"><div><span className="panel-kicker">{tr("LATEST ACTIVITY")}</span><h2>{tr("Recent transactions")}</h2></div><button className="text-link" onClick={()=>onNavigate('Transactions')}>{tr("All transactions")} <ArrowUpRight size={14}/></button></div><TransactionRows rows={transactions.slice().sort((a:Transaction,b:Transaction)=>b.date.localeCompare(a.date)).slice(0,5)} onEdit={onEdit}/></section>
    </div>
  </div>
}
function RecapCard({recap,active,onNavigate}:{recap:Recap,active:{c:Challenge,r:ReturnType<typeof evaluateChallenge>}[],onNavigate:(p:Page)=>void}) {
  const pctAbs = recap.deltaPct===null?0:Math.abs(recap.deltaPct)
  const vs = recap.isCurrent ? Lx('periode yang sama bulan lalu','the same period last month') : Lx('bulan sebelumnya','the previous month')
  const verdict = !recap.hasData
    ? Lx('Belum ada pengeluaran di bulan ini. Catat transaksi pertamamu untuk melihat rekap.','No spending this month yet. Log your first transaction to see the recap.')
    : recap.deltaPct===null
      ? Lx(`Pengeluaranmu ${money(recap.expenses)}. Belum ada data bulan sebelumnya untuk dibandingkan.`,`You spent ${money(recap.expenses)}. There is no earlier month to compare with yet.`)
      : recap.diff>=0
        ? Lx(`🎉 Kamu lebih hemat ${money(recap.diff)} (${pctAbs.toFixed(0)}%) dibanding ${vs}.`,`🎉 You are ${money(recap.diff)} (${pctAbs.toFixed(0)}%) under ${vs}.`)
        : Lx(`⚠️ Pengeluaran naik ${money(-recap.diff)} (${pctAbs.toFixed(0)}%) dibanding ${vs}.`,`⚠️ Spending is up ${money(-recap.diff)} (${pctAbs.toFixed(0)}%) vs ${vs}.`)
  const dayLabel = (iso:string)=>new Date(`${iso}T12:00:00`).toLocaleDateString(getLang()==='id'?'id-ID':'en-US',{day:'numeric',month:'short'})
  const lead = [...active].sort((a,b)=>b.r.streak-a.r.streak)[0]
  return <section className="panel recap-panel page-enter">
    <div className="panel-heading"><div><span className="panel-kicker">{Lx('REKAP OTOMATIS','AUTO RECAP')}</span><h2>{Lx('Rekap','Recap')} {monthLabel(recap.month)}</h2></div></div>
    <p className="recap-verdict">{verdict}</p>
    {recap.hasData&&<div className="recap-grid">
      <div><small>{Lx('Rata-rata per hari','Daily average')}</small><strong>{money(recap.avgDaily)}</strong></div>
      <div><small>{Lx('Kategori terbesar','Top category')}</small><strong>{recap.topCategory?catLabel(recap.topCategory.name):'—'}</strong>{recap.topCategory&&<em>{money(recap.topCategory.value)}</em>}</div>
      <div><small>{Lx('Hari paling boros','Priciest day')}</small><strong>{recap.priciestDay?dayLabel(recap.priciestDay.date):'—'}</strong>{recap.priciestDay&&<em>{money(recap.priciestDay.amount)}</em>}</div>
      <div><small>{Lx('Hari tanpa belanja','No-spend days')}</small><strong>{recap.noSpendDays}/{recap.daysCounted}</strong></div>
    </div>}
    {lead&&<div className="recap-chl"><Trophy size={15}/><span>{challengeTitle(lead.c,money)}: {Lx(`hari ke-${lead.r.dayNumber}, streak ${lead.r.streak} hari`,`day ${lead.r.dayNumber}, ${lead.r.streak}-day streak`)}</span><button className="text-link" onClick={()=>onNavigate('Challenges')}>{Lx('Lihat','View')} <ArrowUpRight size={14}/></button></div>}
  </section>
}
function EmptyChart({text}:{text:string}) { return <div className="empty-chart"><div className="empty-orbit"><ChartNoAxesCombined size={20}/></div><p>{text}</p></div> }
function TransactionRows({rows,onEdit,onDelete}:{rows:Transaction[],onEdit?:(t:Transaction)=>void,onDelete?:(id:string)=>void}) {
  if(!rows.length)return <div className="empty-state"><div className="empty-orbit"><ArrowLeftRight size={20}/></div><strong>{tr("No transactions yet")}</strong><p>{tr("Your activity will show up here once you add a record.")}</p></div>
  return <div className="transaction-list">{rows.map(t=><div className="transaction-row" key={t.id}><div className={`tx-symbol ${t.type}`}><span>{t.type==='income'?<ArrowDownRight size={16}/>:<ArrowUpRight size={16}/>}</span></div><div className="tx-main"><strong>{t.name}</strong><span>{catLabel(t.category)} <i>·</i> {new Date(`${t.date}T12:00:00`).toLocaleDateString(getLang()==='id'?'id-ID':'en-US',{day:'numeric',month:'short',year:'numeric'})}</span></div><strong className={`tx-amount ${t.type}`}>{t.type==='income'?'+':'−'}{money(t.amount)}</strong>{onEdit&&<button className="row-action" onClick={()=>onEdit(t)} aria-label={`Edit ${t.name}`}><Pencil size={14}/></button>}{onDelete&&<button className="row-action danger" onClick={()=>onDelete(t.id)} aria-label={`Delete ${t.name}`}><Trash2 size={14}/></button>}</div>)}</div>
}
function TransactionsPage(p:any) {
  const {rows,query,setQuery,filterType,setFilterType,filterCategory,setFilterCategory,filterMonth,setFilterMonth,onAdd,onEdit,onDelete,onCSV}=p
  const [openFilters,setOpenFilters]=useState(false)
  return <div className="page-stack"><PageHeading eyebrow={tr("YOUR MONEY MOVEMENT")} title={tr("Transactions")} description={tr("Every inflow and outflow, in one considered place.")} action={<button className="primary-button" onClick={onAdd}><Plus size={16}/> {t('add')} <span className="button-arrow"><ArrowUpRight size={14}/></span></button>}/>
    <section className="panel table-panel page-enter"><div className="table-toolbar"><div className="search-field"><Search size={16}/><input placeholder={tr("Search transactions...")} value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button onClick={()=>setQuery('')}><X size={14}/></button>}</div><div className="table-actions"><button className={`secondary-button ${openFilters?'selected':''}`} onClick={()=>setOpenFilters(!openFilters)}><SlidersHorizontal size={15}/> {tr("Filters")}</button><button className="secondary-button" onClick={onCSV}><Download size={15}/> {tr("Export CSV")}</button></div></div>
      {openFilters&&<div className="filter-bar"><select value={filterType} onChange={e=>setFilterType(e.target.value)}><option value="all">{tr("All types")}</option><option value="income">{tr("Income")}</option><option value="expense">{tr("Expenses")}</option></select><select value={filterCategory} onChange={e=>setFilterCategory(e.target.value)}><option value="all">{tr("All categories")}</option>{[...INCOME_CATEGORIES,...EXPENSE_CATEGORIES].map(c=><option key={c}>{c}</option>)}</select><input type="month" value={filterMonth==='all'?'':filterMonth} onChange={e=>setFilterMonth(e.target.value||'all')}/><button className="text-link" onClick={()=>{setFilterType('all');setFilterCategory('all');setFilterMonth('all');setQuery('')}}>{tr("Reset filters")}</button></div>}
      <div className="table-summary"><span>{rows.length} {tr("transactions found")}</span><span>{tr("Sorted by most recent")}</span></div><div className="table-scroll"><table><thead><tr><th>{tr("TRANSACTION")}</th><th>{tr("CATEGORY")}</th><th>{tr("DATE")}</th><th>{tr("TYPE")}</th><th className="align-right">{tr("AMOUNT")}</th><th/></tr></thead><tbody>{rows.map((t:Transaction)=><tr key={t.id}><td><div className="table-name"><div className={`tx-symbol ${t.type}`}>{t.type==='income'?<ArrowDownRight size={15}/>:<ArrowUpRight size={15}/>}</div><div><strong>{t.name}</strong><small>{t.notes||'—'}</small></div></div></td><td>{catLabel(t.category)}</td><td>{new Date(`${t.date}T12:00:00`).toLocaleDateString(getLang()==='id'?'id-ID':'en-US',{day:'2-digit',month:'short',year:'numeric'})}</td><td><span className={`type-tag ${t.type}`}>{t.type==='income'?'Income':'Expense'}</span></td><td className={`align-right table-amount ${t.type}`}>{t.type==='income'?'+':'−'}{money(t.amount)}</td><td><div className="table-row-actions"><button onClick={()=>onEdit(t)} aria-label={tr("Edit transaction")}><Pencil size={14}/></button><button onClick={()=>onDelete(t.id)} aria-label={tr("Delete transaction")}><Trash2 size={14}/></button></div></td></tr>)}</tbody></table>{!rows.length&&<EmptyChart text="No transactions match these filters. Try adjusting your search or add a record."/ >}</div>
    </section></div>
}
function BudgetPage({budgets,transactions,onSave,month,setMonth}:any) {
  const [draft,setDraft]=useState<Record<string,string>>({})
  const expenseBy=(category:string)=>transactions.filter((t:Transaction)=>t.type==='expense'&&t.category===category).reduce((a:number,t:Transaction)=>a+t.amount,0)
  const categories=EXPENSE_CATEGORIES
  const total=budgets.reduce((a: number,b:Budget)=>a+b.limit,0), spent=transactions.filter((t:Transaction)=>t.type==='expense').reduce((a:number,t:Transaction)=>a+t.amount,0)
  const status=(pct:number)=>pct>=100?[tr("Budget exceeded"),'over']:pct>=90?[tr("Near budget limit"),'danger']:pct>=70?[tr("Approaching spending limit"),'warn']:[tr("Budget under control"),'good']
  const updateLimit=(category:string,raw:string)=>{
    const next=limitedDigits(raw)
    setDraft(s=>({...s,[category]:next}))
    onSave(category,next===''?0:Number(next))
  }
  return <div className="page-stack"><PageHeading eyebrow={tr("PLAN WITH INTENTION")} title={tr("Monthly budget")} description={tr("Give every category a thoughtful limit, then keep an eye on the pace.")} action={<MonthControl month={month} setMonth={setMonth}/>}/>
    <div className="budget-overview page-enter"><div><span className="panel-kicker"><Wallet size={14}/>{tr("TOTAL ALLOCATION")}</span><strong>{money(total)}</strong><small>{Lx(`Dari ${budgets.length} kategori anggaran`,`Across ${budgets.length} budget categories`)}</small></div><div><span className="panel-kicker"><ArrowUpRight size={14}/>{tr("SPENT SO FAR")}</span><strong>{money(spent)}</strong><small>{total?Lx(`${(spent/total*100).toFixed(1)}% dari anggaran`,`${(spent/total*100).toFixed(1)}% of allocated budget`): tr("No budget limits yet")}</small></div><div><span className="panel-kicker"><PiggyBank size={14}/>{tr("REMAINING")}</span><strong>{money(total-spent)}</strong><small>{total?tr("Allocation minus recorded expenses"):tr("Set limits to calculate")}</small></div></div>
    <div className="budget-list">{categories.map((c,i)=>{const limit=budgets.find((b:Budget)=>b.category===c)?.limit||0,actual=expenseBy(c),pct=limit?actual/limit*100:0,[label,cls]=status(pct);return <section className="panel budget-category page-enter" key={c}><div className="budget-category-head"><div className="budget-cat-icon">{(()=>{const CI=CAT_ICON[c]||Shapes;return <CI size={18}/>})()}</div><div className="budget-category-name"><strong>{catLabel(c)}</strong><span>{limit?label:tr("No limit set")}</span></div><div className="budget-category-values"><strong>{money(actual)}</strong><span>{limit?Lx(`dari ${money(limit)}`,`of ${money(limit)}`):Lx('terpakai','spent')}</span></div></div><div className="progress-track budget-progress"><span className={cls} style={{width:`${limit?Math.min(pct,100):0}%`}}/></div><div className="budget-category-bottom"><span>{limit?Lx(`${pct.toFixed(0)}% terpakai · sisa ${money(Math.max(0,limit-actual))}`,`${pct.toFixed(0)}% utilized · ${money(Math.max(0,limit-actual))} remaining`): tr("Set a monthly spending limit")}</span><div className="budget-edit"><label htmlFor={`budget-${i}`}>{tr("Monthly limit")}</label><div className="inline-money"><span>Rp</span><input id={`budget-${i}`} type="text" inputMode="numeric" maxLength={13} placeholder="0" value={formatDigits(draft[c]??(limit?String(limit):''))} onChange={e=>updateLimit(c,e.target.value)} aria-label={`${c} monthly spending limit, auto-saved up to one billion rupiah`}/><span className="autosave-indicator">{tr("Auto-saved")}</span></div></div></div></section>})}</div>
  </div>
}
function AnalyticsPage({categoryData,monthlyData,month,setMonth,transactions}:any) {
  const total=categoryData.reduce((a:any,c:any)=>a+c.value,0)
  const trend=monthlyData.filter((m:any)=>m.expenses>0)
  return <div className="page-stack"><PageHeading eyebrow={tr("PATTERNS, NOT GUESSES")} title={tr("Financial analytics")} description={tr("Understand the rhythm of your money through your recorded activity.")} action={<MonthControl month={month} setMonth={setMonth}/>}/>
    <div className="analytics-grid"><section className="panel analytics-wide page-enter"><div className="panel-heading"><div><span className="panel-kicker">{tr("SIX-MONTH VIEW")}</span><h2>{tr("Income & expenses")}</h2></div><span className="chart-note">{tr("IDR · monthly")}</span></div><div className="chart-wrap tall"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthlyData}><CartesianGrid stroke="#ffffff0c" vertical={false}/><XAxis dataKey="month" tick={{fill:'#7c847b',fontSize:11}} axisLine={false} tickLine={false}/><YAxis tickFormatter={shortMoney} tick={{fill:'#7c847b',fontSize:10}} axisLine={false} tickLine={false} width={55}/><Tooltip content={<ChartTip/>}/><Legend/><Bar dataKey="income" name="Income" fill="#34d399" radius={[4,4,0,0]}/><Bar dataKey="expenses" name="Expenses" fill="#d6a45a" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div></section>
      <section className="panel analytics-donut page-enter"><div className="panel-heading"><div><span className="panel-kicker">{tr("CURRENT MONTH")}</span><h2>{tr("Expense breakdown")}</h2></div></div>{categoryData.length?<><div className="donut-wrap large-donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryData} dataKey="value" innerRadius="65%" outerRadius="90%" paddingAngle={3} stroke="none">{categoryData.map((c:any)=><Cell key={c.name} fill={c.color}/>)}</Pie><Tooltip formatter={(v:any)=>money(v)}/></PieChart></ResponsiveContainer><div className="donut-center"><strong>{shortMoney(total)}</strong><span>{tr("Total expense")}</span></div></div><div className="analytics-category-list">{categoryData.map((c:any)=><div key={c.name}><span><i style={{background:c.color}}/>{catLabel(c.name)}</span><strong>{money(c.value)}</strong><em>{total?`${(c.value/total*100).toFixed(1)}%`:''}</em></div>)}</div></>:<EmptyChart text="No expense records for this month."/>}</section>
      <section className="panel analytics-wide page-enter"><div className="panel-heading"><div><span className="panel-kicker">{tr("SPENDING TREND")}</span><h2>{tr("How expenses move over time")}</h2></div></div>{trend.length?<div className="chart-wrap tall"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthlyData}><defs><linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity={.28}/><stop offset="100%" stopColor="#34d399" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#ffffff0c" vertical={false}/><XAxis dataKey="month" tick={{fill:'#7c847b',fontSize:11}} axisLine={false} tickLine={false}/><YAxis tickFormatter={shortMoney} tick={{fill:'#7c847b',fontSize:10}} axisLine={false} tickLine={false} width={55}/><Tooltip content={<ChartTip/>}/><Area type="monotone" dataKey="expenses" name="Expenses" stroke="#34d399" strokeWidth={2.5} fill="url(#expenseFill)" activeDot={{r:5}}/></AreaChart></ResponsiveContainer></div>:<EmptyChart text="Record expenses across months to reveal a spending trend."/>}</section>
      <section className="panel analytics-ranking page-enter"><div className="panel-heading"><div><span className="panel-kicker">{tr("CATEGORY COMPARISON")}</span><h2>{tr("Highest spending")}</h2></div></div>{categoryData.length?categoryData.map((c:any,i:number)=><div className="rank-row" key={c.name}><span className="rank-number">{String(i+1).padStart(2,'0')}</span><div className="rank-info"><div><strong>{catLabel(c.name)}</strong><span>{money(c.value)}</span></div><div className="progress-track"><span style={{width:`${c.value/categoryData[0].value*100}%`,background:c.color}}/></div></div></div>):<EmptyChart text="Your category ranking will appear when you add expenses."/>}</section>
      <section className="panel analytics-wide page-enter"><div className="panel-heading"><div><span className="panel-kicker">{tr("SAVINGS PROGRESS")}</span><h2>{tr("Monthly net cash flow")}</h2></div></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthlyData}><CartesianGrid stroke="#ffffff0c" vertical={false}/><XAxis dataKey="month" tick={{fill:'#7c847b',fontSize:11}} axisLine={false} tickLine={false}/><YAxis tickFormatter={shortMoney} tick={{fill:'#7c847b',fontSize:10}} axisLine={false} tickLine={false} width={55}/><Tooltip content={<ChartTip/>}/><Area type="monotone" dataKey="savings" name="Net cash flow" stroke="#d6a45a" fill="#d6a45a22" strokeWidth={2}/></AreaChart></ResponsiveContainer></div><p className="chart-footnote">{tr("Net cash flow is calculated as recorded income minus recorded expenses. It is not a separate savings-account balance.")}</p></section>
    </div>
  </div>
}
function CalendarPage({month,setMonth,transactions,selectedDate,setSelectedDate}:any) {
  const year=Number(month.slice(0,4)),m=Number(month.slice(5,7))-1,first=new Date(year,m,1),days=new Date(year,m+1,0).getDate(),offset=(first.getDay()+6)%7
  const cells=[...Array(offset).fill(null),...Array.from({length:days},(_,i)=>i+1)]
  const daily=transactions.filter((t:Transaction)=>t.date===selectedDate)
  const dailyExpense=daily.filter((t:Transaction)=>t.type==='expense').reduce((a:number,t:Transaction)=>a+t.amount,0)
  const dailyIncome=daily.filter((t:Transaction)=>t.type==='income').reduce((a:number,t:Transaction)=>a+t.amount,0)
  const dayTotals=(day:number)=>{const list=transactions.filter((t:Transaction)=>t.date===`${month}-${String(day).padStart(2,'0')}`);return {expense:list.filter((t:Transaction)=>t.type==='expense').reduce((a:number,t:Transaction)=>a+t.amount,0),income:list.filter((t:Transaction)=>t.type==='income').reduce((a:number,t:Transaction)=>a+t.amount,0),count:list.length}}
  return <div className="page-stack"><PageHeading eyebrow={tr("YOUR MONTH AT A GLANCE")} title={tr("Financial calendar")} description={tr("See the days your money moved, and open any date for the detail.")} action={<MonthControl month={month} setMonth={setMonth}/>}/>
    <div className="calendar-layout"><section className="panel calendar-panel page-enter"><div className="calendar-head"><div><span className="panel-kicker">{tr("MONTHLY ACTIVITY")}</span><h2>{monthLabel(month)}</h2></div><div className="calendar-legend"><span><i className="legend-income"/>{tr("Income")}</span><span><i className="legend-expense"/>{tr("Expense")}</span></div></div><div className="calendar-grid">{['MON','TUE','WED','THU','FRI','SAT','SUN'].map(d=><div className="calendar-weekday" key={d}>{d}</div>)}{cells.map((day,i)=>{if(!day)return <div key={`blank-${i}`}/>;const totals=dayTotals(day),iso=`${month}-${String(day).padStart(2,'0')}`;return <button key={day} className={`calendar-day ${selectedDate===iso?'selected':''} ${iso===dateISO()?'today':''}`} onClick={()=>setSelectedDate(iso)}><span>{day}</span>{totals.count>0&&<div className="day-dots">{totals.income>0&&<i className="income-dot"/>}{totals.expense>0&&<i className="expense-dot"/>}</div>}{totals.expense>0&&<small>{shortMoney(totals.expense)}</small>}</button>})}</div></section>
      <section className="panel daily-panel page-enter"><div className="panel-heading"><div><span className="panel-kicker">{tr("DAY DETAIL")}</span><h2>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString(getLang()==='id'?'id-ID':'en-US',{weekday:'long',day:'numeric',month:'long'})}</h2></div><CalendarDays size={18} className="muted-icon"/></div><div className="daily-totals"><div><span>{tr("Income")}</span><strong className="positive">{money(dailyIncome)}</strong></div><div><span>{tr("Expenses")}</span><strong className="negative">{money(dailyExpense)}</strong></div></div><div className="daily-net"><span>{tr("Net movement")}</span><strong className={dailyIncome-dailyExpense>=0?'positive':'negative'}>{money(dailyIncome-dailyExpense)}</strong></div><TransactionRows rows={daily}/></section></div>
  </div>
}
function GoalsPage({goals,onSave,onDelete}:{goals:Goal[];onSave:(g:Goal)=>void;onDelete:(id:string)=>void}) {
  const categories=['Emergency Fund','Education','Technology','Travel','Vehicle','Investment','Personal','Other']
  const [form,setForm]=useState(false),[edit,setEdit]=useState<Goal|null>(null)
  const [name,setName]=useState(''),[category,setCategory]=useState('Personal'),[target,setTarget]=useState(''),[saved,setSaved]=useState(''),[date,setDate]=useState(''),[description,setDescription]=useState(''),[priority,setPriority]=useState<'Low'|'Medium'|'High'>('Medium')
  const [view,setView]=useState<'grid'|'list'>('grid'),[search,setSearch]=useState(''),[filterCategory,setFilterCategory]=useState('all'),[filterStatus,setFilterStatus]=useState('all'),[sort,setSort]=useState('date')
  const [activeGoal,setActiveGoal]=useState<Goal|null>(null),[contributionType,setContributionType]=useState<'deposit'|'withdrawal'>('deposit'),[contributionAmount,setContributionAmount]=useState(''),[contributionDate,setContributionDate]=useState(dateISO()),[contributionNotes,setContributionNotes]=useState(''),[contributionError,setContributionError]=useState('')
  const [historyFilter,setHistoryFilter]=useState('all'),[historyMonth,setHistoryMonth]=useState(dateISO().slice(0,7)),[selectedHistoryGoal,setSelectedHistoryGoal]=useState<Goal|null>(null),[projectionPeriod,setProjectionPeriod]=useState<'daily'|'weekly'|'monthly'>('monthly')
  const today=dateISO()
  const statusOf=(g:Goal)=>g.completed||g.saved>=g.target?'Completed':g.paused?'Paused':g.date&&g.date<today?'Overdue':'Active'
  const pctOf=(g:Goal)=>g.target>0?Math.min(100,Math.max(0,g.saved/g.target*100)):0
  const activeGoals=goals.filter((g:Goal)=>statusOf(g)==='Active'||statusOf(g)==='Overdue')
  const totalSavings=goals.reduce((a:number,g:Goal)=>a+Math.max(0,g.saved),0)
  const totalTarget=activeGoals.reduce((a:number,g:Goal)=>a+g.target,0)
  const overallProgress=totalTarget>0?Math.min(100,totalSavings/totalTarget*100):0
  const allContributions: (GoalContribution & {goalName:string;goalId:string})[]=goals.flatMap((g:Goal)=>(g.contributions||[]).map(c=>({...c,goalName:g.name,goalId:g.id}))).sort((a: GoalContribution & {goalName:string;goalId:string},b: GoalContribution & {goalName:string;goalId:string})=>b.date.localeCompare(a.date))
  const historyRows=allContributions.filter(c=>(historyFilter==='all'||c.type===historyFilter)&&(historyMonth==='all'||c.date.slice(0,7)===historyMonth))
  const visibleGoals=goals.filter((g:Goal)=>g.name.toLowerCase().includes(search.toLowerCase())&&(filterCategory==='all'||(g.category||'Personal')===filterCategory)&&(filterStatus==='all'||statusOf(g)===filterStatus)).sort((a:Goal,b:Goal)=>sort==='progress'?pctOf(b)-pctOf(a):sort==='amount'?b.target-a.target:sort==='priority'?(['High','Medium','Low'].indexOf(a.priority||'Medium')-['High','Medium','Low'].indexOf(b.priority||'Medium')):((a.date||'9999').localeCompare(b.date||'9999')))
  const begin=(g?:Goal)=>{setEdit(g||null);setName(g?.name||'');setCategory(g?.category||'Personal');setTarget(g?String(g.target):'');setSaved(g?String(g.saved):'');setDate(g?.date||'');setDescription(g?.description||'');setPriority(g?.priority||'Medium');setForm(true)}
  const saveForm=(e:FormEvent)=>{e.preventDefault();const t=Number(limitedDigits(target)),v=Number(limitedDigits(saved)||0);if(!name.trim()||!t||v>t||t>MAX_FINANCIAL_INPUT)return;onSave({...(edit||{}),id:edit?.id||uid(),name:name.trim(),category,target:t,saved:v,date,description:description.trim(),priority,contributions:edit?.contributions||[],paused:edit?.paused||false,completed:edit?.completed||false});setForm(false);setEdit(null)}
  const openContribution=(g:Goal,type:'deposit'|'withdrawal'='deposit')=>{setActiveGoal(g);setContributionType(type);setContributionAmount('');setContributionDate(today);setContributionNotes('');setContributionError('')}
  const commitContribution=(e:FormEvent)=>{e.preventDefault();if(!activeGoal)return;const amount=Number(limitedDigits(contributionAmount));if(!amount){setContributionError(tr("Enter an amount greater than zero."));return}if(contributionType==='withdrawal'&&amount>activeGoal.saved){setContributionError(tr("Withdrawal cannot exceed the current saved balance."));return}const next=activeGoal.saved+(contributionType==='deposit'?amount:-amount);const entry:GoalContribution={id:uid(),type:contributionType,amount,date:contributionDate,notes:contributionNotes.trim(),balance:next};onSave({...activeGoal,saved:next,completed:next>=activeGoal.target,contributions:[...(activeGoal.contributions||[]),entry]});setActiveGoal(null)}
  const togglePause=(g:Goal)=>onSave({...g,paused:!g.paused})
  const markComplete=(g:Goal)=>onSave({...g,completed:true,paused:false})
  const remaining=activeGoals.reduce<number>((a: number,g: Goal)=>a+Math.max(0,g.target-g.saved),0)
  const daysLeftOf=(g:Goal)=>g.date?Math.max(1,Math.ceil((new Date(`${g.date}T12:00:00`).getTime()-new Date(`${today}T12:00:00`).getTime())/86400000)):30
  const onTrackGoals=activeGoals.filter((g:Goal)=>statusOf(g)==='Active')
  const overdueGoals=activeGoals.filter((g:Goal)=>statusOf(g)==='Overdue')
  const overdueRemaining=overdueGoals.reduce<number>((a:number,g:Goal)=>a+Math.max(0,g.target-g.saved),0)
  const dailyRequired=onTrackGoals.reduce<number>((total:number,g:Goal)=>total+Math.max(0,g.target-g.saved)/daysLeftOf(g),0)
  const weeklyRequired=dailyRequired*7
  const monthlyRequired=dailyRequired*30
  const periodRequired=projectionPeriod==='daily'?dailyRequired:projectionPeriod==='weekly'?weeklyRequired:monthlyRequired
  const projectionData=Array.from({length:7},(_,i)=>({period:i===0?'Now':`M${i}`,actual:totalSavings,projected:totalSavings+onTrackGoals.reduce<number>((sum:number,g:Goal)=>{const left=Math.max(0,g.target-g.saved);return sum+Math.min(left,left/daysLeftOf(g)*30*i)},0)}))
  const achievedMilestones=goals.reduce<number>((n: number,g: Goal)=>n+[25,50,75,100].filter(m=>pctOf(g)>=m).length,0)
  const insight=activeGoals.length===0?tr("Create a savings goal to start building a clear plan."):overdueGoals.length>0?`${overdueGoals.length} goal${overdueGoals.length>1?'s are':' is'} overdue (${money(overdueRemaining)} remaining). Update the target date to include ${overdueGoals.length>1?'them':'it'} in your plan.${onTrackGoals.length?` On-track goals need about ${money(monthlyRequired)} per month.`:''}`:remaining===0?tr("All active savings targets have been reached."):`You need approximately ${money(monthlyRequired)} per month across active goals to meet their target dates.`
  const achievements=[{name:tr("First Goal Created"),earned:goals.length>0,detail:tr("Create your first savings target.")},{name:tr("First Contribution"),earned:allContributions.some(c=>c.type==='deposit'),detail:tr("Record a contribution to any goal.")},{name:tr("Consistent Saver"),earned:new Set(allContributions.filter(c=>c.type==='deposit').map(c=>c.date)).size>=3,detail:tr("Contribute on three different dates.")},{name:tr("Halfway Champion"),earned:goals.some(g=>pctOf(g)>=50),detail:tr("Reach at least 50% on a goal.")},{name:tr("Goal Achieved"),earned:goals.some(g=>statusOf(g)==='Completed'),detail:tr("Complete a savings goal.")}]
  const categoryMark=(c:string)=>({'Emergency Fund':'EF','Education':'ED','Technology':'TE','Travel':'TR','Vehicle':'VE','Investment':'IN','Personal':'PE','Other':'OT'} as Record<string,string>)[c]||'GO'
  return <div className="page-stack goals-page">
    <PageHeading eyebrow={tr("BUILD TOWARD WHAT MATTERS")} title={tr("Savings goals")} description={tr("A clearer view of every target, every contribution, and the progress between them.")} action={<button className="primary-button" onClick={()=>begin()}><Plus size={16}/> {tr("Create a goal")} <span className="button-arrow"><ArrowUpRight size={14}/></span></button>}/>
    <section className="goals-overview page-enter">
      <div className="goal-overview-card lead"><span className="panel-kicker">{tr("TOTAL SAVINGS")}</span><strong>{money(totalSavings)}</strong><small>Across {goals.length} savings {goals.length===1?'goal':'goals'}</small><div className="goal-overview-mark"><PiggyBank size={23}/></div></div>
      <div className="goal-overview-card"><span className="panel-kicker">{tr("TOTAL TARGET")}</span><strong>{money(totalTarget)}</strong><small>{tr("Active and overdue goals")}</small><div className="goal-mini-track"><i style={{width:`${overallProgress}%`}}/></div></div>
      <div className="goal-overview-card"><span className="panel-kicker">{tr("ACTIVE GOALS")}</span><strong>{activeGoals.length}</strong><small>{goals.filter(g=>statusOf(g)==='Completed').length} completed · {goals.filter(g=>statusOf(g)==='Paused').length} paused</small></div>
      <div className="goal-overview-card"><span className="panel-kicker">{tr("OVERALL PROGRESS")}</span><strong>{overallProgress.toFixed(1)}<em>%</em></strong><small>{money(remaining)} remaining across active goals</small><div className="goal-mini-track"><i style={{width:`${overallProgress}%`}}/></div></div>
    </section>
    <section className="goals-toolbar panel page-enter"><div className="goals-search"><Search size={15}/><input aria-label={tr("Search savings goals")} placeholder={tr("Search goals...")} value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="goals-filters"><select aria-label={tr("Filter by category")} value={filterCategory} onChange={e=>setFilterCategory(e.target.value)}><option value="all">{tr("All categories")}</option>{categories.map(c=><option key={c}>{c}</option>)}</select><select aria-label={tr("Filter by status")} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="all">{tr("All statuses")}</option>{['Active','Completed','Overdue','Paused'].map(x=><option key={x} value={x}>{tr(x)}</option>)}</select><select aria-label={tr("Sort goals")} value={sort} onChange={e=>setSort(e.target.value)}><option value="date">{tr("Sort: Target date")}</option><option value="progress">{tr("Sort: Progress")}</option><option value="amount">{tr("Sort: Target amount")}</option><option value="priority">{tr("Sort: Priority")}</option></select><div className="goal-view-switch"><button className={view==='grid'?'active':''} onClick={()=>setView('grid')} aria-label={tr("Grid view")}>▦</button><button className={view==='list'?'active':''} onClick={()=>setView('list')} aria-label={tr("List view")}>☷</button></div></div></section>
    <div className="goals-section-heading"><div><span className="panel-kicker">{tr("YOUR SAVINGS PLAN")}</span><h2>{tr("Goals")} <span>{visibleGoals.length}</span></h2></div><span className="goals-section-note">{tr("Track progress at your own pace")}</span></div>
    {visibleGoals.length?<div className={view==='grid'?'goal-grid enhanced-goal-grid':'goal-list enhanced-goal-list'}>{visibleGoals.map((g:Goal)=>{const pct=pctOf(g),status=statusOf(g),days=g.date?Math.ceil((new Date(`${g.date}T12:00:00`).getTime()-new Date(`${today}T12:00:00`).getTime())/86400000):null,remainingGoal=Math.max(0,g.target-g.saved),milestones=[25,50,75,100];return <article className={`panel enhanced-goal-card ${view==='list'?'list-mode':''}`} key={g.id}>
      <div className="enhanced-goal-top"><div className="goal-category-mark">{categoryMark(g.category||'Personal')}</div><div className="goal-title-block"><span className="goal-category-label">{g.category||'Personal'} · {tr(g.priority||'Medium')} · {tr("Priority")}</span><h3>{g.name}</h3></div><span className={`goal-status ${status.toLowerCase()}`}>{tr(status)}</span></div>
      {g.description&&<p className="goal-description">{g.description}</p>}
      <div className="goal-balance-line"><div><small>{tr("Saved so far")}</small><strong>{money(g.saved)}</strong></div><div className="goal-target-value"><small>{tr("Target amount")}</small><strong>{money(g.target)}</strong></div></div>
      <div className="goal-progress-line"><span>{pct.toFixed(1)}% complete</span><span>{money(remainingGoal)} to go</span></div><div className="progress-track large enhanced-progress"><span style={{width:`${pct}%`}}/></div>
      <div className="goal-milestones">{milestones.map(m=><div className={pct>=m?'reached':''} key={m}><i/>{m}%</div>)}</div>
      <div className="goal-date-line"><span><CalendarDays size={13}/>{g.date?new Date(`${g.date}T12:00:00`).toLocaleDateString(getLang()==='id'?'id-ID':'en-US',{day:'numeric',month:'short',year:'numeric'}):tr("No target date")}</span><span>{status==='Completed'?tr("Target reached"):status==='Paused'?'Paused':days===null?tr("No deadline"):days<0?`${Math.abs(days)} days overdue`:days===0?tr("Due today"):`${days} days left`}</span></div>
      <div className="enhanced-goal-actions"><button className="primary-button" onClick={()=>openContribution(g,'deposit')} disabled={status==='Completed'||status==='Paused'}><Plus size={14}/> {tr("Add money")}</button><button className="secondary-button" onClick={()=>openContribution(g,'withdrawal')} disabled={g.saved<=0}><ArrowDownRight size={14}/> {tr("Withdraw")}</button><button className="icon-button subtle" onClick={()=>begin(g)} aria-label={`Edit ${g.name}`}><Pencil size={14}/></button><button className="icon-button subtle" onClick={()=>togglePause(g)} aria-label={g.paused?tr("Resume goal"):tr("Pause goal")}>{g.paused?<TrendingUp size={14}/>:<SlidersHorizontal size={14}/>}</button><button className="icon-button subtle" onClick={()=>setSelectedHistoryGoal(g)} aria-label={`View ${g.name} history`}><CalendarDays size={14}/></button><button className="icon-button subtle danger" onClick={()=>{if(window.confirm(`${tr("Delete")} “${g.name}” ${tr("and its contribution history?")}`))onDelete(g.id)}} aria-label={`Delete ${g.name}`}><Trash2 size={14}/></button></div>
      {!g.completed&&<button className="goal-complete-link" onClick={()=>markComplete(g)}>{tr("Mark as completed")} <ArrowUpRight size={13}/></button>}
    </article>})}</div>:<div className="panel goal-empty enhanced-empty"><div className="goal-empty-art"><div/><Target size={28}/></div><h2>{goals.length?tr("No goals match these filters."):tr("Give your savings a destination.")}</h2><p>{goals.length?tr("Try another search or filter to see your savings goals."):tr("Create a target and MONETRA will help you track every contribution along the way.")}</p><button className="primary-button" onClick={()=>goals.length?(setSearch(''),setFilterCategory('all'),setFilterStatus('all')):begin()}><Plus size={16}/>{goals.length?tr("Clear filters"):tr("Create your first goal")}</button></div>}
    <div className="goals-insights-grid">
      <section className="panel goal-projection-panel"><div className="panel-heading"><div><span className="panel-kicker">{tr("PLAN YOUR PACE")}</span><h2>{tr("Savings projection")}</h2></div><select aria-label={tr("Projection period")} value={projectionPeriod} onChange={e=>setProjectionPeriod(e.target.value as any)}><option value="daily">{tr("Daily")}</option><option value="weekly">{tr("Weekly")}</option><option value="monthly">{tr("Monthly")}</option></select></div><div className="projection-amount"><strong>{money(periodRequired)}</strong><span>required {projectionPeriod} contribution</span></div>{overdueGoals.length>0&&<p className="projection-note">Excludes {overdueGoals.length} overdue goal{overdueGoals.length>1?'s':''} ({money(overdueRemaining)} remaining). Set a new target date to include {overdueGoals.length>1?'them':'it'}.</p>}<div className="projection-breakdown"><div><span>{tr("Daily")}</span><strong>{money(dailyRequired)}</strong></div><div><span>{tr("Weekly")}</span><strong>{money(weeklyRequired)}</strong></div><div><span>{tr("Monthly")}</span><strong>{money(monthlyRequired)}</strong></div></div><div className="projection-chart"><ResponsiveContainer width="100%" height={170}><AreaChart data={projectionData} margin={{top:8,right:18,left:18,bottom:0}}><defs><linearGradient id="goalProjectionFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity={.25}/><stop offset="100%" stopColor="#34d399" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#ffffff10" vertical={false}/><XAxis dataKey="period" interval={0} tick={{fill:'#788477',fontSize:9}} axisLine={false} tickLine={false}/><YAxis hide domain={[0,'auto']}/><Tooltip formatter={(v:any)=>money(Number(v))} contentStyle={{background:'#171a17',border:'1px solid #ffffff20',borderRadius:6,color:'#e8ece5'}}/><Area type="monotone" dataKey="projected" name="Projected savings" stroke="#34d399" strokeWidth={2} fill="url(#goalProjectionFill)"/><Area type="monotone" dataKey="actual" name="Current savings" stroke="#6ee7b7" strokeDasharray="4 4" fill="transparent"/></AreaChart></ResponsiveContainer></div><p className="projection-note">{tr("Illustrative estimate: each on-track goal is spread evenly until its own target date, and overdue goals are excluded. It is not a guaranteed outcome.")}</p></section>
      <section className="panel savings-insights-panel"><div className="panel-heading"><div><span className="panel-kicker">{tr("BASED ON YOUR RECORDS")}</span><h2>{tr("Savings insights")}</h2></div><Sparkles size={17} className="muted-icon"/></div><div className="insight-highlight"><div className="insight-icon"><TrendingUp size={18}/></div><p>{insight}</p></div><div className="insight-stat-row"><span>{tr("Milestones reached")}</span><strong>{achievedMilestones}</strong></div><div className="insight-stat-row"><span>{tr("Total contributions")}</span><strong>{allContributions.filter(c=>c.type==='deposit').length}</strong></div><div className="insight-stat-row"><span>{tr("Contribution history")}</span><strong>{allContributions.length} records</strong></div><div className="insight-stat-row"><span>{tr("Completed goals")}</span><strong>{goals.filter(g=>statusOf(g)==='Completed').length}</strong></div></section>
    </div>
    <section className="panel achievements-panel"><div className="panel-heading"><div><span className="panel-kicker">{tr("SMALL STEPS ADD UP")}</span><h2>{tr("Achievements")}</h2></div><span className="achievement-count">{achievements.filter(a=>a.earned).length}/{achievements.length} unlocked</span></div><div className="achievement-grid">{achievements.map(a=><div className={`achievement-item ${a.earned?'earned':''}`} key={a.name}><div><Trophy size={17}/></div><strong>{a.name}</strong><span>{a.detail}</span><small>{a.earned?tr("Unlocked"):tr("Not yet unlocked")}</small></div>)}</div></section>
    <section className="panel contribution-history-panel"><div className="panel-heading"><div><span className="panel-kicker">{tr("YOUR SAVINGS ACTIVITY")}</span><h2>{tr("Contribution history")}</h2></div><div className="goal-history-filters"><select aria-label={tr("Filter contribution history")} value={historyFilter} onChange={e=>setHistoryFilter(e.target.value)}><option value="all">{tr("All activity")}</option><option value="deposit">{tr("Contributions")}</option><option value="withdrawal">{tr("Withdrawals")}</option></select><input aria-label={tr("Filter history by month")} type="month" value={historyMonth==='all'?'':historyMonth} onChange={e=>setHistoryMonth(e.target.value||'all')}/>{historyMonth!=='all'&&<button type="button" className="secondary-button" onClick={()=>setHistoryMonth('all')}>{tr("All time")}</button>}</div></div>{historyRows.length?<div className="goal-history-list">{historyRows.slice(0,12).map(c=><div className="goal-history-row" key={c.id}><div className={`goal-history-icon ${c.type}`}>{c.type==='deposit'?<ArrowUpRight size={15}/>:<ArrowDownRight size={15}/>}</div><div className="goal-history-main"><strong>{c.goalName}</strong><span>{new Date(`${c.date}T12:00:00`).toLocaleDateString(getLang()==='id'?'id-ID':'en-US',{day:'numeric',month:'short',year:'numeric'})}{c.notes?` · ${c.notes}`:''}</span></div><strong className={c.type==='deposit'?'positive':'negative'}>{c.type==='deposit'?'+':'−'}{money(c.amount)}</strong><small>Balance {money(c.balance)}</small></div>)}</div>:<div className="goal-history-empty"><Wallet size={20}/><strong>{allContributions.length?tr("No activity in this period"):tr("No contribution activity yet")}</strong><span>{allContributions.length?tr("Choose another month or tap All time to see every record."):tr("Use Add money on a goal to start your history.")}</span></div>}</section>
    {form&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setForm(false)}}><form className="modal goal-modal enhanced-goal-modal" onSubmit={saveForm}><div className="modal-head"><div><span className="panel-kicker">{tr("YOUR NEXT MILESTONE")}</span><h2>{edit?tr("Edit savings goal"):tr("Create a savings goal")}</h2></div><button type="button" className="icon-button" onClick={()=>setForm(false)} aria-label={tr("Close")}><X size={18}/></button></div><label>{tr("Goal name")}<input required maxLength={60} value={name} onChange={e=>setName(e.target.value)} placeholder={tr("e.g. Emergency fund")}/></label><div className="form-row"><label>{tr("Category")}<select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>{tr("Priority")}<select value={priority} onChange={e=>setPriority(e.target.value as any)}><option value="Low">{tr("Low")}</option><option value="Medium">{tr("Medium")}</option><option value="High">{tr("High")}</option></select></label></div><div className="form-row"><label>{tr("Target amount (IDR)")}<input required type="text" inputMode="numeric" maxLength={13} value={formatDigits(target)} onChange={e=>setTarget(limitedDigits(e.target.value))} placeholder="10.000.000"/></label><label>{tr("Already saved")}<input type="text" inputMode="numeric" maxLength={13} value={formatDigits(saved)} onChange={e=>setSaved(limitedDigits(e.target.value))} placeholder="0"/></label></div><label>{tr("Target date")}<input type="date" min={today} value={date} onChange={e=>setDate(e.target.value)}/></label><label>{tr("Description")} <span className="optional">{tr("(optional)")}</span><textarea rows={3} maxLength={240} value={description} onChange={e=>setDescription(e.target.value)} placeholder={tr("What are you saving for?")}/></label>{Number(limitedDigits(saved)||0)>Number(limitedDigits(target)||0)&&<p className="form-error"><AlertTriangle size={14}/>{tr("Saved amount cannot exceed the target amount.")}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setForm(false)}>{tr("Cancel")}</button><button type="submit" className="primary-button" disabled={!name.trim()||Number(limitedDigits(target))<=0||Number(limitedDigits(saved)||0)>Number(limitedDigits(target))}>{tr("Save goal")} <Check size={15}/></button></div></form></div>}
    {selectedHistoryGoal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelectedHistoryGoal(null)}}><div className="modal goal-detail-modal"><div className="modal-head"><div><span className="panel-kicker">{tr("COMPLETE SAVINGS RECORD")}</span><h2>{selectedHistoryGoal.name}</h2></div><button type="button" className="icon-button" onClick={()=>setSelectedHistoryGoal(null)} aria-label={tr("Close history")}><X size={18}/></button></div><div className="goal-detail-summary"><div><small>{tr("Current balance")}</small><strong>{money(selectedHistoryGoal.saved)}</strong></div><div><small>{tr("Target")}</small><strong>{money(selectedHistoryGoal.target)}</strong></div></div><div className="goal-detail-history">{(selectedHistoryGoal.contributions||[]).slice().sort((a,b)=>b.date.localeCompare(a.date)).length?(selectedHistoryGoal.contributions||[]).slice().sort((a,b)=>b.date.localeCompare(a.date)).map(c=><div className="goal-history-row" key={c.id}><div className={`goal-history-icon ${c.type}`}><ArrowUpRight size={15}/></div><div className="goal-history-main"><strong>{c.type==='deposit'?tr("Contribution"):tr("Withdrawal")}</strong><span>{new Date(`${c.date}T12:00:00`).toLocaleDateString(getLang()==='id'?'id-ID':'en-US',{day:'numeric',month:'short',year:'numeric'})}{c.notes?` · ${c.notes}`:''}</span></div><strong className={c.type==='deposit'?'positive':'negative'}>{c.type==='deposit'?'+':'−'}{money(c.amount)}</strong><small>Balance {money(c.balance)}</small></div>):<div className="goal-history-empty"><Wallet size={20}/><strong>{tr("No activity recorded")}</strong></div>}</div></div></div>}{activeGoal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setActiveGoal(null)}}><form className="modal contribution-modal" onSubmit={commitContribution}><div className="modal-head"><div><span className="panel-kicker">{activeGoal.name}</span><h2>{contributionType==='deposit'?'Add money':tr("Record a withdrawal")}</h2></div><button type="button" className="icon-button" onClick={()=>setActiveGoal(null)} aria-label={tr("Close")}><X size={18}/></button></div><div className="type-switch"><button type="button" className={contributionType==='deposit'?'selected income':''} onClick={()=>{setContributionType('deposit');setContributionError('')}}><ArrowUpRight size={15}/> {tr("Add money")}</button><button type="button" className={contributionType==='withdrawal'?'selected expense':''} onClick={()=>{setContributionType('withdrawal');setContributionError('')}}><ArrowDownRight size={15}/> {tr("Withdraw")}</button></div><div className="contribution-current"><span>{tr("Current balance")}</span><strong>{money(activeGoal.saved)}</strong></div><label>{tr("Amount (IDR)")}<input autoFocus required type="text" inputMode="numeric" maxLength={13} value={formatDigits(contributionAmount)} onChange={e=>{setContributionAmount(limitedDigits(e.target.value));setContributionError('')}} placeholder="500.000"/></label><label>{tr("Date")}<input type="date" max={today} required value={contributionDate} onChange={e=>setContributionDate(e.target.value)}/></label><label>{tr("Notes")} <span className="optional">{tr("(optional)")}</span><textarea rows={2} value={contributionNotes} onChange={e=>setContributionNotes(e.target.value)} placeholder={tr("Add a note...")}/></label><div className="contribution-preview"><span>{tr("New saved balance")}</span><strong>{money(activeGoal.saved+(contributionType==='deposit'?1:-1)*Number(limitedDigits(contributionAmount)||0))}</strong><span>{Math.max(0,Math.min(100,(activeGoal.saved+(contributionType==='deposit'?1:-1)*Number(limitedDigits(contributionAmount)||0))/activeGoal.target*100)).toFixed(1)}% of target</span></div>{contributionError&&<p className="form-error"><AlertTriangle size={14}/>{contributionError}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setActiveGoal(null)}>{tr("Cancel")}</button><button type="submit" className="primary-button">Confirm {contributionType==='deposit'?'contribution':'withdrawal'} <Check size={15}/></button></div></form></div>}
  </div>
}
function ReportsPage(p:any) {
  const {month,setMonth,income,expenses,balance,savingsRate,categoryData,monthlyData,onCSV,onPDF,transactions}=p
  const prev=monthlyData.length>1?monthlyData[monthlyData.length-2]:null
  return <div className="page-stack"><PageHeading eyebrow={tr("A CLEARER MONTH-END")} title={tr("Monthly report")} description={tr("A concise record of your financial activity, built from the transactions you've entered.")} action={<MonthControl month={month} setMonth={setMonth}/>}/>
    <section className="report-cover page-enter"><div className="report-cover-top"><div className="brand compact"><div className="brand-mark"><span/></div><span>monetra</span></div><span>{tr("MONTHLY FINANCIAL STATEMENT")}</span></div><h2>{monthLabel(month)}</h2><p>{tr("Your money, accounted for.")}</p><div className="report-cover-bottom"><span>{transactions.length} recorded transactions</span><span>Generated {new Date().toLocaleDateString('en-US')}</span></div></section>
    <div className="report-metrics"><Metric label={t('m.income')} value={money(income)} sub="Recorded inflows" icon={ArrowDownRight} tone="green"/><Metric label={t('m.expense')} value={money(expenses)} sub="Recorded outflows" icon={ArrowUpRight} tone="amber"/><Metric label={tr("Net cash flow")} value={money(balance)} sub="Income − expenses" icon={Wallet} tone="mint"/><Metric label={t('m.rate')} value={`${savingsRate.toFixed(1)}%`} sub="Net cash flow / income" icon={PiggyBank} tone="blue"/></div>
    <div className="report-grid"><section className="panel page-enter"><div className="panel-heading"><div><span className="panel-kicker">{tr("SPENDING DISTRIBUTION")}</span><h2>{tr("Expense by category")}</h2></div></div>{categoryData.length?categoryData.map((c:any)=><div className="report-category" key={c.name}><div><span>{catLabel(c.name)}</span><strong>{money(c.value)}</strong></div><div className="progress-track"><span style={{width:`${c.value/expenses*100}%`,background:c.color}}/></div></div>):<EmptyChart text="No expense distribution available yet."/>}</section><section className="panel page-enter"><div className="panel-heading"><div><span className="panel-kicker">{tr("MONTH-OVER-MONTH")}</span><h2>{tr("Comparison")}</h2></div></div>{prev&&prev.expenses>0?<><div className="comparison-line"><span>{tr("Expense change vs previous month")}</span><strong className={expenses<=prev.expenses?'positive':'negative'}>{((expenses-prev.expenses)/prev.expenses*100)>=0?'+':''}{((expenses-prev.expenses)/prev.expenses*100).toFixed(1)}%</strong></div><div className="comparison-line"><span>{tr("Previous month expenses")}</span><strong>{money(prev.expenses)}</strong></div><div className="comparison-line"><span>{tr("Current month expenses")}</span><strong>{money(expenses)}</strong></div></>:<div className="empty-chart"><p>{tr("Previous-month expense comparison needs recorded transactions in both periods.")}</p></div>}</section></div>
    <div className="report-export page-enter"><div><span className="panel-kicker">{tr("TAKE YOUR DATA WITH YOU")}</span><h2>{tr("Export your monthly report")}</h2><p>{tr("Download a copy for your own records. Your data stays on this device.")}</p></div><div className="export-actions"><button className="secondary-button" onClick={onCSV}><Download size={15}/> {tr("Export CSV")}</button><button className="primary-button" onClick={onPDF}><FileText size={15}/> {tr("Download PDF")} <span className="button-arrow"><ArrowUpRight size={14}/></span></button></div></div>
  </div>
}
function SettingsPage({cloud,lang,setLang,store,onDemo,onClear,onImport}:any) {
  const fileRef=useRef<HTMLInputElement>(null)
  const handleFile=(e:ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const parsed=JSON.parse(String(reader.result));if(!parsed||!Array.isArray(parsed.transactions)||!Array.isArray(parsed.budgets)||!Array.isArray(parsed.goals))throw new Error(tr("Invalid format"));if(window.confirm(tr("Importing this backup will replace the data currently stored in MONETRA. Continue?")))onImport(parsed)}catch{window.alert(tr("This file is not a valid MONETRA backup."))} };reader.readAsText(file);e.target.value=''}
  const backup=()=>download('monetra-backup.json',JSON.stringify(store,null,2),'application/json')
  return <div className="page-stack"><PageHeading eyebrow={t('s.eyebrow')} title={t('s.title')} description={t('s.desc')}/>
    <section className="panel settings-panel page-enter"><div className="settings-section"><div className="settings-icon"><Languages size={18}/></div><div className="settings-copy"><h2>{t('s.lang')}</h2><p>{t('s.lang.desc')}</p><div className="lang-switch"><button className={`secondary-button ${lang==='id'?'selected':''}`} aria-pressed={lang==='id'} onClick={()=>setLang('id')}>Bahasa Indonesia</button><button className={`secondary-button ${lang==='en'?'selected':''}`} aria-pressed={lang==='en'} onClick={()=>setLang('en')}>English</button></div></div></div><div className="settings-section"><div className="settings-icon"><CircleDollarSign size={18}/></div><div className="settings-copy"><h2>{t('s.cur')}</h2><p>{t('s.cur.desc')}</p><span className="settings-value">IDR <i>·</i> {tr("Indonesian Rupiah")} <i>·</i> Indonesia</span></div></div><div className="settings-section"><div className="settings-icon"><Download size={18}/></div><div className="settings-copy"><h2>{t('s.bak')}</h2><p>{t('s.bak.desc')}</p><button className="secondary-button" onClick={backup}><Download size={15}/> {t('s.bak.btn')}</button></div></div><div className="settings-section"><div className="settings-icon"><Upload size={18}/></div><div className="settings-copy"><h2>{t('s.res')}</h2><p>{t('s.res.desc')}</p><input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={handleFile}/><button className="secondary-button" onClick={()=>fileRef.current?.click()}><Upload size={15}/> {tr("Import backup")}</button></div></div><div className="settings-section"><div className="settings-icon"><Sparkles size={18}/></div><div className="settings-copy"><h2>{t('s.demo')}</h2><p>{t('s.demo.desc')}</p><button className="secondary-button" onClick={onDemo}><Plus size={15}/> {tr("Add demo transactions")}</button></div></div><div className="settings-section destructive"><div className="settings-icon"><Trash2 size={18}/></div><div className="settings-copy"><h2>{t('s.clear')}</h2><p>{t('s.clear.desc')}</p><button className="danger-button" onClick={onClear}><Trash2 size={15}/> {tr("Clear all data")}</button></div></div></section>
    <CloudPanel cloud={cloud}/>
    {cloud?.user?<div className="privacy-note page-enter"><div><Check size={17}/></div><p><strong>{tr("Your finances stay yours.")}</strong> {getLang()==='id'?'Selama kamu masuk, datamu disimpan di database Supabase milikmu dan hanya bisa dibaca akunmu sendiri. Tetap ekspor cadangan JSON secara berkala.':'While signed in, your data is stored in your own Supabase database and readable only by your account. Still export a JSON backup regularly.'}</p></div>:<div className="privacy-note page-enter"><div><Check size={17}/></div><p><strong>{tr("Your finances stay yours.")}</strong> {tr("MONETRA stores records in this browser only. Data is not sent to a cloud database. Export a JSON backup regularly, especially before clearing browser data or changing devices.")}</p></div>}
  </div>
}
function TransactionModal({initial,onClose,onSave}:{initial:Transaction|null,onClose:()=>void,onSave:(t:Transaction)=>void}) {
  const [name,setName]=useState(initial?.name||''),[amount,setAmount]=useState(initial?String(initial.amount):''),[type,setType]=useState<TxType>(initial?.type||'expense'),[category,setCategory]=useState(initial?.category||'Food & Beverages'),[date,setDate]=useState(initial?.date||dateISO()),[notes,setNotes]=useState(initial?.notes||''),[error,setError]=useState('')
  useEffect(()=>{setCategory(type==='income'?'Salary':'Food & Beverages')},[type])
  const submit=(e:FormEvent)=>{e.preventDefault();if(!name.trim()){setError(tr("Please enter a transaction name."));return}if(!Number.isFinite(Number(amount))||Number(amount)<=0){setError(tr("Amount must be greater than zero."));return}if(!date){setError(tr("Please choose a transaction date."));return}onSave({id:initial?.id||uid(),name:name.trim(),amount:Number(amount),type,category,date,notes:notes.trim()})}
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><form className="modal" onSubmit={submit}><div className="modal-head"><div><span className="panel-kicker">{initial?'UPDATE YOUR RECORD':'RECORD A MONEY MOVEMENT'}</span><h2>{initial?'Edit transaction':tr("New transaction")}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label={tr("Close")}><X size={18}/></button></div><div className="type-switch"><button type="button" className={type==='expense'?'selected expense':''} onClick={()=>setType('expense')}><ArrowUpRight size={15}/> {tr("Expense")}</button><button type="button" className={type==='income'?'selected income':''} onClick={()=>setType('income')}><ArrowDownRight size={15}/> {tr("Income")}</button></div><label>{tr("Transaction name")}<input autoFocus required value={name} onChange={e=>setName(e.target.value)} placeholder={tr("e.g. Monthly salary")}/></label><label>{tr("Amount (IDR)")}<div className="amount-input"><span>Rp</span><input required type="text" inputMode="numeric" maxLength={13} value={formatDigits(amount)} onChange={e=>setAmount(limitedDigits(e.target.value))} placeholder="1.000.000" aria-label={tr("Transaction amount in rupiah")}/></div></label><div className="form-row"><label>{tr("Category")}<select value={category} onChange={e=>setCategory(e.target.value)}>{(type==='income'?INCOME_CATEGORIES:EXPENSE_CATEGORIES).map(c=><option key={c}>{c}</option>)}</select></label><label>{tr("Date")}<input required type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div><label>{tr("Notes")} <span className="optional">{tr("(optional)")}</span><textarea rows={2} value={notes} onChange={e=>setNotes(e.target.value)} placeholder={tr("Add a little context...")}/></label>{error&&<p className="form-error"><AlertTriangle size={14}/>{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>{tr("Cancel")}</button><button className="primary-button" type="submit">{initial?tr("Save changes"):tr("Save transaction")} <ArrowUpRight size={15}/></button></div></form></div>
}
function DebtsPage({debts,onSave,onDelete}:{debts:Debt[];onSave:(d:Debt)=>void;onDelete:(id:string)=>void}) {
  const today=dateISO()
  const paidOf=(d:Debt)=>d.payments.reduce((a:number,p:DebtPayment)=>a+p.amount,0)
  const remainingOf=(d:Debt)=>Math.max(0,d.amount-paidOf(d))
  const statusOf=(d:Debt)=>remainingOf(d)===0?'Settled':d.due&&d.due<today?'Overdue':'Open'
  const fmt=(iso:string)=>new Date(`${iso}T12:00:00`).toLocaleDateString(getLang()==='id'?'id-ID':'en-US',{day:'numeric',month:'short',year:'numeric'})
  const [search,setSearch]=useState(''),[dirFilter,setDirFilter]=useState('all'),[statusFilter,setStatusFilter]=useState('open')
  const [form,setForm]=useState(false),[edit,setEdit]=useState<Debt|null>(null)
  const [person,setPerson]=useState(''),[direction,setDirection]=useState<'lent'|'borrowed'>('lent'),[amount,setAmount]=useState(''),[date,setDate]=useState(today),[due,setDue]=useState(''),[notes,setNotes]=useState(''),[formError,setFormError]=useState('')
  const [payDebt,setPayDebt]=useState<Debt|null>(null),[payAmount,setPayAmount]=useState(''),[payDate,setPayDate]=useState(today),[payNotes,setPayNotes]=useState(''),[payError,setPayError]=useState('')
  const [openId,setOpenId]=useState<string|null>(null)
  const owedToMe=debts.filter((d:Debt)=>d.direction==='lent').reduce((a:number,d:Debt)=>a+remainingOf(d),0)
  const iOwe=debts.filter((d:Debt)=>d.direction==='borrowed').reduce((a:number,d:Debt)=>a+remainingOf(d),0)
  const openCount=debts.filter((d:Debt)=>statusOf(d)!=='Settled').length
  const overdueCount=debts.filter((d:Debt)=>statusOf(d)==='Overdue').length
  const visible=debts.filter((d:Debt)=>d.person.toLowerCase().includes(search.toLowerCase())&&(dirFilter==='all'||d.direction===dirFilter)&&(statusFilter==='all'||(statusFilter==='open'?statusOf(d)!=='Settled':statusOf(d)==='Settled'))).sort((a:Debt,b:Debt)=>(statusOf(a)==='Settled'?1:0)-(statusOf(b)==='Settled'?1:0)||(a.due||'9999').localeCompare(b.due||'9999')||b.date.localeCompare(a.date))
  const begin=(d?:Debt)=>{setEdit(d||null);setPerson(d?.person||'');setDirection(d?.direction||'lent');setAmount(d?String(d.amount):'');setDate(d?.date||today);setDue(d?.due||'');setNotes(d?.notes||'');setFormError('');setForm(true)}
  const submit=(e:FormEvent)=>{e.preventDefault();const value=Number(limitedDigits(amount));if(!person.trim()){setFormError(tr("Please enter who this is with."));return}if(!value){setFormError(tr("Amount must be greater than zero."));return}if(edit&&value<paidOf(edit)){setFormError(`${tr("Amount cannot be lower than the")} ${money(paidOf(edit))} ${tr("already paid.")}`);return}if(due&&due<date){setFormError(tr("Due date cannot be before the date of the debt."));return}onSave({id:edit?.id||uid(),person:person.trim(),direction,amount:value,date,due:due||undefined,notes:notes.trim(),payments:edit?.payments||[]});setForm(false)}
  const openPay=(d:Debt)=>{setPayDebt(d);setPayAmount('');setPayDate(today);setPayNotes('');setPayError('')}
  const commitPay=(e:FormEvent)=>{e.preventDefault();if(!payDebt)return;const value=Number(limitedDigits(payAmount));if(!value){setPayError(tr("Enter an amount greater than zero."));return}if(value>remainingOf(payDebt)){setPayError(`${tr("Payment cannot exceed the remaining")} ${money(remainingOf(payDebt))}.`);return}onSave({...payDebt,payments:[...payDebt.payments,{id:uid(),amount:value,date:payDate,notes:payNotes.trim()}]});setPayDebt(null)}
  const removePayment=(d:Debt,id:string)=>{if(!window.confirm(tr("Remove this payment? The remaining balance will go back up.")))return;onSave({...d,payments:d.payments.filter((p:DebtPayment)=>p.id!==id)})}
  return <div className="page-stack goals-page"><PageHeading eyebrow={tr("WHO OWES WHAT")} title={tr("Debts")} description={tr("Keep track of money you lent to friends and money you owe, with partial payments.")} action={<button className="primary-button" onClick={()=>begin()}><Plus size={16}/> {tr("Add debt")} <span className="button-arrow"><ArrowUpRight size={14}/></span></button>}/>
    <section className="goals-overview debts-overview page-enter">
      <div className="goal-overview-card lead"><span className="panel-kicker">{tr("THEY OWE ME")}</span><strong>{money(owedToMe)}</strong><small>{tr("Still to be paid back to you")}</small><div className="goal-overview-mark"><ArrowDownRight size={22}/></div></div>
      <div className="goal-overview-card"><span className="panel-kicker">{tr("I OWE")}</span><strong>{money(iOwe)}</strong><small>{openCount} {tr("open")} · {overdueCount} {tr("overdue")}</small><div className="goal-overview-mark"><ArrowUpRight size={22}/></div></div>
      <div className="goal-overview-card"><span className="panel-kicker">{tr("NET POSITION")}</span><strong className={owedToMe-iOwe>=0?'positive':'negative'}>{owedToMe-iOwe<0?'−':''}{money(Math.abs(owedToMe-iOwe))}</strong><small>{owedToMe-iOwe>=0?tr("In your favor"):tr("You owe more than you are owed")}</small><div className="goal-overview-mark"><Wallet size={22}/></div></div>
    </section>
    <section className="goals-toolbar panel page-enter"><div className="goals-search"><Search size={15}/><input aria-label={tr("Search by name")} placeholder={tr("Search by name...")} value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="goals-filters"><select aria-label={tr("Filter by direction")} value={dirFilter} onChange={e=>setDirFilter(e.target.value)}><option value="all">{tr("Everyone")}</option><option value="lent">{tr("They owe me")}</option><option value="borrowed">{tr("I owe them")}</option></select><select aria-label={tr("Filter by status")} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="open">{tr("Open")}</option><option value="settled">{tr("Settled")}</option><option value="all">{tr("All records")}</option></select></div></section>
    <section className="panel page-enter">{visible.length?<div className="transaction-list">{visible.map((d:Debt)=>{const status=statusOf(d),paid=paidOf(d),left=remainingOf(d),pct=d.amount>0?Math.min(100,paid/d.amount*100):0;return <div key={d.id}>
      <div className="transaction-row" style={status==='Settled'?{opacity:.6}:undefined}><div className={`tx-symbol ${d.direction==='lent'?'income':'expense'}`}><span style={{fontSize:12,fontWeight:600}}>{(d.person.trim()[0]||'?').toUpperCase()}</span></div>
        <div className="tx-main"><strong>{d.person}</strong><span>{d.direction==='lent'?tr("Owes you"):tr("You owe")}<i>·</i>{fmt(d.date)}{d.due&&<><i>·</i>{tr("Due")} {fmt(d.due)}</>}{d.notes&&<><i>·</i>{d.notes}</>}</span><div className="progress-track"><span className={status==='Overdue'?'danger':''} style={{width:`${pct}%`}}/></div><span>{tr("Paid")} {money(paid)} {tr("of")} {money(d.amount)}</span></div>
        <div style={{display:'grid',gap:5,justifyItems:'end'}}><strong className={`tx-amount ${d.direction==='lent'?'income':'expense'}`}>{status==='Settled'?tr("Settled"):money(left)}</strong>{status!=='Open'&&<span className={`goal-status ${status.toLowerCase()}`}>{tr(status)}</span>}</div>
        {status!=='Settled'&&<button className="secondary-button" onClick={()=>openPay(d)}>{d.direction==='lent'?tr("Received"):tr("Paid")}</button>}
        <button className="row-action" onClick={()=>setOpenId(openId===d.id?null:d.id)} aria-label={tr("Payment history")}>{openId===d.id?<ChevronDown size={15}/>:<ChevronRight size={15}/>}</button><button className="row-action" onClick={()=>begin(d)} aria-label={tr("Edit")}><Pencil size={14}/></button><button className="row-action danger" onClick={()=>onDelete(d.id)} aria-label={tr("Delete")}><Trash2 size={14}/></button></div>
      {openId===d.id&&<div className="goal-detail-history" style={{padding:'0 0 10px 44px'}}>{d.payments.length?d.payments.slice().sort((a:DebtPayment,b:DebtPayment)=>b.date.localeCompare(a.date)).map((p:DebtPayment)=><div className="goal-history-row" key={p.id}><div className="goal-history-icon deposit"><Check size={14}/></div><div className="goal-history-main"><strong>{d.direction==='lent'?tr("Payment received"):tr("Payment made")}</strong><span>{fmt(p.date)}{p.notes?` · ${p.notes}`:''}</span></div><strong className="positive">{money(p.amount)}</strong><button className="row-action danger" onClick={()=>removePayment(d,p.id)} aria-label={tr("Remove payment")}><X size={13}/></button></div>):<div className="goal-history-empty"><span>{tr("No payments recorded yet.")}</span></div>}</div>}
    </div>})}</div>:<div className="goal-history-empty"><Users size={20}/><strong>{debts.length?tr("Nothing matches these filters"):tr("No debts recorded yet")}</strong><span>{debts.length?tr("Try another filter or switch to All records."):tr("Add a friend who owes you money, or something you owe, to start tracking.")}</span></div>}</section>
    {form&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setForm(false)}}><form className="modal enhanced-goal-modal" onSubmit={submit}><div className="modal-head"><div><span className="panel-kicker">{tr("KEEP IT CLEAR")}</span><h2>{edit?tr("Edit debt"):tr("New debt")}</h2></div><button type="button" className="icon-button" onClick={()=>setForm(false)} aria-label={tr("Close")}><X size={18}/></button></div>
      <div className="type-switch"><button type="button" className={direction==='lent'?'selected income':''} onClick={()=>setDirection('lent')}><ArrowDownRight size={15}/> {tr("They owe me")}</button><button type="button" className={direction==='borrowed'?'selected expense':''} onClick={()=>setDirection('borrowed')}><ArrowUpRight size={15}/> {tr("I owe them")}</button></div>
      <label>{tr("Friend's name")}<input autoFocus required maxLength={40} value={person} onChange={e=>{setPerson(e.target.value);setFormError('')}} placeholder={tr("e.g. Rani")}/></label>
      <label>{tr("Amount (IDR)")}<input required type="text" inputMode="numeric" maxLength={13} value={formatDigits(amount)} onChange={e=>{setAmount(limitedDigits(e.target.value));setFormError('')}} placeholder="150.000"/></label>
      <div className="form-row"><label>{tr("Date")}<input type="date" max={today} value={date} onChange={e=>setDate(e.target.value)}/></label><label>{tr("Due date")} <span className="optional">{tr("(optional)")}</span><input type="date" value={due} onChange={e=>setDue(e.target.value)}/></label></div>
      <label>{tr("Notes")} <span className="optional">{tr("(optional)")}</span><textarea rows={2} maxLength={120} value={notes} onChange={e=>setNotes(e.target.value)} placeholder={tr("e.g. Lunch, concert ticket")}/></label>
      {formError&&<p className="form-error"><AlertTriangle size={14}/>{formError}</p>}
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setForm(false)}>{tr("Cancel")}</button><button type="submit" className="primary-button">{tr("Save debt")} <Check size={15}/></button></div></form></div>}
    {payDebt&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setPayDebt(null)}}><form className="modal contribution-modal" onSubmit={commitPay}><div className="modal-head"><div><span className="panel-kicker">{payDebt.person}</span><h2>{payDebt.direction==='lent'?tr("Record a payment received"):tr("Record a payment made")}</h2></div><button type="button" className="icon-button" onClick={()=>setPayDebt(null)} aria-label={tr("Close")}><X size={18}/></button></div>
      <div className="contribution-current"><span>{tr("Remaining")}</span><strong>{money(remainingOf(payDebt))}</strong></div>
      <label>{tr("Amount (IDR)")}<input autoFocus required type="text" inputMode="numeric" maxLength={13} value={formatDigits(payAmount)} onChange={e=>{setPayAmount(limitedDigits(e.target.value));setPayError('')}} placeholder="50.000"/></label>
      <button type="button" className="text-link" onClick={()=>{setPayAmount(String(remainingOf(payDebt)));setPayError('')}}>{tr("Pay the full remaining amount")}</button>
      <label>{tr("Date")}<input type="date" max={today} required value={payDate} onChange={e=>setPayDate(e.target.value)}/></label>
      <label>{tr("Notes")} <span className="optional">{tr("(optional)")}</span><textarea rows={2} value={payNotes} onChange={e=>setPayNotes(e.target.value)} placeholder={tr("Add a note...")}/></label>
      {payError&&<p className="form-error"><AlertTriangle size={14}/>{payError}</p>}
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setPayDebt(null)}>{tr("Cancel")}</button><button type="submit" className="primary-button">{tr("Confirm")} <Check size={15}/></button></div></form></div>}
  </div>
}
function RecurringPanel({rules,onAdd,onEdit,onDelete,onToggle}:{rules:Recurring[],onAdd:()=>void,onEdit:(r:Recurring)=>void,onDelete:(id:string)=>void,onToggle:(id:string)=>void}) {
  const describe=(r:Recurring)=>r.frequency==='weekly'?`${tr("Every")} ${new Date(`${r.startDate}T12:00:00`).toLocaleDateString(getLang()==='id'?'id-ID':'en-US',{weekday:'long'})}`:`${tr("Monthly on day")} ${r.day}`
  return <section className="panel page-enter recurring-panel"><div className="panel-heading"><div><span className="panel-kicker">{tr("AUTO-RECORDED")}</span><h2>{tr("Recurring transactions")}</h2></div><button className="secondary-button" onClick={onAdd}><Plus size={15}/> {tr("Add recurring")}</button></div>
    {rules.length?<div className="transaction-list">{rules.map(r=>{const next=r.active?nextDueDate(r):'';return <div className="transaction-row" key={r.id} style={r.active?undefined:{opacity:.55}}><div className={`tx-symbol ${r.type}`}><RefreshCw size={15}/></div><div className="tx-main"><strong>{r.name}</strong><span>{describe(r)}<i>·</i>{r.category}<i>·</i>{r.active?(next?`${tr("Next")} ${new Date(`${next}T12:00:00`).toLocaleDateString(getLang()==='id'?'id-ID':'en-US',{day:'numeric',month:'short',year:'numeric'})}`:tr("No upcoming date")):'Paused'}</span></div><strong className={`tx-amount ${r.type}`}>{r.type==='income'?'+':'−'}{money(r.amount)}</strong><button className="row-action" onClick={()=>onToggle(r.id)} aria-label={r.active?tr("Pause rule"):tr("Resume rule")} title={r.active?tr("Pause"):tr("Resume")}>{r.active?<X size={14}/>:<Check size={14}/>}</button><button className="row-action" onClick={()=>onEdit(r)} aria-label={tr("Edit rule")}><Pencil size={14}/></button><button className="row-action danger" onClick={()=>onDelete(r.id)} aria-label={tr("Delete rule")}><Trash2 size={14}/></button></div>})}</div>
    :<div className="goal-history-empty"><RefreshCw size={20}/><strong>{tr("No recurring transactions yet")}</strong><span>{tr("Add rent, subscriptions, or allowance once and MONETRA records them for you.")}</span></div>}
  </section>
}
function RecurringModal({initial,onClose,onSave}:{initial:Recurring|null,onClose:()=>void,onSave:(r:Recurring)=>void}) {
  const [name,setName]=useState(initial?.name||''),[amount,setAmount]=useState(initial?String(initial.amount):''),[type,setType]=useState<TxType>(initial?.type||'expense'),[category,setCategory]=useState(initial?.category||'Bills & Utilities'),[frequency,setFrequency]=useState<'weekly'|'monthly'>(initial?.frequency||'monthly'),[startDate,setStartDate]=useState(initial?.startDate||dateISO()),[notes,setNotes]=useState(initial?.notes||''),[error,setError]=useState('')
  const categories=type==='income'?INCOME_CATEGORIES:EXPENSE_CATEGORIES
  const switchType=(t:TxType)=>{setType(t);setCategory(t==='income'?'Salary':'Bills & Utilities')}
  const submit=(e:FormEvent)=>{e.preventDefault();const value=Number(limitedDigits(amount));if(!name.trim()){setError(tr("Please enter a name."));return}if(!value){setError(tr("Amount must be greater than zero."));return}if(!startDate){setError(tr("Please choose the first date."));return}
    onSave({id:initial?.id||uid(),name:name.trim(),amount:value,type,category,frequency,day:Number(startDate.slice(8,10)),startDate,notes:notes.trim(),active:initial?initial.active:true,lastGenerated:initial?.lastGenerated})}
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><form className="modal" onSubmit={submit}><div className="modal-head"><div><span className="panel-kicker">{tr("RECORD IT ONCE")}</span><h2>{initial?tr("Edit recurring transaction"):tr("New recurring transaction")}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label={tr("Close")}><X size={18}/></button></div>
    <div className="type-switch"><button type="button" className={type==='expense'?'selected expense':''} onClick={()=>switchType('expense')}><ArrowUpRight size={15}/> {tr("Expense")}</button><button type="button" className={type==='income'?'selected income':''} onClick={()=>switchType('income')}><ArrowDownRight size={15}/> {tr("Income")}</button></div>
    <label>{tr("Name")}<input autoFocus required maxLength={60} value={name} onChange={e=>{setName(e.target.value);setError('')}} placeholder={tr("e.g. Boarding house rent")}/></label>
    <div className="form-row"><label>{tr("Amount (IDR)")}<input required type="text" inputMode="numeric" maxLength={13} value={formatDigits(amount)} onChange={e=>{setAmount(limitedDigits(e.target.value));setError('')}} placeholder="1.200.000"/></label><label>{tr("Category")}<select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label></div>
    <div className="form-row"><label>{tr("Repeats")}<select value={frequency} onChange={e=>setFrequency(e.target.value as 'weekly'|'monthly')}><option value="monthly">{tr("Every month")}</option><option value="weekly">{tr("Every week")}</option></select></label><label>{tr("First date")}<input required type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/></label></div>
    <label>{tr("Notes")} <span className="optional">{tr("(optional)")}</span><textarea rows={2} maxLength={120} value={notes} onChange={e=>setNotes(e.target.value)} placeholder={tr("Add a note...")}/></label>
    {frequency==='monthly'&&Number(startDate.slice(8,10))>28&&<p className="projection-note">{tr("On shorter months this is recorded on the last day of the month.")}</p>}
    {error&&<p className="form-error"><AlertTriangle size={14}/>{error}</p>}
    <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>{tr("Cancel")}</button><button type="submit" className="primary-button">{tr("Save rule")} <Check size={15}/></button></div></form></div>
}
function ConfirmModal({title,body,onCancel,onConfirm}:any) { return <div className="modal-backdrop"><div className="modal confirm-modal"><div className="confirm-icon"><AlertTriangle size={20}/></div><h2>{title}</h2><p>{body}</p><div className="modal-actions"><button className="secondary-button" onClick={onCancel}>{tr("Keep my data")}</button><button className="danger-button" onClick={onConfirm}>{tr("Clear everything")}</button></div></div></div> }
