import React, { useState } from 'react';
import { 
  Users, ShoppingBag, UserPlus, Zap, ArrowRightLeft, 
  Calendar, BarChart3, Repeat, Share2, Database, Download, RefreshCw, Save
} from 'lucide-react';

const App = () => {
  const [activeStore, setActiveStore] = useState('mostoles');
  const [activePhase, setActivePhase] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [sheetId, setSheetId] = useState("");

  const [stores, setStores] = useState({
    mostoles: { name: "Móstoles", tier: 1, targetSala: 70, currentSala: 62, targetDelivery: 30, currentDelivery: 38, owner: "Gestión Local", color: "bg-blue-600", accent: "text-blue-600" },
    valencia: { name: "Valencia", tier: 2, targetSala: 50, currentSala: 45, targetDelivery: 50, currentDelivery: 55, owner: "Franquiciado", color: "bg-orange-500", accent: "text-orange-500" },
    cartagena: { name: "Cartagena", tier: 3, targetSala: 30, currentSala: 28, targetDelivery: 70, currentDelivery: 72, owner: "Franquiciado", color: "bg-green-600", accent: "text-green-600" },
    sevilla: { name: "Sevilla", tier: 2, targetSala: 50, currentSala: 38, targetDelivery: 50, currentDelivery: 62, owner: "Foco Expansión", color: "bg-red-600", accent: "text-red-600" }
  });

  const [journeyPhases, setJourneyPhases] = useState([
    { id: "captacion", name: "Captación", icon: <Users size={20} />, sub: "Descubrimiento y visibilidad", owners: "Marketing / RRSS", owClass: "bg-purple-100 text-purple-700", kpis: [ { label: "Followers IG", value: "8.2%", target: "10%", trend: "up", suffix: "", desc: "Aumento neto comunidad" }, { label: "Impresiones Locales", value: "45.2", target: "50.0", trend: "up", suffix: "k", desc: "Alcance geolocalizado" }, { label: "CAC Delivery", value: "2.40", target: "2.00", trend: "down", suffix: "€", desc: "Coste captación plataforma" }, { label: "CTR Ads", value: "3.1%", target: "4.5%", trend: "up", suffix: "", desc: "Efectividad pauta local" } ], actions: "Colaboraciones con influencers (Foco Sevilla) y pauta segmentada para tráfico local." },
    { id: "primera_exp", name: "1ª Experiencia", icon: <ShoppingBag size={20} />, sub: "Validación de promesa", owners: "Operaciones", owClass: "bg-blue-100 text-blue-700", kpis: [ { label: "Rating Apps", value: "4.7", target: "4.8", trend: "up", suffix: "★", desc: "Media plataformas" }, { label: "Tiempo Entrega", value: "28", target: "25", trend: "down", suffix: "min", desc: "Click to Door" }, { label: "Error Rate", value: "1.2%", target: "0.5%", trend: "down", suffix: "", desc: "Incidencias pedidos" }, { label: "Packaging Score", value: "92%", target: "95%", trend: "up", suffix: "", desc: "Percepción marca" } ], actions: "Implementación de packaging de marca y control estricto de temperatura/tiempos." },
    { id: "identificacion", name: "Identificación", icon: <UserPlus size={20} />, sub: "Captura de datos", owners: "Tech / CRM", owClass: "bg-green-100 text-green-700", kpis: [ { label: "Registros Club", value: "85", target: "100", trend: "up", suffix: "", desc: "Nuevos miembros/mes" }, { label: "Scan QR Sala", value: "12%", target: "20%", trend: "up", suffix: "", desc: "Físico a Digital" }, { label: "Altas Wallet", value: "42", target: "60", trend: "up", suffix: "", desc: "Digitalización tarjeta" }, { label: "Tasa Opt-in", value: "88%", target: "90%", trend: "up", suffix: "", desc: "Permisos CRM" } ], actions: "Campaña QR visible en cada mesa para auto-registro (>100 miembros objetivo)." },
    { id: "ecosistema", name: "Ecosistema", icon: <Zap size={20} />, sub: "Canales propios", owners: "Digital", owClass: "bg-yellow-100 text-yellow-700", kpis: [ { label: "Ventas Chatbot", value: "15%", target: "25%", trend: "up", suffix: "", desc: "Test Thomas (Móstoles)" }, { label: "App Gula", value: "22%", target: "35%", trend: "up", suffix: "", desc: "App propia vs total" }, { label: "Ahorro Comis.", value: "420", target: "800", trend: "up", suffix: "€", desc: "Vs Agregadores" }, { label: "Conv. Directa", value: "8%", target: "12%", trend: "up", suffix: "", desc: "Web/App propia" } ], actions: "Cupón de bienvenida en primer pedido online para incentivar canal directo." },
    { id: "migracion", name: "Migración", icon: <ArrowRightLeft size={20} />, sub: "Delivery a Sala", owners: "Estrategia", owClass: "bg-indigo-100 text-indigo-700", kpis: [ { label: "Conv. a Sala", value: "5.4%", target: "15%", trend: "up", suffix: "", desc: "Dlv que visita tienda" }, { label: "Uso Cupón Sala", value: "110", target: "150", trend: "up", suffix: "uds", desc: "Redención física" }, { label: "Tráfico Sala", value: "+12%", target: "+30%", trend: "up", suffix: "", desc: "Incremento vs base" }, { label: "Ticket Medio", value: "18.5", target: "20.5", trend: "up", suffix: "€", desc: "Gasto en local" } ], actions: "Lanzamiento Burger Oklahoma exclusiva en sala mediante código secreto de IG." },
    { id: "recurrencia", name: "Recurrencia", icon: <Repeat size={20} />, sub: "Frecuencia y LTV", owners: "CRM", owClass: "bg-red-100 text-red-700", kpis: [ { label: "Frecuencia", value: "1.4", target: "2.1", trend: "up", suffix: "v/m", desc: "Visitas mensuales" }, { label: "LTV (6m)", value: "112", target: "140", trend: "up", suffix: "€", desc: "Lifetime Value" }, { label: "Retención", value: "95.8%", target: "97.0%", trend: "up", suffix: "", desc: "Persistencia socios" }, { label: "Gap Compra", value: "18", target: "14", trend: "down", suffix: "días", desc: "Días entre pedidos" } ], actions: "Calendario de contenido: 'algo diferente cada semana' (producto y acciones)." },
    { id: "vinculacion", name: "Vinculación", icon: <Share2 size={20} />, sub: "Comunidad", owners: "Marketing", owClass: "bg-pink-100 text-pink-700", kpis: [ { label: "Tasa Referidos", value: "0.8", target: "2.0", trend: "up", suffix: "%", desc: "Invitaciones enviadas" }, { label: "Menciones UGC", value: "45", target: "100", trend: "up", suffix: "uds", desc: "Contenido de socios" }, { label: "Engagement", value: "22%", target: "30%", trend: "up", suffix: "", desc: "Actividad Club" }, { label: "NPS Elite", value: "85", target: "90", trend: "up", suffix: "", desc: "Promotores VIP" } ], actions: "Crear sistema de referidos e integrar Apple Wallet para fidelización digital." }
  ]);

  const refreshFromSheets = () => {
    console.log("Sincronizando con Google Sheets ID:", sheetId);
    const btn = document.getElementById('refresh-btn');
    if (btn) {
      btn.classList.add('animate-spin');
      setTimeout(() => btn.classList.remove('animate-spin'), 1000);
    }
  };

  const currentStore = stores[activeStore];
  const currentPhaseData = journeyPhases[activePhase];

  const handleKpiChange = (fIdx, kIdx, newVal) => {
    const updated = [...journeyPhases];
    updated[fIdx].kpis[kIdx].value = newVal;
    setJourneyPhases(updated);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-xl ${currentStore.color} text-white shadow-lg`}>
                <BarChart3 size={24} />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
                GULA Intel <span className="text-slate-400 font-light">Live v5.0</span>
              </h1>
            </div>
            <div className="flex items-center gap-4 text-slate-500 text-sm font-medium">
              <span className="flex items-center gap-1"><Calendar size={14} /> Mayo 2026</span>
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-green-600">Conexión Activa</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 px-3 border-r border-slate-100 mr-2">
               <Database size={16} className="text-slate-400" />
               <input 
                  type="text" 
                  placeholder="ID de Google Sheet..." 
                  className="text-xs font-bold outline-none w-32"
                  value={sheetId}
                  onChange={(e) => setSheetId(e.target.value)}
               />
               <button id="refresh-btn" onClick={refreshFromSheets} className="p-1.5 hover:bg-slate-100 rounded-lg text-indigo-600 transition-colors">
                  <RefreshCw size={16} />
               </button>
            </div>
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {Object.keys(stores).map((key) => (
                <button
                  key={key}
                  onClick={() => { setActiveStore(key); }}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all uppercase ${
                    activeStore === key ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {stores[key].name}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-32 h-32 -mr-12 -mt-12 opacity-10 rounded-full ${currentStore.color}`}></div>
              <span className="bg-slate-900 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">TIER {currentStore.tier}</span>
              <h2 className="text-4xl font-black mt-2 text-slate-800">{currentStore.name}</h2>
              <div className="mt-8 space-y-6">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 mb-2">
                    <span>Mix Sala Actual</span>
                    <input 
                        type="number" 
                        className="bg-transparent text-right w-10 font-black text-slate-800" 
                        value={currentStore.currentSala}
                        onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setStores({...stores, [activeStore]: {...currentStore, currentSala: val, currentDelivery: 100 - val}});
                        }}
                    />
                  </div>
                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                    <div className={`${currentStore.color} h-full transition-all duration-500`} style={{ width: `${currentStore.currentSala}%` }}></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100">
                        <p className="text-[9px] font-black uppercase text-blue-400">Sala</p>
                        <p className="text-lg font-black text-blue-700">{currentStore.currentSala}%</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black uppercase text-slate-400">Delivery</p>
                        <p className="text-lg font-black text-slate-600">{currentStore.currentDelivery}%</p>
                    </div>
                </div>
              </div>
            </div>

            <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`w-full py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 transition-all ${
                    isEditing ? 'bg-green-600 text-white shadow-green-200 shadow-xl' : 'bg-white text-slate-900 border border-slate-200'
                }`}
            >
                {isEditing ? <Save size={16} /> : <Database size={16} />}
                {isEditing ? "Guardar Cambios" : "Editar KPIs Manual"}
            </button>
          </div>

          <div className="lg:col-span-3 flex flex-col gap-6">
            <div className="bg-white rounded-3xl p-2 shadow-sm border border-slate-200 flex overflow-x-auto no-scrollbar">
                {journeyPhases.map((phase, idx) => (
                  <button
                    key={phase.id}
                    onClick={() => setActivePhase(idx)}
                    className={`flex-1 flex flex-col items-center gap-1 px-4 py-3 rounded-2xl transition-all min-w-[100px] ${
                      activePhase === idx ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <div className={activePhase === idx ? 'text-white' : 'text-slate-300'}>{phase.icon}</div>
                    <span className="text-[9px] font-black uppercase tracking-tighter">{phase.name}</span>
                  </button>
                ))}
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex-grow">
              <div className="flex justify-between items-start mb-10">
                <div>
                    <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">{currentPhaseData.name}</h3>
                    <p className="text-slate-400 italic font-medium">{currentPhaseData.sub}</p>
                </div>
                <button className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-widest bg-indigo-50 px-4 py-2 rounded-xl">
                    <Download size={14} /> Exportar CSV
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {currentPhaseData.kpis.map((kpi, i) => (
                  <div key={i} className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-4 tracking-widest">{kpi.label}</p>
                    {isEditing ? (
                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 px-2 mb-2">
                             <input 
                                type="text" 
                                className="w-full text-xl font-black outline-none"
                                value={kpi.value}
                                onChange={(e) => handleKpiChange(activePhase, i, e.target.value)}
                             />
                        </div>
                    ) : (
                        <div className="flex items-baseline gap-1 mb-2">
                            <span className="text-3xl font-black text-slate-800 tracking-tighter">{kpi.value}</span>
                            <span className="text-xs font-bold text-slate-400 uppercase">{kpi.suffix}</span>
                        </div>
                    )}
                    <p className="text-[10px] text-slate-400 leading-snug">{kpi.desc}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-6 bg-slate-900 rounded-[2rem] text-white">
                 <h4 className="text-yellow-400 text-[10px] font-black uppercase tracking-widest mb-2">Acción Estratégica</h4>
                 <p className="font-medium text-lg italic opacity-90">"{currentPhaseData.actions}"</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
