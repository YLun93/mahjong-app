import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc 
} from 'firebase/firestore';
import { 
  getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';
import { 
  Calendar as CalendarIcon, TrendingUp, TrendingDown, 
  ChevronLeft, ChevronRight, Trash2, X, Award, Coins
} from 'lucide-react';

// --- Firebase 配置 ---
const firebaseConfig = {
  apiKey: "AIzaSyAUPqdwv4iJ6ebrkdKZNcZpwWBXUg2mQsk",
  authDomain: "mahjong-app-8aacb.firebaseapp.com",
  projectId: "mahjong-app-8aacb",
  storageBucket: "mahjong-app-8aacb.firebasestorage.app",
  messagingSenderId: "344119682978",
  appId: "1:344119682978:web:b571898505e28f8dc2b4fb",
  measurementId: "G-410BN7WGZY"
};

const App = () => {
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 0, 1));
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    stakes: '50/20',
    customStakes: '',
    tableFee: '',
    type: 'win',
    amount: ''
  });

  const stakeOptions = ['30/10', '50/20', '100/20', '100/30', '其他'];

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'records');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecords(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsubscribe();
  }, [user]);

  const stats = useMemo(() => {
    const calculate = (list) => list.reduce((acc, rec) => {
      const amt = Number(rec.amount) || 0;
      const fee = Number(rec.tableFee) || 0;
      if (rec.type === 'win') acc.won += amt;
      else acc.lost += amt;
      acc.fees += fee;
      return acc;
    }, { won: 0, lost: 0, fees: 0 });

    const yearly = calculate(records.filter(r => r.date.startsWith('2026')));
    const targetMonthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
    const monthly = calculate(records.filter(r => r.date.startsWith(targetMonthStr)));

    return { yearly, monthly };
  }, [records, currentMonth]);

  const monthlyNet = stats.monthly.won - stats.monthly.lost - stats.monthly.fees;
  const yearlyNet = stats.yearly.won - stats.yearly.lost - stats.yearly.fees;

  const handleAddRecord = async () => {
    if (!user || !formData.amount) return;
    const id = Date.now().toString();
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'records', id), {
        ...formData,
        amount: Number(formData.amount),
        tableFee: Number(formData.tableFee || 0),
        finalStakes: formData.stakes === '其他' ? formData.customStakes : formData.stakes,
        createdAt: new Date().toISOString()
      });
      setIsModalOpen(false);
      setFormData({ ...formData, amount: '', tableFee: '', customStakes: '' });
    } catch (err) { console.error(err); }
  };

  const deleteRecord = async (id) => {
    if (!user) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'records', id)); } catch (err) {}
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const days = [];
    const totalDays = new Date(year, month + 1, 0).getDate();
    const startDay = new Date(year, month, 1).getDay();
    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`e-${i}`} className="h-16 bg-slate-50/20 border-b border-r border-slate-100/50"></div>);
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayRecords = records.filter(r => r.date === dateStr);
      const dayProfit = dayRecords.reduce((s, r) => s + (r.type === 'win' ? r.amount : -r.amount) - r.tableFee, 0);
      const isToday = dateStr === todayStr;
      const dayOfWeek = new Date(year, month, d).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      days.push(
        <div 
          key={d} 
          onClick={() => { setFormData({ ...formData, date: dateStr }); setIsModalOpen(true); }}
          className={`h-16 border-b border-r border-slate-100/50 flex flex-col items-center justify-start py-2 cursor-pointer transition-all active:scale-90 relative ${isWeekend ? 'bg-slate-50/30' : 'bg-white'} hover:bg-emerald-50/50`}
        >
          <span className={`text-[11px] font-bold mb-1 transition-colors ${isToday ? 'bg-emerald-600 text-white w-5 h-5 rounded-lg flex items-center justify-center shadow-md shadow-emerald-200 ring-2 ring-emerald-50' : isWeekend ? 'text-slate-500' : 'text-slate-400'}`}>
            {d}
          </span>
          {dayProfit !== 0 && (
            <div className={`text-[10px] font-black px-1 rounded-md leading-tight ${dayProfit > 0 ? 'text-emerald-600 bg-emerald-50/50' : 'text-rose-500 bg-rose-50/50'}`}>
              {dayProfit > 0 ? `+${dayProfit}` : dayProfit}
            </div>
          )}
          {dayRecords.length > 1 && (
            <div className="absolute bottom-1.5 flex gap-0.5">
               <div className="w-1 h-1 bg-amber-400 rounded-full"></div>
               <div className="w-1 h-1 bg-amber-400 rounded-full"></div>
            </div>
          )}
        </div>
      );
    }
    return days;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans max-w-md mx-auto flex flex-col border-x border-slate-200">
      {/* 標題列 - 優化圓角 */}
      <header className="bg-white/90 backdrop-blur-md px-6 py-5 flex justify-start items-center border-b border-slate-100 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-100">
            <Award size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">2026 麻將戰報</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">PRO PERFORMANCE</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-5 pb-10">
        
        {/* 收益摘要卡片 - 圓角改為 2xl */}
        <div className="bg-white rounded-2xl p-6 shadow-xl shadow-slate-200/40 border border-slate-100 space-y-6 relative overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">{currentMonth.getMonth() + 1}月結算收益</p>
              <h2 className={`text-4xl font-black tracking-tighter leading-none ${monthlyNet >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                ${monthlyNet.toLocaleString()}
              </h2>
            </div>
            <div className="bg-slate-900 px-4 py-2 rounded-xl shadow-md">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-0.5">2026 總計</p>
              <p className={`text-sm font-black ${yearlyNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ${yearlyNet.toLocaleString()}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3 relative z-10">
            {[
              { label: '當月贏', val: `+${stats.monthly.won}`, color: 'text-emerald-600', bg: 'bg-emerald-50/40' },
              { label: '當月輸', val: `-${stats.monthly.lost}`, color: 'text-rose-500', bg: 'bg-rose-50/40' },
              { label: '台費', val: `${stats.monthly.fees}`, color: 'text-amber-500', bg: 'bg-amber-50/40' }
            ].map((item, idx) => (
              <div key={idx} className={`${item.bg} p-3 rounded-xl text-center border border-white/50 shadow-sm`}>
                <p className="text-[9px] font-bold text-slate-400 mb-1">{item.label}</p>
                <p className={`text-[13px] font-black ${item.color}`}>{item.val}</p>
              </div>
            ))}
          </div>
          <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-emerald-50 rounded-full blur-3xl opacity-40"></div>
        </div>

        {/* 月曆 - 圓角改為 2xl */}
        <section className="bg-white rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
          <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-50">
            <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
              <CalendarIcon size={16} className="text-emerald-600" />
              {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
            </h3>
            <div className="flex bg-slate-50 p-1 rounded-lg">
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-400 hover:text-emerald-600"><ChevronLeft size={18}/></button>
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-400 hover:text-emerald-600"><ChevronRight size={18}/></button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 text-center text-[10px] font-black text-slate-300 py-3 uppercase tracking-widest bg-slate-50/30">
            <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
          </div>
          
          <div className="grid grid-cols-7 border-t border-slate-50">
            {renderCalendar()}
          </div>
          
          <div className="px-6 py-3 text-center bg-slate-50/50">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TAP A DATE TO ADD RECORD</span>
          </div>
        </section>

        {/* 最近紀錄 - 圓角改為 2xl */}
        <section className="space-y-3 px-1">
          <div className="flex justify-between items-center">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">對局歷史</h3>
            <div className="h-[1px] flex-1 bg-slate-200/50 ml-4"></div>
          </div>
          <div className="space-y-2 max-h-[25vh] overflow-y-auto pr-1 scrollbar-hide">
            {records.slice(0, 8).map(record => (
              <div key={record.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-inner ${record.type === 'win' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                    {record.type === 'win' ? <TrendingUp size={20}/> : <TrendingDown size={20}/>}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-black text-slate-400">{record.date.split('-').slice(1).join('/')}</span>
                      <span className="text-[9px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/50">{record.finalStakes}</span>
                    </div>
                    <p className={`text-base font-black ${record.type === 'win' ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {record.type === 'win' ? '+' : '-'}{record.amount.toLocaleString()} <span className="text-[10px] text-slate-300 ml-1 font-bold">費 {record.tableFee}</span>
                    </p>
                  </div>
                </div>
                <button onClick={() => deleteRecord(record.id)} className="p-2 text-slate-200 hover:text-rose-500 transition-colors"><Trash2 size={18}/></button>
              </div>
            ))}
            {records.length === 0 && (
              <p className="text-center py-10 text-slate-300 text-xs italic font-medium">尚無任何對局紀錄</p>
            )}
          </div>
        </section>
      </main>

      {/* 新增對局彈窗 - 優化頂部圓角 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-t-3xl p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom duration-500 border-t border-slate-100">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">紀錄戰績</h2>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1">Winning is a habit</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="bg-slate-100 text-slate-400 p-2.5 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-all"><X size={20}/></button>
            </div>

            <div className="space-y-6">
              <div className="flex gap-2 p-1.5 bg-slate-100 rounded-xl">
                <button onClick={() => setFormData({...formData, type: 'win'})} className={`flex-1 py-3.5 rounded-lg font-black text-sm transition-all ${formData.type === 'win' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-400'}`}>贏錢 🎉</button>
                <button onClick={() => setFormData({...formData, type: 'loss'})} className={`flex-1 py-3.5 rounded-lg font-black text-sm transition-all ${formData.type === 'loss' ? 'bg-white text-rose-500 shadow-md' : 'text-slate-400'}`}>輸錢 📉</button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-1">日期</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl font-bold border-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-1">金額</label>
                  <input type="number" placeholder="0" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl font-black border-none focus:ring-2 focus:ring-emerald-500 text-lg text-emerald-700" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1">底 / 台</label>
                <div className="grid grid-cols-3 gap-2">
                  {stakeOptions.map(opt => (
                    <button key={opt} onClick={() => setFormData({...formData, stakes: opt})} className={`py-3.5 rounded-xl font-black text-xs border transition-all ${formData.stakes === opt ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-200 hover:border-emerald-300 hover:text-emerald-600'}`}>{opt}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1">台費 (抽頭)</label>
                <input type="number" placeholder="0" value={formData.tableFee} onChange={(e) => setFormData({...formData, tableFee: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl font-bold border-none focus:ring-2 focus:ring-amber-500" />
              </div>

              <button 
                onClick={handleAddRecord} 
                disabled={!formData.amount} 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-emerald-200 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none mt-2"
              >
                儲存戰報 🀄
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
