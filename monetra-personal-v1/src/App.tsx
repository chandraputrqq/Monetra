import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, FormEvent, ChangeEvent } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  LayoutDashboard, ArrowLeftRight, Wallet, ChartNoAxesCombined, CalendarDays,
  Target, FileText, Settings, Plus, Search, Bell, ChevronDown, ChevronLeft,
  ChevronRight, ArrowUpRight, ArrowDownRight, MoreHorizontal, Pencil, Trash2,
  X, Download, Upload, TrendingUp, TrendingDown, CircleHelp, SlidersHorizontal,
  Menu, Check, AlertTriangle, PiggyBank, CircleDollarSign, Sparkles, RotateCcw
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts'

gsap.registerPlugin(ScrollTrigger)

type TxType = 'income' | 'expense'
type Transaction = { id: string; name: string; amount: number; type: TxType; category: string; date: string; notes?: string }
type Budget = { category: string; limit: number }
type Goal = { id: string; name: string; target: number; saved: number; date: string }
type Page = 'Dashboard' | 'Transactions' | 'Monthly Budget' | 'Analytics' | 'Financial Calendar' | 'Savings Goals' | 'Monthly Reports' | 'Settings'

const EXPENSE_CATEGORIES = ['Food & Beverages','Transportation','Shopping','Entertainment','Education','Bills & Utilities','Health','Housing','Subscriptions','Other']
const INCOME_CATEGORIES = ['Salary','Business','Freelance','Investment Returns','Other Income']
const NAV: { label: Page; icon: typeof LayoutDashboard }[] = [
  { label:'Dashboard', icon:LayoutDashboard }, { label:'Transactions', icon:ArrowLeftRight },
  { label:'Monthly Budget', icon:Wallet }, { label:'Analytics', icon:ChartNoAxesCombined },
  { label:'Financial Calendar', icon:CalendarDays }, { label:'Savings Goals', icon:Target },
  { label:'Monthly Reports', icon:FileText }, { label:'Settings', icon:Settings }
]
const COLORS = ['#9bd6a5','#6cae7a','#4e8960','#c4a46a','#839b91','#71877d','#b4c6b7','#8d9c73','#9d826c','#718b9a']
const KEY = 'monetra-v1'

const money = (n: number) => new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', maximumFractionDigits:0 }).format(Math.round(n || 0))
const digitsOnly = (value: string) => value.replace(/\D/g, '')
const formatDigits = (value: string) => { const digits = digitsOnly(value); return digits ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(digits)) : '' }
const MAX_FINANCIAL_INPUT = 1_000_000_000
const limitedDigits = (value: string) => { const digits = digitsOnly(value).replace(/^0+(?=\d)/, ''); return digits ? String(Math.min(Number(digits), MAX_FINANCIAL_INPUT)) : '' }
const shortMoney = (n: number) => n >= 1_000_000 ? `Rp${(n/1_000_000).toFixed(1).replace('.',',')}jt` : n >= 1000 ? `Rp${Math.round(n/1000)}rb` : money(n)
const dateISO = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const monthKey = (date: string) => date.slice(0,7)
const currentMonth = dateISO().slice(0,7)
const monthLabel = (key: string) => new Date(Number(key.slice(0,4)), Number(key.slice(5,7))-1, 1).toLocaleDateString('id-ID',{month:'long',year:'numeric'})
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
const sum = (items: Transaction[], type: TxType) => items.filter(t=>t.type===type).reduce((a,t)=>a+t.amount,0)
const download = (name: string, content: string, type: string) => {
  const blob = new Blob([content],{type}); const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href=url; a.download=name; a.click(); URL.revokeObjectURL(url)
}

export default function App() {
  const [store,setStore] = useState<any>(initialData)
  const [page,setPage] = useState<Page>('Dashboard')
  const [month,setMonth] = useState(currentMonth)
  const [modal,setModal] = useState(false)
  const [editing,setEditing] = useState<Transaction|null>(null)
  const [query,setQuery] = useState('')
  const [filterType,setFilterType] = useState('all')
  const [filterCategory,setFilterCategory] = useState('all')
  const [filterMonth,setFilterMonth] = useState(currentMonth)
  const [selectedDate,setSelectedDate] = useState(dateISO())
  const [mobileNav,setMobileNav] = useState(false)
  const [confirmClear,setConfirmClear] = useState(false)
  const [toast,setToast] = useState('')
  const mainRef = useRef<HTMLDivElement>(null)

  const transactions: Transaction[] = store.transactions || []
  const budgets: Budget[] = store.budgets || []
  const goals: Goal[] = store.goals || []

  // Personal mode: persist all records in this browser only. No account or cloud connection.
  useEffect(()=>{
    try {
      window.localStorage.setItem(KEY, JSON.stringify(store))
    } catch (error) {
      console.error('MONETRA local save failed', error)
      notify('Browser storage is unavailable. Export a backup before leaving this page.')
    }
  },[store])
  useGSAP(()=> {
    gsap.fromTo('.page-enter',{y:18,opacity:0},{y:0,opacity:1,duration:.65,ease:'power3.out',stagger:.07,clearProps:'all'})
    gsap.fromTo('.metric-card',{y:22,opacity:0},{y:0,opacity:1,duration:.7,ease:'power3.out',stagger:.09,delay:.08,clearProps:'all'})
    gsap.utils.toArray<HTMLElement>('.panel').forEach((panel)=>gsap.fromTo(panel,{y:14,opacity:0},{y:0,opacity:1,duration:.65,ease:'power2.out',clearProps:'all',scrollTrigger:{trigger:panel,start:'top 94%',toggleActions:'play none none none'}}))
  },{scope:mainRef,dependencies:[page]})

  const notify = (message: string) => { setToast(message); window.setTimeout(()=>setToast(''),2600) }
  const monthTx = useMemo(()=>transactions.filter(t=>monthKey(t.date)===month),[transactions,month])
  const income = sum(monthTx,'income'), expenses = sum(monthTx,'expense'), balance = income-expenses
  const savingsRate = income>0 ? Math.max(0,(balance/income)*100) : 0
  const allocated = budgets.reduce((a,b)=>a+b.limit,0)
  const budgetUsed = expenses
  const utilization = allocated>0 ? budgetUsed/allocated*100 : 0

  const addOrUpdate = (tx: Transaction) => {
    setStore((s:any)=>({...s,transactions: editing ? s.transactions.map((t:Transaction)=>t.id===tx.id?tx:t) : [tx,...s.transactions]}))
    setEditing(null); setModal(false); notify(editing?'Transaction updated':'Transaction saved')
  }
  const removeTx = (id: string) => {
    if (!window.confirm('Delete this transaction? This cannot be undone.')) return
    setStore((s:any)=>({...s,transactions:s.transactions.filter((t:Transaction)=>t.id!==id)})); notify('Transaction deleted')
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
    return {month:new Date(Number(key.slice(0,4)),Number(key.slice(5,7))-1,1).toLocaleDateString('id-ID',{month:'short'}), income:sum(list,'income'), expenses:sum(list,'expense'), savings:sum(list,'income')-sum(list,'expense')}
  }),[transactions,month])
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
    ;[['Total income',money(income)],['Total expenses',money(expenses)],['Net cash flow',money(balance)],['Savings rate',`${savingsRate.toFixed(1)}%`]].forEach((r,i)=>{doc.text(r[0],18,56+i*13);doc.text(r[1],190,56+i*13,{align:'right'})})
    doc.setFontSize(14); doc.text('Expense breakdown',18,125)
    doc.setFontSize(10); categoryData.forEach((c,i)=>doc.text(`${c.name} — ${money(c.value)}`,18,138+i*9))
    doc.save(`monetra-report-${month}.pdf`)
  }
  const loadDemo = () => {
    if (transactions.length && !window.confirm('Demo data will be added alongside your existing records. Continue?')) return
    const y=Number(month.slice(0,4)),m=Number(month.slice(5,7))-1
    const demo:Transaction[]=[
      ['Monthly salary',6500000,'income','Salary',3],['Freelance project',1250000,'income','Freelance',8],
      ['Groceries & meals',780000,'expense','Food & Beverages',4],['Ride-hailing',245000,'expense','Transportation',6],
      ['Internet & electricity',420000,'expense','Bills & Utilities',9],['Books and course',325000,'expense','Education',12],
      ['Coffee with friends',165000,'expense','Food & Beverages',15],['Household items',390000,'expense','Shopping',18],
      ['Streaming subscription',89000,'expense','Subscriptions',20],['Health check',210000,'expense','Health',22]
    ].map((x:any)=>({id:uid(),name:x[0],amount:x[1],type:x[2],category:x[3],date:`${y}-${String(m+1).padStart(2,'0')}-${String(x[4]).padStart(2,'0')}`,notes:'Demo data'}))
    setStore((s:any)=>({...s,transactions:[...demo,...s.transactions],demo:true})); notify('Demo transactions added')
  }

  const renderPage = () => {
    switch(page) {
      case 'Dashboard': return <Dashboard month={month} setMonth={setMonth} income={income} expenses={expenses} balance={balance} savingsRate={savingsRate} totalSaved={goals.reduce((a:number,g:Goal)=>a+g.saved,0)} utilization={utilization} allocated={allocated} categoryData={categoryData} monthlyData={monthlyData} transactions={monthTx} highestCategory={highestCategory} expenseChange={expenseChange} budgets={budgets} onAdd={openAdd} onNavigate={setPage} onEdit={openEdit} />
      case 'Transactions': return <TransactionsPage rows={filtered} query={query} setQuery={setQuery} filterType={filterType} setFilterType={setFilterType} filterCategory={filterCategory} setFilterCategory={setFilterCategory} filterMonth={filterMonth} setFilterMonth={setFilterMonth} onAdd={openAdd} onEdit={openEdit} onDelete={removeTx} onCSV={exportCSV} />
      case 'Monthly Budget': return <BudgetPage budgets={budgets} transactions={monthTx} onSave={saveBudget} month={month} setMonth={setMonth} />
      case 'Analytics': return <AnalyticsPage categoryData={categoryData} monthlyData={monthlyData} month={month} setMonth={setMonth} transactions={transactions} />
      case 'Financial Calendar': return <CalendarPage month={month} setMonth={setMonth} transactions={transactions} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
      case 'Savings Goals': return <GoalsPage goals={goals} onSave={saveGoal} onDelete={deleteGoal} />
      case 'Monthly Reports': return <ReportsPage month={month} setMonth={setMonth} income={income} expenses={expenses} balance={balance} savingsRate={savingsRate} categoryData={categoryData} monthlyData={monthlyData} onCSV={exportReport} onPDF={exportPDF} transactions={monthTx} />
      case 'Settings': return <SettingsPage store={store} onDemo={loadDemo} onClear={()=>setConfirmClear(true)} onImport={(data:any)=>setStore(data)} />
    }
  }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav?'sidebar-open':''}`}>
      <div className="brand"><div className="brand-mark"><span /></div><span>monetra</span><small>STUDENT FINANCE</small></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{NAV.map(({label,icon:Icon})=><button key={label} className={`nav-item ${page===label?'active':''}`} onClick={()=>{setPage(label);setMobileNav(false)}}><Icon size={17}/><span>{label}</span>{page===label&&<i/>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="help-card"><div className="help-icon"><CircleHelp size={16}/></div><strong>Need a hand?</strong><p>Your money, made clearer. Explore the guide in Settings.</p><button onClick={()=>setPage('Settings')}>Explore guide <ArrowUpRight size={13}/></button></div>
        <div className="profile"><div className="avatar">M</div><div><strong>My workspace</strong><span>Personal account</span></div><MoreHorizontal size={17}/></div>
      </div>
    </aside>
    {mobileNav&&<button className="mobile-scrim" onClick={()=>setMobileNav(false)} aria-label="Close menu"/>}
    <main className="main-area" ref={mainRef}>
      <header className="topbar">
        <button className="mobile-menu icon-button" onClick={()=>setMobileNav(!mobileNav)} aria-label="Toggle navigation"><Menu size={19}/></button>
        <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{page}</strong></div>
        <div className="top-actions"><span className="today-label">{new Date().toLocaleDateString('id-ID',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</span><button className="icon-button notification" aria-label="Notifications" onClick={()=>notify('You are all caught up')}><Bell size={17}/><i/></button><button className="profile-chip" onClick={()=>setPage('Settings')}><span className="avatar small">M</span><ChevronDown size={14}/></button></div>
      </header>
      <div className="page-content">{renderPage()}</div>
      <footer className="app-footer"><span>MONETRA <i>·</i> Know your money. Control your future.</span><span>Private on this browser <b>●</b> Saved on this device</span></footer>
    </main>
    {modal&&<TransactionModal initial={editing} onClose={()=>{setModal(false);setEditing(null)}} onSave={addOrUpdate}/>}
    {confirmClear&&<ConfirmModal title="Clear all financial data?" body="This permanently removes transactions, budgets, and goals stored in this browser. Export your data first if you need a backup." onCancel={()=>setConfirmClear(false)} onConfirm={()=>{setStore({transactions:[],budgets:[],goals:[],currency:'IDR',demo:false});setConfirmClear(false);notify('Local data cleared')}}/>}
    {toast&&<div className="toast"><Check size={15}/>{toast}</div>}
  </div>
}

function PageHeading({eyebrow,title,description,action}:{eyebrow:string,title:string,description:string,action?:ReactNode}) {
  return <div className="page-heading page-enter"><div><div className="eyebrow"><span/>{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>
}
function MonthControl({month,setMonth}:{month:string,setMonth:(v:string)=>void}) {
  return <div className="month-control"><button onClick={()=>setMonth(monthShift(month,-1))} aria-label="Previous month"><ChevronLeft size={16}/></button><span>{monthLabel(month)}</span><button onClick={()=>setMonth(monthShift(month,1))} aria-label="Next month"><ChevronRight size={16}/></button></div>
}
function Metric({label,value,sub,icon:Icon,tone='neutral',trend}:{label:string,value:string,sub:string,icon:any,tone?:string,trend?:string}) {
  const [open,setOpen]=useState(false)
  return <>
    <button type="button" className={`metric-card metric-card-button tone-${tone}`} onClick={()=>setOpen(true)} aria-label={`Open details for ${label}`}>
      <span className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon size={17}/></span></span>
      <span className="metric-value">{value}</span>
      <span className="metric-foot"><span>{sub}</span>{trend&&<span className="metric-trend">{trend}</span>}</span>
    </button>
    {open&&<div className="modal-backdrop metric-detail-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
      <section className="modal metric-detail-modal" role="dialog" aria-modal="true" aria-label={`${label} details`}>
        <div className="modal-head"><div><span className="panel-kicker">QUICK OVERVIEW</span><h2>{label}</h2></div><button type="button" className="icon-button" onClick={()=>setOpen(false)} aria-label="Close details"><X size={18}/></button></div>
        <div className={`metric-detail-icon ${tone}`}><Icon size={21}/></div>
        <strong className="metric-detail-value">{value}</strong>
        <p>{sub}{trend?` · ${trend}`:''}</p>
        <button type="button" className="primary-button metric-detail-close" onClick={()=>setOpen(false)}>Got it</button>
      </section>
    </div>}
  </>
}
function ChartTip({active,payload,label}:any) {
  if(!active||!payload?.length)return null
  return <div className="chart-tooltip"><span>{label}</span>{payload.map((p:any)=><strong key={p.dataKey}>{p.name||p.dataKey}: {money(p.value)}</strong>)}</div>
}
function Dashboard(p:any) {
  const {month,setMonth,income,expenses,balance,savingsRate,totalSaved,utilization,allocated,categoryData,monthlyData,transactions,highestCategory,expenseChange,budgets,onAdd,onNavigate,onEdit}=p
  return <div className="page-stack">
    <PageHeading eyebrow="YOUR FINANCIAL OVERVIEW" title="Good money habits start here." description="A clear view of your cash flow, spending, and what you're building toward." action={<button className="primary-button" onClick={onAdd}><Plus size={16}/> Add transaction <span className="button-arrow"><ArrowUpRight size={14}/></span></button>}/>
    <div className="overview-toolbar"><div className="live-status"><span className="live-dot"/>{transactions.length} records this month</div><MonthControl month={month} setMonth={setMonth}/></div>
    <div className="metric-grid">
      <Metric label="Total income" value={money(income)} sub="Money received this month" icon={ArrowDownRight} tone="green"/>
      <Metric label="Total expenses" value={money(expenses)} sub="Money spent this month" icon={ArrowUpRight} tone="amber" trend={expenseChange===null?'':`${expenseChange>=0?'+':''}${expenseChange.toFixed(1)}% vs last month`}/>
      <Metric label="Remaining balance" value={money(balance)} sub="Income minus expenses" icon={Wallet} tone="mint"/>
      <Metric label="Total savings" value={money(totalSaved)} sub="Saved across your goals" icon={PiggyBank} tone="blue"/><Metric label="Savings rate" value={`${savingsRate.toFixed(1)}%`} sub="Positive monthly cash flow / income" icon={TrendingUp} tone="mint"/>
    </div>
    <div className="dashboard-grid">
      <section className="panel cashflow-panel page-enter"><div className="panel-heading"><div><span className="panel-kicker">CASH FLOW</span><h2>Income vs expenses</h2></div><button className="text-link" onClick={()=>onNavigate('Analytics')}>View analytics <ArrowUpRight size={14}/></button></div>
        <div className="chart-legend"><span><i className="legend-income"/>Income</span><span><i className="legend-expense"/>Expenses</span></div>
        <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthlyData} barGap={7}><CartesianGrid stroke="#ffffff0c" vertical={false}/><XAxis dataKey="month" tick={{fill:'#777f77',fontSize:11}} axisLine={false} tickLine={false}/><YAxis tickFormatter={shortMoney} tick={{fill:'#777f77',fontSize:10}} axisLine={false} tickLine={false} width={54}/><Tooltip content={<ChartTip/>} cursor={{fill:'#ffffff08'}}/><Bar dataKey="income" name="Income" fill="#83bd8e" radius={[4,4,0,0]} maxBarSize={18}/><Bar dataKey="expenses" name="Expenses" fill="#c39c67" radius={[4,4,0,0]} maxBarSize={18}/></BarChart></ResponsiveContainer></div>
      </section>
      <section className="panel spending-panel page-enter"><div className="panel-heading"><div><span className="panel-kicker">SPENDING MIX</span><h2>Where it goes</h2></div><button className="icon-button subtle" onClick={()=>onNavigate('Analytics')} aria-label="More analytics"><ArrowUpRight size={16}/></button></div>
        {categoryData.length?<><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryData} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="91%" paddingAngle={3} stroke="none">{categoryData.map((d:any)=><Cell key={d.name} fill={d.color}/>)}</Pie><Tooltip formatter={(v:any)=>money(v)}/></PieChart></ResponsiveContainer><div className="donut-center"><strong>{shortMoney(expenses)}</strong><span>Total spent</span></div></div><div className="category-legend">{categoryData.slice(0,4).map((c:any)=><div key={c.name}><span><i style={{background:c.color}}/>{c.name}</span><strong>{Math.round(c.value/expenses*100)}%</strong></div>)}</div></>:<EmptyChart text="Add expenses to see your spending mix."/>}
      </section>
      <section className="panel budget-panel page-enter"><div className="panel-heading"><div><span className="panel-kicker">MONTHLY PLAN</span><h2>Budget pulse</h2></div><button className="text-link" onClick={()=>onNavigate('Monthly Budget')}>Manage <ArrowUpRight size={14}/></button></div>
        <div className="budget-total"><strong>{money(expenses)}</strong><span>spent {allocated?`of ${money(allocated)}`:'· no budget set'}</span></div>
        <div className="progress-track large"><span style={{width:`${Math.min(utilization,100)}%`}}/></div>
        <div className="budget-caption"><span>{allocated?`${utilization.toFixed(0)}% of total budget used`:'Set category limits to track your budget'}</span><strong>{allocated?money(Math.max(0,allocated-expenses)):'—'}</strong></div>
        <div className="budget-mini-list">{budgets.slice(0,3).map((b: Budget)=>{const spent=transactions.filter((t:Transaction)=>t.type==='expense'&&t.category===b.category).reduce((a:number,t:Transaction)=>a+t.amount,0);const pct=b.limit?spent/b.limit*100:0;return <div className="budget-mini" key={b.category}><div><span>{b.category}</span><strong>{money(spent)} <em>/ {money(b.limit)}</em></strong></div><div className="progress-track"><span className={pct>=100?'over':pct>=70?'warn':''} style={{width:`${Math.min(pct,100)}%`}}/></div></div>})}{!budgets.length&&<p className="muted-note">Your budget starts with one simple limit. Add one in Monthly Budget.</p>}</div>
      </section>
      <section className="panel insight-panel page-enter"><div className="insight-head"><div className="insight-symbol"><Sparkles size={17}/></div><span className="panel-kicker">A LITTLE CLARITY</span></div><h2>Your money, in perspective.</h2>
        {transactions.length? <div className="insight-copy">{highestCategory?<p><strong>{highestCategory.name}</strong> is your biggest expense this month at <strong>{money(highestCategory.value)}</strong>.</p>:<p>No expense category has been recorded yet. Add an expense to begin.</p>}{expenseChange!==null&&<p>Spending is <strong>{Math.abs(expenseChange).toFixed(1)}% {expenseChange>=0?'higher':'lower'}</strong> than last month.</p>}<p>Your current cash-flow savings rate is <strong>{savingsRate.toFixed(1)}%</strong>.</p></div>:<p className="muted-note">Insights appear when you have enough real transaction history. Start by recording income and expenses.</p>}
        <button className="text-link" onClick={()=>onNavigate('Analytics')}>Explore insights <ArrowUpRight size={14}/></button>
      </section>
    </div>
    <section className="panel recent-panel page-enter"><div className="panel-heading"><div><span className="panel-kicker">LATEST ACTIVITY</span><h2>Recent transactions</h2></div><button className="text-link" onClick={()=>onNavigate('Transactions')}>All transactions <ArrowUpRight size={14}/></button></div><TransactionRows rows={transactions.slice().sort((a:Transaction,b:Transaction)=>b.date.localeCompare(a.date)).slice(0,5)} onEdit={onEdit}/></section>
  </div>
}
function EmptyChart({text}:{text:string}) { return <div className="empty-chart"><div className="empty-orbit"><ChartNoAxesCombined size={20}/></div><p>{text}</p></div> }
function TransactionRows({rows,onEdit,onDelete}:{rows:Transaction[],onEdit?:(t:Transaction)=>void,onDelete?:(id:string)=>void}) {
  if(!rows.length)return <div className="empty-state"><div className="empty-orbit"><ArrowLeftRight size={20}/></div><strong>No transactions yet</strong><p>Your activity will show up here once you add a record.</p></div>
  return <div className="transaction-list">{rows.map(t=><div className="transaction-row" key={t.id}><div className={`tx-symbol ${t.type}`}><span>{t.type==='income'?<ArrowDownRight size={16}/>:<ArrowUpRight size={16}/>}</span></div><div className="tx-main"><strong>{t.name}</strong><span>{t.category} <i>·</i> {new Date(`${t.date}T12:00:00`).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}</span></div><strong className={`tx-amount ${t.type}`}>{t.type==='income'?'+':'−'}{money(t.amount)}</strong>{onEdit&&<button className="row-action" onClick={()=>onEdit(t)} aria-label={`Edit ${t.name}`}><Pencil size={14}/></button>}{onDelete&&<button className="row-action danger" onClick={()=>onDelete(t.id)} aria-label={`Delete ${t.name}`}><Trash2 size={14}/></button>}</div>)}</div>
}
function TransactionsPage(p:any) {
  const {rows,query,setQuery,filterType,setFilterType,filterCategory,setFilterCategory,filterMonth,setFilterMonth,onAdd,onEdit,onDelete,onCSV}=p
  const [openFilters,setOpenFilters]=useState(false)
  return <div className="page-stack"><PageHeading eyebrow="YOUR MONEY MOVEMENT" title="Transactions" description="Every inflow and outflow, in one considered place." action={<button className="primary-button" onClick={onAdd}><Plus size={16}/> Add transaction <span className="button-arrow"><ArrowUpRight size={14}/></span></button>}/>
    <section className="panel table-panel page-enter"><div className="table-toolbar"><div className="search-field"><Search size={16}/><input placeholder="Search transactions..." value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button onClick={()=>setQuery('')}><X size={14}/></button>}</div><div className="table-actions"><button className={`secondary-button ${openFilters?'selected':''}`} onClick={()=>setOpenFilters(!openFilters)}><SlidersHorizontal size={15}/> Filters</button><button className="secondary-button" onClick={onCSV}><Download size={15}/> Export CSV</button></div></div>
      {openFilters&&<div className="filter-bar"><select value={filterType} onChange={e=>setFilterType(e.target.value)}><option value="all">All types</option><option value="income">Income</option><option value="expense">Expenses</option></select><select value={filterCategory} onChange={e=>setFilterCategory(e.target.value)}><option value="all">All categories</option>{[...INCOME_CATEGORIES,...EXPENSE_CATEGORIES].map(c=><option key={c}>{c}</option>)}</select><input type="month" value={filterMonth==='all'?'':filterMonth} onChange={e=>setFilterMonth(e.target.value||'all')}/><button className="text-link" onClick={()=>{setFilterType('all');setFilterCategory('all');setFilterMonth('all');setQuery('')}}>Reset filters</button></div>}
      <div className="table-summary"><span>{rows.length} transactions found</span><span>Sorted by most recent</span></div><div className="table-scroll"><table><thead><tr><th>TRANSACTION</th><th>CATEGORY</th><th>DATE</th><th>TYPE</th><th className="align-right">AMOUNT</th><th/></tr></thead><tbody>{rows.map((t:Transaction)=><tr key={t.id}><td><div className="table-name"><div className={`tx-symbol ${t.type}`}>{t.type==='income'?<ArrowDownRight size={15}/>:<ArrowUpRight size={15}/>}</div><div><strong>{t.name}</strong><small>{t.notes||'—'}</small></div></div></td><td>{t.category}</td><td>{new Date(`${t.date}T12:00:00`).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'})}</td><td><span className={`type-tag ${t.type}`}>{t.type==='income'?'Income':'Expense'}</span></td><td className={`align-right table-amount ${t.type}`}>{t.type==='income'?'+':'−'}{money(t.amount)}</td><td><div className="table-row-actions"><button onClick={()=>onEdit(t)} aria-label="Edit transaction"><Pencil size={14}/></button><button onClick={()=>onDelete(t.id)} aria-label="Delete transaction"><Trash2 size={14}/></button></div></td></tr>)}</tbody></table>{!rows.length&&<EmptyChart text="No transactions match these filters. Try adjusting your search or add a record."/ >}</div>
    </section></div>
}
function BudgetPage({budgets,transactions,onSave,month,setMonth}:any) {
  const [draft,setDraft]=useState<Record<string,string>>({})
  const expenseBy=(category:string)=>transactions.filter((t:Transaction)=>t.type==='expense'&&t.category===category).reduce((a:number,t:Transaction)=>a+t.amount,0)
  const categories=EXPENSE_CATEGORIES
  const total=budgets.reduce((a: number,b:Budget)=>a+b.limit,0), spent=transactions.filter((t:Transaction)=>t.type==='expense').reduce((a:number,t:Transaction)=>a+t.amount,0)
  const status=(pct:number)=>pct>=100?['Budget exceeded','over']:pct>=90?['Near budget limit','danger']:pct>=70?['Approaching spending limit','warn']:['Budget under control','good']
  const updateLimit=(category:string,raw:string)=>{
    const next=limitedDigits(raw)
    setDraft(s=>({...s,[category]:next}))
    onSave(category,next===''?0:Number(next))
  }
  return <div className="page-stack"><PageHeading eyebrow="PLAN WITH INTENTION" title="Monthly budget" description="Give every category a thoughtful limit, then keep an eye on the pace." action={<MonthControl month={month} setMonth={setMonth}/>}/>
    <div className="budget-overview page-enter"><div><span className="panel-kicker">TOTAL ALLOCATION</span><strong>{money(total)}</strong><small>Across {budgets.length} budget categories</small></div><div><span className="panel-kicker">SPENT SO FAR</span><strong>{money(spent)}</strong><small>{total?`${(spent/total*100).toFixed(1)}% of allocated budget`: 'No budget limits yet'}</small></div><div><span className="panel-kicker">REMAINING</span><strong>{money(total-spent)}</strong><small>{total?'Allocation minus recorded expenses':'Set limits to calculate'}</small></div></div>
    <div className="budget-list">{categories.map((c,i)=>{const limit=budgets.find((b:Budget)=>b.category===c)?.limit||0,actual=expenseBy(c),pct=limit?actual/limit*100:0,[label,cls]=status(pct);return <section className="panel budget-category page-enter" key={c}><div className="budget-category-head"><div className="category-number">{String(i+1).padStart(2,'0')}</div><div className="budget-category-name"><strong>{c}</strong><span>{limit?label:'No limit set'}</span></div><div className="budget-category-values"><strong>{money(actual)}</strong><span>{limit?`of ${money(limit)}`:'spent'}</span></div></div><div className="progress-track budget-progress"><span className={cls} style={{width:`${limit?Math.min(pct,100):0}%`}}/></div><div className="budget-category-bottom"><span>{limit?`${pct.toFixed(0)}% utilized · ${money(Math.max(0,limit-actual))} remaining`: 'Set a monthly spending limit'}</span><div className="budget-edit"><label htmlFor={`budget-${i}`}>Monthly limit</label><div className="inline-money"><span>Rp</span><input id={`budget-${i}`} type="text" inputMode="numeric" maxLength={13} placeholder="0" value={formatDigits(draft[c]??(limit?String(limit):''))} onChange={e=>updateLimit(c,e.target.value)} aria-label={`${c} monthly spending limit, auto-saved up to one billion rupiah`}/><span className="autosave-indicator">Auto-saved</span></div></div></div></section>})}</div>
  </div>
}
function AnalyticsPage({categoryData,monthlyData,month,setMonth,transactions}:any) {
  const total=categoryData.reduce((a:any,c:any)=>a+c.value,0)
  const trend=monthlyData.filter((m:any)=>m.expenses>0)
  return <div className="page-stack"><PageHeading eyebrow="PATTERNS, NOT GUESSES" title="Financial analytics" description="Understand the rhythm of your money through your recorded activity." action={<MonthControl month={month} setMonth={setMonth}/>}/>
    <div className="analytics-grid"><section className="panel analytics-wide page-enter"><div className="panel-heading"><div><span className="panel-kicker">SIX-MONTH VIEW</span><h2>Income & expenses</h2></div><span className="chart-note">IDR · monthly</span></div><div className="chart-wrap tall"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthlyData}><CartesianGrid stroke="#ffffff0c" vertical={false}/><XAxis dataKey="month" tick={{fill:'#7c847b',fontSize:11}} axisLine={false} tickLine={false}/><YAxis tickFormatter={shortMoney} tick={{fill:'#7c847b',fontSize:10}} axisLine={false} tickLine={false} width={55}/><Tooltip content={<ChartTip/>}/><Legend/><Bar dataKey="income" name="Income" fill="#83bd8e" radius={[4,4,0,0]}/><Bar dataKey="expenses" name="Expenses" fill="#c39c67" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div></section>
      <section className="panel analytics-donut page-enter"><div className="panel-heading"><div><span className="panel-kicker">CURRENT MONTH</span><h2>Expense breakdown</h2></div></div>{categoryData.length?<><div className="donut-wrap large-donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryData} dataKey="value" innerRadius="65%" outerRadius="90%" paddingAngle={3} stroke="none">{categoryData.map((c:any)=><Cell key={c.name} fill={c.color}/>)}</Pie><Tooltip formatter={(v:any)=>money(v)}/></PieChart></ResponsiveContainer><div className="donut-center"><strong>{shortMoney(total)}</strong><span>Total expense</span></div></div><div className="analytics-category-list">{categoryData.map((c:any)=><div key={c.name}><span><i style={{background:c.color}}/>{c.name}</span><strong>{money(c.value)}</strong><em>{total?`${(c.value/total*100).toFixed(1)}%`:''}</em></div>)}</div></>:<EmptyChart text="No expense records for this month."/>}</section>
      <section className="panel analytics-wide page-enter"><div className="panel-heading"><div><span className="panel-kicker">SPENDING TREND</span><h2>How expenses move over time</h2></div></div>{trend.length?<div className="chart-wrap tall"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthlyData}><defs><linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#83bd8e" stopOpacity={.28}/><stop offset="100%" stopColor="#83bd8e" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#ffffff0c" vertical={false}/><XAxis dataKey="month" tick={{fill:'#7c847b',fontSize:11}} axisLine={false} tickLine={false}/><YAxis tickFormatter={shortMoney} tick={{fill:'#7c847b',fontSize:10}} axisLine={false} tickLine={false} width={55}/><Tooltip content={<ChartTip/>}/><Area type="monotone" dataKey="expenses" name="Expenses" stroke="#83bd8e" strokeWidth={2.5} fill="url(#expenseFill)" activeDot={{r:5}}/></AreaChart></ResponsiveContainer></div>:<EmptyChart text="Record expenses across months to reveal a spending trend."/>}</section>
      <section className="panel analytics-ranking page-enter"><div className="panel-heading"><div><span className="panel-kicker">CATEGORY COMPARISON</span><h2>Highest spending</h2></div></div>{categoryData.length?categoryData.map((c:any,i:number)=><div className="rank-row" key={c.name}><span className="rank-number">{String(i+1).padStart(2,'0')}</span><div className="rank-info"><div><strong>{c.name}</strong><span>{money(c.value)}</span></div><div className="progress-track"><span style={{width:`${c.value/categoryData[0].value*100}%`,background:c.color}}/></div></div></div>):<EmptyChart text="Your category ranking will appear when you add expenses."/>}</section>
      <section className="panel analytics-wide page-enter"><div className="panel-heading"><div><span className="panel-kicker">SAVINGS PROGRESS</span><h2>Monthly net cash flow</h2></div></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthlyData}><CartesianGrid stroke="#ffffff0c" vertical={false}/><XAxis dataKey="month" tick={{fill:'#7c847b',fontSize:11}} axisLine={false} tickLine={false}/><YAxis tickFormatter={shortMoney} tick={{fill:'#7c847b',fontSize:10}} axisLine={false} tickLine={false} width={55}/><Tooltip content={<ChartTip/>}/><Area type="monotone" dataKey="savings" name="Net cash flow" stroke="#c4a46a" fill="#c4a46a22" strokeWidth={2}/></AreaChart></ResponsiveContainer></div><p className="chart-footnote">Net cash flow is calculated as recorded income minus recorded expenses. It is not a separate savings-account balance.</p></section>
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
  return <div className="page-stack"><PageHeading eyebrow="YOUR MONTH AT A GLANCE" title="Financial calendar" description="See the days your money moved, and open any date for the detail." action={<MonthControl month={month} setMonth={setMonth}/>}/>
    <div className="calendar-layout"><section className="panel calendar-panel page-enter"><div className="calendar-head"><div><span className="panel-kicker">MONTHLY ACTIVITY</span><h2>{monthLabel(month)}</h2></div><div className="calendar-legend"><span><i className="legend-income"/>Income</span><span><i className="legend-expense"/>Expense</span></div></div><div className="calendar-grid">{['MON','TUE','WED','THU','FRI','SAT','SUN'].map(d=><div className="calendar-weekday" key={d}>{d}</div>)}{cells.map((day,i)=>{if(!day)return <div key={`blank-${i}`}/>;const totals=dayTotals(day),iso=`${month}-${String(day).padStart(2,'0')}`;return <button key={day} className={`calendar-day ${selectedDate===iso?'selected':''} ${iso===dateISO()?'today':''}`} onClick={()=>setSelectedDate(iso)}><span>{day}</span>{totals.count>0&&<div className="day-dots">{totals.income>0&&<i className="income-dot"/>}{totals.expense>0&&<i className="expense-dot"/>}</div>}{totals.expense>0&&<small>{shortMoney(totals.expense)}</small>}</button>})}</div></section>
      <section className="panel daily-panel page-enter"><div className="panel-heading"><div><span className="panel-kicker">DAY DETAIL</span><h2>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long'})}</h2></div><CalendarDays size={18} className="muted-icon"/></div><div className="daily-totals"><div><span>Income</span><strong className="positive">{money(dailyIncome)}</strong></div><div><span>Expenses</span><strong className="negative">{money(dailyExpense)}</strong></div></div><div className="daily-net"><span>Net movement</span><strong className={dailyIncome-dailyExpense>=0?'positive':'negative'}>{money(dailyIncome-dailyExpense)}</strong></div><TransactionRows rows={daily}/></section></div>
  </div>
}
function GoalsPage({goals,onSave,onDelete}:any) {
  const [form,setForm]=useState(false),[edit,setEdit]=useState<Goal|null>(null),[name,setName]=useState(''),[target,setTarget]=useState(''),[saved,setSaved]=useState(''),[date,setDate]=useState('')
  const goalId=useRef<string>(uid())
  const onSaveRef=useRef(onSave)
  onSaveRef.current=onSave
  const [autoSaved,setAutoSaved]=useState(false)
  const begin=(g?:Goal)=>{setEdit(g||null);goalId.current=g?.id||uid();setName(g?.name||'');setTarget(g?String(g.target):'');setSaved(g?String(g.saved):'');setDate(g?.date||'');setAutoSaved(false);setForm(true)}
  useEffect(()=>{
    if(!form||!name.trim()||Number(target)<=0)return
    const targetValue=Math.min(Number(limitedDigits(target)),MAX_FINANCIAL_INPUT)
    const savedValue=Math.min(Number(limitedDigits(saved)||0),MAX_FINANCIAL_INPUT)
    if(!targetValue)return
    const timer=window.setTimeout(()=>{
      onSaveRef.current({id:goalId.current,name:name.trim(),target:targetValue,saved:savedValue,date})
      setAutoSaved(true)
    },500)
    return ()=>window.clearTimeout(timer)
  },[form,name,target,saved,date])
  const persistCurrent=()=>{
    if(!name.trim()||Number(target)<=0)return
    const targetValue=Math.min(Number(limitedDigits(target)),MAX_FINANCIAL_INPUT)
    const savedValue=Math.min(Number(limitedDigits(saved)||0),MAX_FINANCIAL_INPUT)
    if(targetValue)onSaveRef.current({id:goalId.current,name:name.trim(),target:targetValue,saved:savedValue,date})
  }
  const close=()=>{persistCurrent();setForm(false);setEdit(null)}
  return <div className="page-stack"><PageHeading eyebrow="A FUTURE WITH DIRECTION" title="Savings goals" description="Make room for the things that matter. Track your progress one contribution at a time." action={<button className="primary-button" onClick={()=>begin()}><Plus size={16}/> Create a goal <span className="button-arrow"><ArrowUpRight size={14}/></span></button>}/>
    {goals.length?<div className="goal-grid">{goals.map((g:Goal)=>{const pct=Math.min(g.target?g.saved/g.target*100:0,100);return <section className="panel goal-card page-enter" key={g.id}><div className="goal-card-top"><div className="goal-icon"><Target size={18}/></div><button className="icon-button subtle" onClick={()=>begin(g)} aria-label="Edit goal"><Pencil size={15}/></button></div><span className="panel-kicker">SAVINGS GOAL</span><h2>{g.name}</h2><div className="goal-amount"><strong>{money(g.saved)}</strong><span>of {money(g.target)}</span></div><div className="progress-track large"><span style={{width:`${pct}%`}}/></div><div className="goal-progress-meta"><strong>{pct.toFixed(1)}% complete</strong><span>{g.date?`Target ${new Date(`${g.date}T12:00:00`).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}`:'No target date'}</span></div><div className="goal-card-foot"><span>{money(Math.max(0,g.target-g.saved))} to go</span><button onClick={()=>onDelete(g.id)} aria-label="Delete goal"><Trash2 size={14}/></button></div></section>})}</div>:<div className="panel goal-empty page-enter"><div className="goal-empty-art"><div/><Target size={28}/></div><h2>Give your savings a destination.</h2><p>Whether it's a safety net or something you've been looking forward to, every goal starts with a number.</p><button className="primary-button" onClick={()=>begin()}><Plus size={16}/> Create your first goal</button></div>}
    {form&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><form className="modal goal-modal" onSubmit={e=>{e.preventDefault();close()}}><div className="modal-head"><div><span className="panel-kicker">YOUR NEXT MILESTONE</span><h2>{edit?'Edit savings goal':'Create a savings goal'}</h2></div><button type="button" className="icon-button" onClick={close}><X size={18}/></button></div><label>Goal name<input required value={name} onChange={e=>{setName(e.target.value);setAutoSaved(false)}} placeholder="e.g. Emergency fund"/></label><div className="form-row"><label>Target amount (IDR)<input required type="text" inputMode="numeric" maxLength={13} value={formatDigits(target)} onChange={e=>{setTarget(limitedDigits(e.target.value));setAutoSaved(false)}} placeholder="10.000.000"/></label><label>Already saved<input type="text" inputMode="numeric" maxLength={13} value={formatDigits(saved)} onChange={e=>{setSaved(limitedDigits(e.target.value));setAutoSaved(false)}} placeholder="0"/></label></div><label>Target date<input type="date" value={date} onChange={e=>{setDate(e.target.value);setAutoSaved(false)}}/></label><div className="modal-actions"><span className="autosave-status">{autoSaved?'✓ Automatically saved':'Changes save automatically'}</span><button type="submit" className="primary-button">Done <Check size={15}/></button></div></form></div>}
  </div>
}
function ReportsPage(p:any) {
  const {month,setMonth,income,expenses,balance,savingsRate,categoryData,monthlyData,onCSV,onPDF,transactions}=p
  const prev=monthlyData.length>1?monthlyData[monthlyData.length-2]:null
  return <div className="page-stack"><PageHeading eyebrow="A CLEARER MONTH-END" title="Monthly report" description="A concise record of your financial activity, built from the transactions you've entered." action={<MonthControl month={month} setMonth={setMonth}/>}/>
    <section className="report-cover page-enter"><div className="report-cover-top"><div className="brand compact"><div className="brand-mark"><span/></div><span>monetra</span></div><span>MONTHLY FINANCIAL STATEMENT</span></div><h2>{monthLabel(month)}</h2><p>Your money, accounted for.</p><div className="report-cover-bottom"><span>{transactions.length} recorded transactions</span><span>Generated {new Date().toLocaleDateString('id-ID')}</span></div></section>
    <div className="report-metrics"><Metric label="Total income" value={money(income)} sub="Recorded inflows" icon={ArrowDownRight} tone="green"/><Metric label="Total expenses" value={money(expenses)} sub="Recorded outflows" icon={ArrowUpRight} tone="amber"/><Metric label="Net cash flow" value={money(balance)} sub="Income − expenses" icon={Wallet} tone="mint"/><Metric label="Savings rate" value={`${savingsRate.toFixed(1)}%`} sub="Net cash flow / income" icon={PiggyBank} tone="blue"/></div>
    <div className="report-grid"><section className="panel page-enter"><div className="panel-heading"><div><span className="panel-kicker">SPENDING DISTRIBUTION</span><h2>Expense by category</h2></div></div>{categoryData.length?categoryData.map((c:any)=><div className="report-category" key={c.name}><div><span>{c.name}</span><strong>{money(c.value)}</strong></div><div className="progress-track"><span style={{width:`${c.value/expenses*100}%`,background:c.color}}/></div></div>):<EmptyChart text="No expense distribution available yet."/>}</section><section className="panel page-enter"><div className="panel-heading"><div><span className="panel-kicker">MONTH-OVER-MONTH</span><h2>Comparison</h2></div></div>{prev&&prev.expenses>0?<><div className="comparison-line"><span>Expense change vs previous month</span><strong className={expenses<=prev.expenses?'positive':'negative'}>{((expenses-prev.expenses)/prev.expenses*100)>=0?'+':''}{((expenses-prev.expenses)/prev.expenses*100).toFixed(1)}%</strong></div><div className="comparison-line"><span>Previous month expenses</span><strong>{money(prev.expenses)}</strong></div><div className="comparison-line"><span>Current month expenses</span><strong>{money(expenses)}</strong></div></>:<div className="empty-chart"><p>Previous-month expense comparison needs recorded transactions in both periods.</p></div>}</section></div>
    <div className="report-export page-enter"><div><span className="panel-kicker">TAKE YOUR DATA WITH YOU</span><h2>Export your monthly report</h2><p>Download a copy for your own records. Your data stays on this device.</p></div><div className="export-actions"><button className="secondary-button" onClick={onCSV}><Download size={15}/> Export CSV</button><button className="primary-button" onClick={onPDF}><FileText size={15}/> Download PDF <span className="button-arrow"><ArrowUpRight size={14}/></span></button></div></div>
  </div>
}
function SettingsPage({store,onDemo,onClear,onImport}:any) {
  const fileRef=useRef<HTMLInputElement>(null)
  const handleFile=(e:ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const parsed=JSON.parse(String(reader.result));if(!parsed||!Array.isArray(parsed.transactions)||!Array.isArray(parsed.budgets)||!Array.isArray(parsed.goals))throw new Error('Invalid format');if(window.confirm('Importing this backup will replace the data currently stored in MONETRA. Continue?'))onImport(parsed)}catch{window.alert('This file is not a valid MONETRA backup.')} };reader.readAsText(file);e.target.value=''}
  const backup=()=>download('monetra-backup.json',JSON.stringify(store,null,2),'application/json')
  return <div className="page-stack"><PageHeading eyebrow="YOUR SPACE, YOUR RULES" title="Settings" description="Manage your personal data and backups on this device."/>
    <section className="panel settings-panel page-enter"><div className="settings-section"><div className="settings-icon"><CircleDollarSign size={18}/></div><div className="settings-copy"><h2>Currency & region</h2><p>MONETRA currently formats all financial values in Indonesian Rupiah (IDR).</p><span className="settings-value">IDR <i>·</i> Indonesian Rupiah <i>·</i> Indonesia</span></div></div><div className="settings-section"><div className="settings-icon"><Download size={18}/></div><div className="settings-copy"><h2>Back up your data</h2><p>Export a portable JSON backup of transactions, budgets, and savings goals.</p><button className="secondary-button" onClick={backup}><Download size={15}/> Download backup</button></div></div><div className="settings-section"><div className="settings-icon"><Upload size={18}/></div><div className="settings-copy"><h2>Restore a backup</h2><p>Import a previous MONETRA backup. Existing local data is replaced only after confirmation.</p><input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={handleFile}/><button className="secondary-button" onClick={()=>fileRef.current?.click()}><Upload size={15}/> Import backup</button></div></div><div className="settings-section"><div className="settings-icon"><Sparkles size={18}/></div><div className="settings-copy"><h2>Explore with demo data</h2><p>Add clearly labeled sample transactions to see how the dashboard and analytics work. Existing records are preserved.</p><button className="secondary-button" onClick={onDemo}><Plus size={15}/> Add demo transactions</button></div></div><div className="settings-section destructive"><div className="settings-icon"><Trash2 size={18}/></div><div className="settings-copy"><h2>Clear local data</h2><p>Remove all transactions, budgets, and goals saved in this browser. This action cannot be undone.</p><button className="danger-button" onClick={onClear}><Trash2 size={15}/> Clear all data</button></div></div></section>
    <div className="privacy-note page-enter"><div><Check size={17}/></div><p><strong>Your finances stay yours.</strong> MONETRA stores records in this browser only. Data is not sent to a cloud database. Export a JSON backup regularly, especially before clearing browser data or changing devices.</p></div>
  </div>
}
function TransactionModal({initial,onClose,onSave}:{initial:Transaction|null,onClose:()=>void,onSave:(t:Transaction)=>void}) {
  const [name,setName]=useState(initial?.name||''),[amount,setAmount]=useState(initial?String(initial.amount):''),[type,setType]=useState<TxType>(initial?.type||'expense'),[category,setCategory]=useState(initial?.category||'Food & Beverages'),[date,setDate]=useState(initial?.date||dateISO()),[notes,setNotes]=useState(initial?.notes||''),[error,setError]=useState('')
  useEffect(()=>{setCategory(type==='income'?'Salary':'Food & Beverages')},[type])
  const submit=(e:FormEvent)=>{e.preventDefault();if(!name.trim()){setError('Please enter a transaction name.');return}if(!Number.isFinite(Number(amount))||Number(amount)<=0){setError('Amount must be greater than zero.');return}if(!date){setError('Please choose a transaction date.');return}onSave({id:initial?.id||uid(),name:name.trim(),amount:Number(amount),type,category,date,notes:notes.trim()})}
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><form className="modal" onSubmit={submit}><div className="modal-head"><div><span className="panel-kicker">{initial?'UPDATE YOUR RECORD':'RECORD A MONEY MOVEMENT'}</span><h2>{initial?'Edit transaction':'New transaction'}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X size={18}/></button></div><div className="type-switch"><button type="button" className={type==='expense'?'selected expense':''} onClick={()=>setType('expense')}><ArrowUpRight size={15}/> Expense</button><button type="button" className={type==='income'?'selected income':''} onClick={()=>setType('income')}><ArrowDownRight size={15}/> Income</button></div><label>Transaction name<input autoFocus required value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Monthly salary"/></label><label>Amount (IDR)<div className="amount-input"><span>Rp</span><input required type="number" min="1" step="1" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0"/></div></label><div className="form-row"><label>Category<select value={category} onChange={e=>setCategory(e.target.value)}>{(type==='income'?INCOME_CATEGORIES:EXPENSE_CATEGORIES).map(c=><option key={c}>{c}</option>)}</select></label><label>Date<input required type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div><label>Notes <span className="optional">(optional)</span><textarea rows={2} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Add a little context..."/></label>{error&&<p className="form-error"><AlertTriangle size={14}/>{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit">{initial?'Save changes':'Save transaction'} <ArrowUpRight size={15}/></button></div></form></div>
}
function ConfirmModal({title,body,onCancel,onConfirm}:any) { return <div className="modal-backdrop"><div className="modal confirm-modal"><div className="confirm-icon"><AlertTriangle size={20}/></div><h2>{title}</h2><p>{body}</p><div className="modal-actions"><button className="secondary-button" onClick={onCancel}>Keep my data</button><button className="danger-button" onClick={onConfirm}>Clear everything</button></div></div></div> }
