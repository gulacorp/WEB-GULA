// GULA · Merchant OS v2 · part 1/2
const SUPABASE_URL = 'https://gblmjealpcyswcgjrhzk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdibG1qZWFscGN5c3djZ2pyaHprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDQzNDQsImV4cCI6MjA5MjUyMDM0NH0.KdQC9ZWuSmayOkLGr7Rrcz9i1PtW2ieIL-ZVVm4s7cA';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let user=null,products=[],costs={},metrics=[],combos=[],supplements=[],blocks=[],clubMode='missions',clubItems=[],clubSel=null;
function channelRate(ch,ticket){if(ch==='direct')return 0;if(ch==='glovo_default')return 25;if(ch==='glovo_pickup')return 15;if(ch==='ubereats')return 30;if(ch==='glovo_tier'){const t=Number(ticket||0);if(t>30)return 23;if(t>26)return 24;return 25}return 25}

const COST_SEED={'BBK':4.31,'Bohemian Chicken':4.90,'Buffalo Ranch Carne':4.12,'Cheese Bacon':4.55,'Cheeseburger':4.22,"Pope's":4.02,'Spicy V':4.55,'The Sinner':4.33,'The Trufa Corp':5.15,'Trufa Corp Chicken':5.72,'Nuestras Fritas':0.57,'Fritas Trufadas':1.33,'Fritas Bacon & Queso':1.64,'Fritas Buffalo Ranch':1.43,'Alitas':2.65,'Pollo Frito':2.92,'Golden Slider':2.21};
const MENU_SEED=[
{title:'BBK',category:'burgers',price:13.90,image:'images/burger3.png',description:'Doble smash, queso cheddar, bacon bits',rating:4.9,sort_order:1},
{title:'Bohemian Chicken',category:'burgers',price:13.90,image:'images/burger4.png',description:'Pollo crujiente con salsas premium',rating:4.8,sort_order:2},
{title:'Buffalo Ranch Carne',category:'burgers',price:13.90,image:'images/burger2.png',description:'Salsa buffalo con carne premium',rating:4.7,sort_order:3},
{title:'Cheese Bacon',category:'burgers',price:13.90,image:'images/burger-cheese-bacon.png',description:'Queso cheddar y bacon crujiente',rating:4.8,sort_order:4},
{title:'Cheeseburger',category:'burgers',price:11.90,image:'images/burger-cheese.png',description:'Clásico con queso derretido',rating:4.6,sort_order:5},
{title:"Pope's",category:'burgers',price:12.90,image:'images/burger-popes.png',description:'Receta especial premium',rating:4.7,sort_order:6},
{title:'Spicy V',category:'burgers',price:13.90,image:'images/burger-spicy.png',description:'Picante y vegetal',rating:4.5,sort_order:7},
{title:'The Sinner',category:'burgers',price:13.90,image:'images/burger-sinner.png',description:'Pecadosamente deliciosa',rating:4.9,sort_order:8},
{title:'The Trufa Corp',category:'burgers',price:14.90,image:'images/burger-trufa.png',description:'Salsa trufada premium',rating:4.9,sort_order:9},
{title:'Trufa Corp Chicken',category:'burgers',price:13.90,image:'images/burger1.png',description:'Pollo con salsa trufada',rating:4.8,sort_order:10},
{title:'Golden Slider',category:'sliders',price:11.29,image:'images/slider-golden.png',description:'Mini burger premium',rating:4.7,sort_order:11},
{title:'Alitas',category:'sides',price:8.50,image:'images/alitas.png',description:'Alitas BBK',rating:4.6,sort_order:12},
{title:'Fritas Bacon & Queso',category:'sides',price:7.50,image:'images/fritas-bacon.png',description:'Patatas con bacon y queso',rating:4.5,sort_order:13},
{title:'Fritas Buffalo Ranch',category:'sides',price:6.50,image:'images/fritas1.png',description:'Patatas con salsa buffalo',rating:4.7,sort_order:14},
{title:'Fritas Trufadas',category:'sides',price:6.50,image:'images/fritas-trufadas.png',description:'Patatas con salsa trufa',rating:4.8,sort_order:15},
{title:'Nuestras Fritas',category:'sides',price:3.40,image:'images/fritas2.png',description:'Patatas crujientes',rating:4.5,sort_order:16},
{title:'Pollo Frito',category:'sides',price:9.90,image:'images/pollo-frito.png',description:'Pollo crujiente y jugoso',rating:4.7,sort_order:17}];

const $=id=>document.getElementById(id);
const $$=s=>document.querySelectorAll(s);
const euro=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0));
const safe=v=>String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function toast(t,b,k){window.gulaToast?window.gulaToast(t,b,k):console.log(t,b)}
function skel(n){return Array(n).fill(0).map(()=>'<div class="row-sk"></div>').join('')}
function fmtDate(s){if(!s)return '';return new Date(s).toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'2-digit'})}
function fmtDateTime(s){if(!s)return '';const d=new Date(s);return d.toLocaleDateString('es-ES',{day:'2-digit',month:'short'})+' · '+d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}
async function audit(a,e,m){try{await sb.from('admin_audit_logs').insert({admin_email:user&&user.email,action:a,entity:e,metadata:m||{}});}catch(e){}}
async function countTable(t){const{count}=await sb.from(t).select('*',{count:'exact',head:true});return count||0}
async function tableExists(t){try{const{error}=await sb.from(t).select('id',{head:true,count:'exact'});return !error;}catch(e){return false}}

async function isAdmin(){const{data:{session}}=await sb.auth.getSession();user=session&&session.user;if(!user)return false;const{data}=await sb.from('admin_users').select('email,active').eq('email',user.email).eq('active',true).maybeSingle();return !!data}
async function handleLogin(){const m=$('loginMsg');m.textContent='Verificando…';const{error}=await sb.auth.signInWithPassword({email:$('email').value,password:$('password').value});if(error){m.innerHTML='<span style="color:#ff7070">'+safe(error.message)+'</span>';return}if(await isAdmin())enterApp();else{await sb.auth.signOut();m.innerHTML='<span style="color:#ff7070">Autenticado pero no admin.</span>'}}
async function handleReset(){const m=$('loginMsg');const{error}=await sb.auth.resetPasswordForEmail($('email').value,{redirectTo:location.origin+location.pathname});m.innerHTML=error?'<span style="color:#ff7070">'+safe(error.message)+'</span>':'<span style="color:#50f2a8">Email enviado.</span>'}
async function handleUpdatePassword(){const n=$('newPassword').value;if(n.length<8){toast('Password','Mín 8 caracteres','error');return}const{error}=await sb.auth.updateUser({password:n});if(error)toast('Password',error.message,'error');else{toast('Password','Actualizada','success');$('recoveryBox').classList.add('hidden')}}
function enterApp(){$('login').classList.add('hidden');$('app').classList.remove('hidden');$('greetingName').textContent=(user.email||'admin').split('@')[0];populateConfig();loadAll()}

async function loadAll(){
  $('topProducts').innerHTML=skel(5);$('recentAudit').innerHTML=skel(6);$('checklist').innerHTML=skel(4);
  const[m,l,o]=await Promise.all([countTable('crew_members'),countTable('contactos'),countTable('pedidos')]);
  $('kpiMembers').textContent=m;$('kpiLeads').textContent=l;$('kpiOrders').textContent=o;
  await Promise.all([loadMetrics(),loadProducts().then(loadCombos),loadBlocks(),loadClub(),loadOrders(),loadLeads(),loadMembers(),loadPromos(),loadConsents(),loadAudit(),loadChecklist()]);
}

async function loadMetrics(){
  const{data}=await sb.from('v_admin_daily_metrics').select('*').limit(30);
  metrics=(data||[]).reverse();
  const sum=k=>metrics.reduce((s,r)=>s+Number(r[k]||0),0);
  $('kpiRevenue').textContent=euro(sum('revenue'));$('kpiOptins').textContent=sum('marketing_optins');
  drawSpark('revenue',metrics.map(r=>Number(r.revenue||0)));
  drawSpark('members',metrics.map(r=>Number(r.members||0)));
  drawSpark('leads',metrics.map(r=>Number(r.leads||0)));
  drawSpark('orders',metrics.map(r=>Number(r.orders||0)));
  drawSpark('optins',metrics.map(r=>Number(r.marketing_optins||0)));
}
function drawSpark(name,vals){
  const c=document.querySelector('[data-spark="'+name+'"]');if(!c)return;
  const dpr=devicePixelRatio||1;const w=c.width=c.clientWidth*dpr;const h=c.height=c.clientHeight*dpr;const ctx=c.getContext('2d');
  ctx.clearRect(0,0,w,h);if(!vals.length)return;
  const max=Math.max(1,...vals);const pts=vals.map((v,i)=>[vals.length<2?w/2:i*(w/(vals.length-1)),h-(v/max)*h*.82-h*.08]);
  const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(255,88,0,.5)');g.addColorStop(1,'rgba(255,88,0,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,h);pts.forEach(p=>ctx.lineTo(p[0],p[1]));ctx.lineTo(w,h);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#ff5800';ctx.lineWidth=2*dpr;ctx.lineCap='round';ctx.beginPath();
  pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();
}

async function loadProducts(){
  const{data}=await sb.from('products').select('*').order('sort_order').order('title');
  products=(data&&data.length)?data:MENU_SEED.map((p,i)=>({...p,id:'seed-'+i,active:true}));
  const{data:c}=await sb.from('product_costs').select('*');
  costs={};(c||[]).forEach(x=>costs[x.product_id]=x);
  products.forEach(p=>{if(String(p.id).startsWith('seed-')&&COST_SEED[p.title])costs[p.id]={cost_base:COST_SEED[p.title],cost_inflation_percent:15,channel_commission_percent:0}});
  renderCatalog();renderTopProducts();computeAvgMargin();
}
function computeAvgMargin(){let s=0,n=0;products.forEach(p=>{const r=pnl(p);if(p.price>0){s+=r.normalMargin;n++}});$('kpiMargin').textContent=n?(s/n).toFixed(1)+'%':'—'}
function pnl(p){
  const c=costs[p.id]||{};const cost=Number(c.cost_base||0);const inflPct=Number(c.cost_inflation_percent||15);
  const ch=$('pbChannel')?$('pbChannel').value:'direct';
  const ticket=Number($('pbTicket')?$('pbTicket').value:24);
  const commPct=c.channel_commission_percent!=null?Number(c.channel_commission_percent):channelRate(ch,ticket);
  const productPromoType=p.promo_type||'none';const productPromoValue=Number(p.promo_value||0);
  const globalPromoType=$('pbType')?$('pbType').value:'none';const globalPromoValue=Number($('pbValue')?$('pbValue').value:0);
  const promoType=productPromoType!=='none'?productPromoType:globalPromoType;
  const promoValue=productPromoType!=='none'?productPromoValue:globalPromoValue;
  const minM=Number($('pbMin')?$('pbMin').value:30);
  const minOrder=Number($('pbMinOrder')?$('pbMinOrder').value:0);
  const giftCost=Number($('pbGift')?$('pbGift').value:0);
  const price=Number(p.price||0);const inflated=cost*(1+inflPct/100);const commission=price*commPct/100;
  const np=price-cost-commission;const nm=price?np/price*100:0;const nmi=price?(price-inflated-commission)/price*100:0;
  let pp=price,pf=np,pm=nm,note='';
  if(promoType==='percent'||promoType==='percent_items'||promoType==='percent_order'||promoType==='percent_legacy'||promoType==='happy_hour'){pp=price*(1-promoValue/100);const pc=pp*commPct/100;pf=pp-cost-pc;pm=pp?pf/pp*100:0;note=promoType==='happy_hour'?'Aplica solo en franja horaria definida':''}
  else if(promoType==='fixed'||promoType==='amount_order'){pp=Math.max(0,price-promoValue);const pc=pp*commPct/100;pf=pp-cost-pc;pm=pp?pf/pp*100:0;if(minOrder)note='Solo si pedido ≥ '+euro(minOrder)}
  else if(promoType==='bogo'){const tc=price*commPct/100;const tp=price-cost*2-tc;pf=tp/2;pm=price?tp/price*100:0;pp=price/2;note='Coste real = 2 unidades'}
  else if(promoType==='3x2'){const tc=price*2*commPct/100;const tp=price*2-cost*3-tc;pf=tp/3;pm=tp/(price*2)*100;pp=price*2/3}
  else if(promoType==='free_item'||promoType==='free_item_purchase'){const tc=price*commPct/100;pf=price-cost-tc-giftCost;pm=price?pf/price*100:0;pp=price;note='Regalo coste '+euro(giftCost)+(minOrder?' · pedido ≥ '+euro(minOrder):'')}
  else if(promoType==='bogo_diff'){const tc=price*commPct/100;pf=price-cost-tc-giftCost;pm=price?pf/price*100:0;pp=price;note='Compra principal + regalo Y · coste regalo '+euro(giftCost)}
  else if(promoType==='free_delivery'){const deliveryCost=Math.min(3.5,price*0.08);pf=np-deliveryCost;pm=price?pf/price*100:0;pp=price;note='GULA absorbe envío estimado '+euro(deliveryCost)}
  return{cost,inflated,commission,price,normalProfit:np,normalMargin:nm,normalMarginInflated:nmi,promoPrice:pp,promoProfit:pf,promoMargin:pm,promoType,promoValue,minMargin:minM,channel:ch,channelRate:commPct,note,productPromoType};
}
function marginClass(m,min){return m>=min?'ok':m>=min*0.6?'warn':'bad'}
function marginBar(m,min){const cls=marginClass(m,min);const w=Math.max(0,Math.min(100,m));return '<div class="bar-margin"><span class="'+cls+'" style="width:'+w+'%"></span></div>'}

function renderCatalog(){
  const q=($('catSearch').value||'').toLowerCase();const f=$('catFilter').value;
  const rows=products.filter(p=>(f==='all'||p.category===f)&&(p.title||'').toLowerCase().includes(q));
  if(!rows.length){$('catalogTable').innerHTML='<div class="empty">Sin productos.</div>';$('catalogGrid').innerHTML='';return}
  $('catalogTable').innerHTML='<table class="cat-table"><thead><tr><th>Producto</th><th>Cat</th><th>PVP</th><th>Coste</th><th>Margen</th><th>Promo</th><th>Estado</th></tr></thead><tbody>'+rows.map(p=>{
    const r=pnl(p);
    return '<tr data-id="'+safe(p.id)+'"><td><div class="cell-title"><img class="thumb" src="'+safe(p.image||'')+'" onerror="this.style.opacity=.2"><div><strong>'+safe(p.title)+'</strong><span class="cat">'+safe(p.description||'').slice(0,52)+'</span></div></div></td><td><span class="tag">'+safe(p.category)+'</span></td><td><strong>'+euro(p.price)+'</strong></td><td>'+euro(r.cost)+'</td><td>'+marginBar(r.normalMargin,r.minMargin)+'<small style="color:var(--mut);font-size:11px;margin-left:8px">'+r.normalMargin.toFixed(1)+'%</small></td><td>'+(r.promoType==='none'?'<span class="tag off">—</span>':'<span class="tag '+marginClass(r.promoMargin,r.minMargin)+'">'+euro(r.promoPrice)+' · '+r.promoMargin.toFixed(0)+'%</span>')+'</td><td><span class="tag '+(p.active===false?'off':'ok')+'">'+(p.active===false?'Oculto':'Activo')+'</span></td></tr>';
  }).join('')+'</tbody></table>';
  $$('.cat-table tbody tr').forEach(tr=>tr.onclick=()=>openProduct(tr.dataset.id));
  $('catalogGrid').innerHTML='<div class="cat-grid">'+rows.map(p=>{const r=pnl(p);return '<article class="cat-card" data-id="'+safe(p.id)+'"><img src="'+safe(p.image||'')+'" onerror="this.style.opacity=.15"><div class="body"><h3>'+safe(p.title)+'</h3><div class="meta"><strong>'+euro(p.price)+'</strong><span class="tag '+marginClass(r.normalMargin,r.minMargin)+'">'+r.normalMargin.toFixed(0)+'%</span></div></div></article>'}).join('')+'</div>';
  $$('.cat-card').forEach(c=>c.onclick=()=>openProduct(c.dataset.id));
}
function renderTopProducts(){
  const sorted=[...products].map(p=>({p,r:pnl(p)})).filter(x=>x.p.price>0).sort((a,b)=>b.r.normalMargin-a.r.normalMargin).slice(0,6);
  if(!sorted.length){$('topProducts').innerHTML='<div class="empty">Carga el menú base para ver el ranking.</div>';return}
  $('topProducts').innerHTML='<table class="tb"><tbody>'+sorted.map(x=>'<tr style="cursor:pointer" data-id="'+safe(x.p.id)+'"><td style="width:34px"><img class="thumb" src="'+safe(x.p.image||'')+'" onerror="this.style.opacity=.15"></td><td><strong>'+safe(x.p.title)+'</strong></td><td style="width:140px">'+marginBar(x.r.normalMargin,x.r.minMargin)+'</td><td style="width:60px;text-align:right"><span class="tag '+marginClass(x.r.normalMargin,x.r.minMargin)+'">'+x.r.normalMargin.toFixed(0)+'%</span></td></tr>').join('')+'</tbody></table>';
  $$('#topProducts tr[data-id]').forEach(tr=>tr.onclick=()=>{activateTab('catalog');openProduct(tr.dataset.id)});
}

function openPanel(eb,html){$('panelEyebrow').textContent=eb;$('panelBody').innerHTML=html;$('panel').classList.remove('hidden');requestAnimationFrame(()=>$('panel').classList.add('open'));$('panel').setAttribute('aria-hidden','false')}
function closePanel(){$('panel').classList.remove('open');$('panel').setAttribute('aria-hidden','true');setTimeout(()=>$('panel').classList.add('hidden'),420)}

function openProduct(id){
  const p=id?(products.find(x=>String(x.id)===String(id))||{category:'burgers',rating:4.8,active:true,sort_order:products.length+1}):{category:'burgers',rating:4.8,active:true,sort_order:products.length+1,id:''};
  if(p._combo){return openCombo(p)}
  const c=costs[p.id]||{};
  openPanel('Producto',`<h2>${p.id?'Editar':'Nuevo'} producto</h2><input type="hidden" id="pId" value="${safe(p.id||'')}"><div class="form-grid"><label class="full">Título<input id="pTitle" value="${safe(p.title||'')}"></label><label>Categoría<select id="pCategory"><option value="burgers">Burgers</option><option value="sliders">Sliders</option><option value="sides">Entrantes</option><option value="postres">Postres</option><option value="combos">Combos</option><option value="bebidas">Bebidas</option></select></label><label>Activo<select id="pActive"><option value="true">Sí</option><option value="false">No</option></select></label><label>PVP (€)<input id="pPrice" type="number" step="0.01" value="${Number(p.price||0)}"></label><label>Coste base (€)<input id="pCost" type="number" step="0.01" value="${Number(c.cost_base||0)}"></label><label>Comisión canal %<input id="pComm" type="number" step="0.01" value="${Number(c.channel_commission_percent||0)}"></label><label>Rating<input id="pRating" type="number" step="0.1" value="${Number(p.rating||4.8)}"></label><label class="full">Imagen URL<input id="pImage" value="${safe(p.image||'')}"></label><label class="full">Descripción<textarea id="pDesc">${safe(p.description||'')}</textarea></label><label>Orden<input id="pSort" type="number" value="${Number(p.sort_order||0)}"></label></div><div class="pb-eyebrow" style="margin-top:16px">Promo por producto</div><div class="form-grid"><label>Tipo promo<select id="pPromoType"><option value="none">Sin promo</option><option value="percent">% Descuento</option><option value="fixed">€ Descuento</option><option value="bogo">2x1 (BOGO)</option><option value="free_item">Producto gratis</option></select></label><label>Valor promo<input id="pPromoValue" type="number" step="0.01" value="${Number(p.promo_value||0)}"></label></div><div class="preview-box"><img src="${safe(p.image||'')}" onerror="this.style.opacity=.15"></div><div class="pnl" id="pPnl"></div><div class="row right" style="margin-top:18px">${p.id&&!String(p.id).startsWith('seed-')?'<button class="btn btn-danger" id="pDelete"><i class="lu lu-trash-2"></i> Eliminar</button>':''}<button class="btn btn-primary" id="pSave"><i class="lu lu-check"></i> Guardar</button></div>`);
  $('pCategory').value=p.category||'burgers';$('pActive').value=p.active===false?'false':'true';
  $('pPromoType').value=p.promo_type||'none';$('pPromoValue').value=p.promo_value||0;
  ['pTitle','pPrice','pCost','pComm','pImage','pDesc','pRating','pPromoType','pPromoValue'].forEach(id=>$(id).addEventListener('input',renderPnl));
  $('pSave').onclick=saveProduct;if($('pDelete'))$('pDelete').onclick=deleteProduct;renderPnl();
}
function renderPnl(){
  const id=$('pId').value;costs[id]={cost_base:Number($('pCost').value||0),channel_commission_percent:Number($('pComm').value||0),cost_inflation_percent:15};
  const r=pnl({id,price:Number($('pPrice').value||0)});
  const profitW=Math.max(0,Math.min(100,r.normalProfit/Math.max(r.price,1)*100));
  const costW=Math.max(0,Math.min(100,r.cost/Math.max(r.price,1)*100));
  const commW=Math.max(0,Math.min(100,r.commission/Math.max(r.price,1)*100));
  $('pPnl').innerHTML=`<div class="pnl-row"><span>PVP</span><strong>${euro(r.price)}</strong></div><div class="pnl-row"><span>Coste base</span><strong>− ${euro(r.cost)}</strong></div><div class="pnl-row"><span>Coste +15% riesgo</span><strong>${euro(r.inflated)}</strong></div><div class="pnl-row"><span>Comisión canal</span><strong>− ${euro(r.commission)}</strong></div><div class="pnl-row"><span>Beneficio</span><strong>${euro(r.normalProfit)}</strong></div><div class="pnl-row"><span>Margen normal</span><strong>${r.normalMargin.toFixed(1)}%</strong></div><div class="pnl-row"><span>Margen inflado</span><strong>${r.normalMarginInflated.toFixed(1)}%</strong></div>${r.promoType!=='none'?`<div class="pnl-row"><span>Precio promo</span><strong>${euro(r.promoPrice)}</strong></div><div class="pnl-row"><span>Beneficio promo</span><strong>${euro(r.promoProfit)}</strong></div><div class="pnl-row"><span>Margen promo</span><strong>${r.promoMargin.toFixed(1)}%</strong></div>`:''}<div class="pnl-bar"><span class="cost" style="left:0;width:${costW}%"></span><span class="comm" style="left:${costW}%;width:${commW}%"></span><span class="profit" style="left:${costW+commW}%;width:${profitW}%"></span></div>`;
}
async function saveProduct(){
  const id=$('pId').value;const real=id&&!id.startsWith('seed-');
  const payload={title:$('pTitle').value,category:$('pCategory').value,price:Number($('pPrice').value||0),image:$('pImage').value||null,description:$('pDesc').value||null,rating:Number($('pRating').value||4.8),active:$('pActive').value==='true',sort_order:Number($('pSort').value||0),promo_type:$('pPromoType')?$('pPromoType').value:'none',promo_value:Number($('pPromoValue')?$('pPromoValue').value:0),updated_at:new Date().toISOString()};
  const q=real?sb.from('products').update(payload).eq('id',id).select().single():sb.from('products').insert(payload).select().single();
  const{data,error}=await q;
  if(error){toast('Producto',error.message,'error');return}
  await sb.from('product_costs').upsert({product_id:data.id,cost_base:Number($('pCost').value||0),cost_inflation_percent:15,channel_commission_percent:Number($('pComm').value||0),updated_at:new Date().toISOString()},{onConflict:'product_id'});
  costs[data.id]={cost_base:Number($('pCost').value||0),channel_commission_percent:Number($('pComm').value||0),cost_inflation_percent:15};
  await audit(real?'update':'insert','products',payload);toast('Producto',(real?'Actualizado':'Creado')+': '+payload.title,'success');closePanel();await loadProducts();
}
async function deleteProduct(){const id=$('pId').value;if(!confirm('¿Eliminar?'))return;const{error}=await sb.from('products').delete().eq('id',id);if(error){toast('Producto',error.message,'error');return}await audit('delete','products',{id});toast('Producto','Eliminado','success');closePanel();loadProducts()}
async function seedMenu(){const{error}=await sb.from('products').insert(MENU_SEED.map(p=>({...p,active:true})));if(error){toast('Seed',error.message,'error');return}await audit('seed','products',{count:MENU_SEED.length});const{data:created}=await sb.from('products').select('id,title');const rows=(created||[]).filter(p=>COST_SEED[p.title]).map(p=>({product_id:p.id,cost_base:COST_SEED[p.title],cost_inflation_percent:15,channel_commission_percent:0}));if(rows.length)await sb.from('product_costs').upsert(rows,{onConflict:'product_id'});toast('Catálogo','Menú base cargado','success');loadProducts()}

// part 2/2

async function loadCombos(){
  const[{data:c},{data:s}]=await Promise.all([sb.from('combos').select('*').order('sort_order'),sb.from('combo_supplements').select('*')]);
  combos=c||[];supplements=s||[];
  combos.forEach(c=>{products.push({id:'combo-'+c.id,_combo:c,title:c.name,category:'combos',price:Number(c.base_price||0),image:c.image_url||'images/combo.png',description:c.description||'',rating:4.8,active:true,sort_order:1000+(c.sort_order||0)})});
  renderCatalog();renderTopProducts();computeAvgMargin();
}
function comboCost(c){const b=supplements.filter(x=>x.scope==='burger');const s=supplements.filter(x=>x.scope==='side');const avgBurger=b.length?b.reduce((a,x)=>a+Number(x.cost||0),0)/b.length:4.5;const avgSide=s.length?s.reduce((a,x)=>a+Number(x.cost||0),0)/s.length:1.5;return avgBurger*Number(c.burgers_qty||1)+avgSide*Number(c.sides_qty||1)}
function updateChannelHint(){if(!$('pbHint'))return;const ch=$('pbChannel').value;const t=Number($('pbTicket').value||0);const r=channelRate(ch,t);const map={direct:'Venta directa, sin comisión.',glovo_default:'Glovo estándar 25% + IVA sobre venta bruta.',glovo_tier:'Glovo escalonado tras 600k€/3meses: ticket >30€ 23% · 26-30€ 24% · ≤26€ 25%. Hoy: '+r+'%.',glovo_pickup:'Glovo Pick-Up: cliente recoge, comisión 15% + IVA.',ubereats:'UberEats: comisión estándar 30% + IVA.'};$('pbHint').innerHTML=map[ch]+' Comisión aplicada: <strong>'+r+'%</strong>'}

async function loadBlocks(){
  const page=$('visualPage')?$('visualPage').value:$('livePage').value;
  const{data}=await sb.from('page_blocks').select('*').eq('page',page).order('block_key');
  blocks=data||[];renderBlocks();reloadIframe();
}
function renderBlocks(){
  const q=($('blockSearch')&&$('blockSearch').value)?$('blockSearch').value.toLowerCase():'';
  const rows=blocks.filter(b=>b.block_key.toLowerCase().includes(q));
  if($('blocksList'))$('blocksList').innerHTML=rows.length?rows.map(b=>'<div class="block-item" data-id="'+safe(b.id)+'"><span class="k">'+safe(b.block_key)+' · '+safe(b.block_type)+'</span><span class="v">'+safe((b.value||'').slice(0,80))+'</span></div>').join(''):'<div class="empty">Sin bloques. Click <strong>+ Bloque</strong> o <strong>Sincronizar</strong>.</div>';
  if($$('#blocksList').length)$$('#blocksList .block-item').forEach(el=>el.onclick=()=>openBlock(el.dataset.id));
}
function openBlock(id){
  const b=blocks.find(x=>x.id===id);if(!b)return;
  if($$('#blocksList').length)$$('#blocksList .block-item').forEach(el=>el.classList.toggle('active',el.dataset.id===id));
  if($('blockPage'))$('blockPage').value=b.page;
  if($('blockKey'))$('blockKey').value=b.block_key;
  if($('blockType'))$('blockType').value=b.block_type;
  if($('blockValue'))$('blockValue').value=b.value||'';
  if($('blockActive'))$('blockActive').value=b.active?'true':'false';
  if($('blockForm'))$('blockForm').dataset.id=id;
}
function newBlock(){if($('blockForm')){$('blockForm').dataset.id='';$('blockPage').value=$('visualPage')?$('visualPage').value:$('livePage').value;$('blockKey').value='';$('blockType').value='text';$('blockValue').value='';$('blockActive').value='true';$('blockKey').focus()}}
async function saveBlock(){
  const id=$('blockForm')?$('blockForm').dataset.id:null;
  const payload={page:$('blockPage').value,block_key:$('blockKey').value,block_type:$('blockType').value,value:$('blockValue').value,active:$('blockActive').value==='true',updated_at:new Date().toISOString(),updated_by:user&&user.email};
  const q=id?sb.from('page_blocks').update(payload).eq('id',id):sb.from('page_blocks').upsert(payload,{onConflict:'page,block_key'});
  const{error}=await q;
  if(error){toast('Bloque',error.message,'error');return}
  await audit(id?'update':'upsert','page_blocks',payload);toast('Bloque','Publicado','success');loadBlocks();
}
async function deleteBlock(){const id=$('blockForm')?$('blockForm').dataset.id:null;if(!id){toast('Bloque','Nada que eliminar','error');return}if(!confirm('¿Eliminar bloque?'))return;const{error}=await sb.from('page_blocks').delete().eq('id',id);if(error){toast('Bloque',error.message,'error');return}await audit('delete','page_blocks',{id});toast('Bloque','Eliminado','success');loadBlocks()}
function reloadIframe(){const page=$('visualPage')?$('visualPage').value:$('livePage').value;const frame=$('visualFrame')?$('visualFrame'):$('previewFrame');if(frame)frame.src='../'+page+'?cms='+Date.now()}
async function syncBlocks(){
  const iframe=$('visualFrame')?$('visualFrame'):$('previewFrame');
  try{
    const doc=iframe.contentDocument||iframe.contentWindow.document;
    if(!doc){toast('Sincronizar','Iframe no accesible','error');return}
    const keys=new Set();doc.querySelectorAll('[data-cms-key]').forEach(el=>keys.add(el.dataset.cmsKey));
    const existing=new Set(blocks.map(b=>b.block_key));
    const toAdd=[...keys].filter(k=>!existing.has(k));
    if(!toAdd.length){toast('Sincronizar','Sin claves nuevas','success');return}
    const page=$('visualPage')?$('visualPage').value:$('livePage').value;
    const rows=toAdd.map(k=>({page:page,block_key:k,block_type:'text',value:'',active:true}));
    const{error}=await sb.from('page_blocks').insert(rows);
    if(error){toast('Sincronizar',error.message,'error');return}
    toast('Sincronizar',toAdd.length+' claves añadidas','success');loadBlocks();
  }catch(e){toast('Sincronizar','Iframe protegido. Añade data-cms-key manualmente.','error')}
}

async function loadClub(){
  const map={missions:'club_missions',events:'club_events',blog:'blog_posts'};
  const orderField=clubMode==='events'?'starts_at':clubMode==='blog'?'published_at':'sort_order';
  const ascending=clubMode!=='blog';
  const{data}=await sb.from(map[clubMode]).select('*').order(orderField,{ascending});
  clubItems=data||[];
  if(clubItems.length&&!clubItems.find(x=>x.id===clubSel))clubSel=clubItems[0].id;
  if(!clubItems.length)clubSel=null;
  renderClubList();renderClubForm();
}
function renderClubList(){
  if(!clubItems.length){$('clubList').innerHTML='<div class="empty">Sin elementos. Crea uno con <strong>+ Nuevo</strong>.</div>';return}
  $('clubList').innerHTML=clubItems.map(it=>{
    const title=it.title||it.slug||'(sin título)';
    const sub=clubMode==='events'?fmtDateTime(it.starts_at):clubMode==='blog'?(it.category||'')+' · '+fmtDate(it.published_at):(it.reward_points?'+'+it.reward_points+' pts · ':'')+(it.active?'Activa':'Inactiva');
    return '<div class="block-item '+(clubSel===it.id?'active':'')+'" data-id="'+safe(it.id)+'"><span class="k">'+safe(title)+'</span><span class="v">'+safe(sub)+'</span></div>';
  }).join('');
  $$('#clubList .block-item').forEach(el=>el.onclick=()=>{clubSel=el.dataset.id;renderClubList();renderClubForm()});
}
function renderClubForm(){
  const it=clubItems.find(x=>x.id===clubSel)||null;
  if(clubMode==='missions')$('clubForm').innerHTML=missionFormHtml(it);
  else if(clubMode==='events')$('clubForm').innerHTML=eventFormHtml(it);
  else $('clubForm').innerHTML=blogFormHtml(it);
  bindClubForm();
}
function missionFormHtml(it){it=it||{};return `<h2>${it.id?'Editar misión':'Nueva misión'}</h2><div class="form-grid"><label class="full">Título<input id="cTitle" value="${safe(it.title||'')}"></label><label class="full">Descripción<textarea id="cDesc">${safe(it.description||'')}</textarea></label><label>Puntos<input id="cPts" type="number" value="${Number(it.reward_points||50)}"></label><label>CTA<input id="cCta" value="${safe(it.cta_label||'Participar')}"></label><label>Recompensa label<input id="cReward" value="${safe(it.reward_label||'')}"></label><label>Activa<select id="cActive"><option value="true">Sí</option><option value="false">No</option></select></label><label class="full">CTA URL<input id="cUrl" value="${safe(it.cta_url||'')}"></label><label class="full">Imagen URL<input id="cImage" value="${safe(it.image_url||'')}"></label><label>Empieza<input id="cStarts" type="datetime-local" value="${(it.starts_at||'').slice(0,16)}"></label><label>Termina<input id="cEnds" type="datetime-local" value="${(it.ends_at||'').slice(0,16)}"></label></div><div class="row right" style="margin-top:14px">${it.id?'<button class="btn btn-danger" id="cDelete"><i class="lu lu-trash-2"></i> Eliminar</button>':''}<button class="btn btn-primary" id="cSave"><i class="lu lu-check"></i> Guardar</button></div>`}
function eventFormHtml(it){it=it||{};return `<h2>${it.id?'Editar evento':'Nuevo evento'}</h2><div class="form-grid"><label class="full">Título<input id="cTitle" value="${safe(it.title||'')}"></label><label class="full">Descripción<textarea id="cDesc">${safe(it.description||'')}</textarea></label><label>Inicio<input id="cStarts" type="datetime-local" value="${(it.starts_at||'').slice(0,16)}"></label><label>Fin<input id="cEnds" type="datetime-local" value="${(it.ends_at||'').slice(0,16)}"></label><label>Aforo<input id="cCapacity" type="number" value="${it.capacity||''}"></label><label>Activo<select id="cActive"><option value="true">Sí</option><option value="false">No</option></select></label><label class="full">Localización<input id="cLocation" value="${safe(it.location||'')}"></label><label class="full">Cover URL<input id="cCover" value="${safe(it.cover_image||'')}"></label><label>CTA<input id="cCta" value="${safe(it.cta_label||'Reservar')}"></label><label>CTA URL<input id="cUrl" value="${safe(it.cta_url||'')}"></label></div><div class="row right" style="margin-top:14px">${it.id?'<button class="btn btn-danger" id="cDelete"><i class="lu lu-trash-2"></i> Eliminar</button>':''}<button class="btn btn-primary" id="cSave"><i class="lu lu-check"></i> Guardar</button></div>`}
function blogFormHtml(it){it=it||{};return `<h2>${it.id?'Editar post':'Nuevo post'}</h2><div class="form-grid"><label>Slug<input id="cSlug" value="${safe(it.slug||'')}"></label><label>Categoría<input id="cCategory" value="${safe(it.category||'club')}"></label><label>Publicado<select id="cPublished"><option value="true">Sí</option><option value="false">No</option></select></label><label>Min lectura<input id="cReading" type="number" value="${Number(it.reading_minutes||3)}"></label><label class="full">Título<input id="cTitle" value="${safe(it.title||'')}"></label><label class="full">Resumen<textarea id="cExcerpt">${safe(it.excerpt||'')}</textarea></label><label class="full">Cover URL<input id="cCover" value="${safe(it.cover_image||'')}"></label><label class="full">Cuerpo HTML<textarea id="cBody" style="min-height:200px">${safe(it.body_html||'')}</textarea></label></div><div class="row right" style="margin-top:14px">${it.id?'<button class="btn btn-danger" id="cDelete"><i class="lu lu-trash-2"></i> Eliminar</button>':''}<button class="btn btn-primary" id="cSave"><i class="lu lu-check"></i> Guardar</button></div>`}
function bindClubForm(){const it=clubItems.find(x=>x.id===clubSel)||{};if($('cActive'))$('cActive').value=it.active===false?'false':'true';if($('cPublished'))$('cPublished').value=it.published===false?'false':'true';if($('cSave'))$('cSave').onclick=saveClub;if($('cDelete'))$('cDelete').onclick=deleteClub}
async function saveClub(){
  const map={missions:'club_missions',events:'club_events',blog:'blog_posts'};
  let payload={};
  if(clubMode==='missions')payload={title:$('cTitle').value,description:$('cDesc').value,reward_points:Number($('cPts').value||0),reward_label:$('cReward').value||null,cta_label:$('cCta').value||'Participar',cta_url:$('cUrl').value||null,image_url:$('cImage').value||null,starts_at:$('cStarts').value||null,ends_at:$('cEnds').value||null,active:$('cActive').value==='true'};
  else if(clubMode==='events')payload={title:$('cTitle').value,description:$('cDesc').value,starts_at:$('cStarts').value,ends_at:$('cEnds').value||null,location:$('cLocation').value||null,cover_image:$('cCover').value||null,cta_label:$('cCta').value||'Reservar',cta_url:$('cUrl').value||null,capacity:Number($('cCapacity').value)||null,active:$('cActive').value==='true'};
  else payload={slug:$('cSlug').value,title:$('cTitle').value,category:$('cCategory').value,excerpt:$('cExcerpt').value,cover_image:$('cCover').value||null,body_html:$('cBody').value,published:$('cPublished').value==='true',reading_minutes:Number($('cReading').value||3),updated_at:new Date().toISOString()};
  const id=clubSel;
  const q=id?sb.from(map[clubMode]).update(payload).eq('id',id).select().single():sb.from(map[clubMode]).insert(payload).select().single();
  const{data,error}=await q;
  if(error){toast('Club',error.message,'error');return}
  await audit(id?'update':'insert',map[clubMode],payload);toast('Club','Guardado','success');
  if(!id&&data&&data.id)clubSel=data.id;
  loadClub();
}
async function deleteClub(){const map={missions:'club_missions',events:'club_events',blog:'blog_posts'};if(!clubSel||!confirm('¿Eliminar?'))return;const{error}=await sb.from(map[clubMode]).delete().eq('id',clubSel);if(error){toast('Club',error.message,'error');return}await audit('delete',map[clubMode],{id:clubSel});clubSel=null;toast('Club','Eliminado','success');loadClub()}
function newClubItem(){clubSel=null;renderClubForm()}

function openCombo(p){
  const c=p._combo;
  const burgerOpts=supplements.filter(x=>x.scope==='burger');
  const sideOpts=supplements.filter(x=>x.scope==='side');
  openPanel('Combo',`<h2>${safe(c.name)}</h2><p style="color:var(--mut);margin:0 0 16px">${safe(c.description||'')}</p><div class="pb-eyebrow">Configurar combo</div><div class="form-grid">${c.burger_supplement_applies?`<label class="full">Burger seleccionada (×${c.burgers_qty||1})<select id="cmbBurger">${burgerOpts.map(x=>'<option data-cost="'+x.cost+'" value="'+x.supplement+'">'+safe(x.product_name)+' · +'+euro(x.supplement)+'</option>').join('')}</select></label>`:''}${c.side_supplement_applies?`<label class="full">Entrante seleccionado (×${c.sides_qty||1})<select id="cmbSide">${sideOpts.map(x=>'<option data-cost="'+x.cost+'" value="'+x.supplement+'">'+safe(x.product_name)+' · +'+euro(x.supplement)+'</option>').join('')}</select></label>`:''}</div><div class="pnl" id="cmbResult"></div><p class="hint">Edita el precio base y los suplementos en la tabla <code>combos</code> y <code>combo_supplements</code>. Los productos del combo se eligen al pedir.</p>`);
  if($('cmbBurger'))$('cmbBurger').oninput=renderComboPanel;
  if($('cmbSide'))$('cmbSide').oninput=renderComboPanel;
  renderComboPanel(c);
}
function renderComboPanel(combo){
  const c=combo&&combo.id?combo:(combos.find(x=>true)||null);
  if(!c){$('cmbResult').innerHTML='<div class="empty">Sin datos.</div>';return}
  const burgerSup=c.burger_supplement_applies&&$('cmbBurger')?Number($('cmbBurger').value||0)*Number(c.burgers_qty||1):0;
  const sideSup=c.side_supplement_applies&&$('cmbSide')?Number($('cmbSide').value||0)*Number(c.sides_qty||1):0;
  const burgerCostExtra=c.burger_supplement_applies&&$('cmbBurger')?Number($('cmbBurger').selectedOptions[0].dataset.cost||0)*Number(c.burgers_qty||1):0;
  const sideCostExtra=c.side_supplement_applies&&$('cmbSide')?Number($('cmbSide').selectedOptions[0].dataset.cost||0)*Number(c.sides_qty||1):0;
  const baseCost=comboCost(c);
  const totalPrice=Number(c.base_price)+burgerSup+sideSup;
  const totalCost=baseCost+burgerCostExtra+sideCostExtra;
  const r=pnl({id:'combo-'+c.id,price:totalPrice});
  costs['combo-'+c.id]={cost_base:totalCost,cost_inflation_percent:15};
  const r2=pnl({id:'combo-'+c.id,price:totalPrice});
  $('cmbResult').innerHTML=`<div class="pnl-row"><span>Precio base</span><strong>${euro(c.base_price)}</strong></div>${c.burger_supplement_applies?`<div class="pnl-row"><span>Suplemento burger × ${c.burgers_qty}</span><strong>+ ${euro(burgerSup)}</strong></div>`:''}${c.side_supplement_applies?`<div class="pnl-row"><span>Suplemento entrante × ${c.sides_qty}</span><strong>+ ${euro(sideSup)}</strong></div>`:''}<div class="pnl-row"><span>PVP cliente</span><strong>${euro(totalPrice)}</strong></div><div class="pnl-row"><span>Coste total</span><strong>− ${euro(totalCost)}</strong></div><div class="pnl-row"><span>Comisión canal</span><strong>− ${euro(r2.commission)}</strong></div><div class="pnl-row"><span>Beneficio</span><strong>${euro(r2.normalProfit)}</strong></div><div class="pnl-row"><span>Margen</span><strong>${r2.normalMargin.toFixed(1)}%</strong></div>${r2.promoType!=='none'?`<div class="pnl-row"><span>Margen con promoción</span><strong>${r2.promoMargin.toFixed(1)}%</strong></div>`:''}`;
}

function tb(rows,cols){if(!rows||!rows.length)return '<div class="empty">Sin datos.</div>';return '<table class="tb"><thead><tr>'+cols.map(c=>'<th>'+safe(c.label)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+cols.map(c=>'<td>'+(c.render?c.render(r):safe(r[c.key]))+'</td>').join('')+'</tr>').join('')+'</tbody></table>'}
async function loadOrders(){const{data}=await sb.from('pedidos').select('*').order('created_at',{ascending:false}).limit(80);$('ordersTable').innerHTML=tb(data,[{key:'created_at',label:'Fecha',render:r=>fmtDateTime(r.created_at)},{key:'tipo',label:'Tipo'},{key:'monto',label:'Total',render:r=>euro(Number(r.monto||0)/100)},{key:'estado',label:'Estado',render:r=>'<span class="tag">'+safe(r.estado)+'</span>'},{key:'member_id',label:'Miembro'}])}
async function loadLeads(){const{data}=await sb.from('contactos').select('*').order('created_at',{ascending:false}).limit(60);$('leadsTable').innerHTML=tb(data,[{key:'created_at',label:'Fecha',render:r=>fmtDate(r.created_at)},{key:'tipo',label:'Tipo',render:r=>'<span class="tag">'+safe(r.tipo)+'</span>'},{key:'nombre',label:'Nombre'},{key:'email',label:'Email'},{key:'ciudad',label:'Ciudad'}])}
async function loadMembers(){const{data}=await sb.from('crew_members').select('*').order('created_at',{ascending:false}).limit(60);$('membersTable').innerHTML=tb(data,[{key:'created_at',label:'Fecha',render:r=>fmtDate(r.created_at)},{key:'member_code',label:'Código'},{key:'nombre',label:'Nombre'},{key:'email',label:'Email'},{key:'puntos',label:'Pts'},{key:'nivel',label:'Nivel'}])}
async function loadPromos(){const{data}=await sb.from('promos').select('*').order('created_at',{ascending:false}).limit(60);$('promosTable').innerHTML=tb(data,[{key:'codigo',label:'Código'},{key:'descuento',label:'Dto'},{key:'motivo',label:'Motivo'},{key:'usado',label:'Usado',render:r=>'<span class="tag '+(r.usado?'off':'ok')+'">'+(r.usado?'sí':'no')+'</span>'}])}
async function loadConsents(){const{data}=await sb.from('consents').select('*').order('created_at',{ascending:false}).limit(60);$('consentsTable').innerHTML=tb(data,[{key:'created_at',label:'Fecha',render:r=>fmtDateTime(r.created_at)},{key:'source',label:'Origen'},{key:'email',label:'Email'},{key:'analytics',label:'A'},{key:'marketing',label:'M'}])}
async function loadAudit(){const{data}=await sb.from('admin_audit_logs').select('*').order('created_at',{ascending:false}).limit(20);if(!data||!data.length){$('recentAudit').innerHTML='<div class="empty">Sin actividad reciente.</div>';return}$('recentAudit').innerHTML='<table class="tb"><tbody>'+data.map(r=>'<tr><td style="width:130px;color:var(--mut)">'+fmtDateTime(r.created_at)+'</td><td><span class="tag">'+safe(r.action)+'</span></td><td><strong>'+safe(r.entity)+'</strong></td><td style="color:var(--mut)">'+safe((r.admin_email||'').split('@')[0])+'</td></tr>').join('')+'</tbody></table>'}

async function savePromo(e){e.preventDefault();const payload={codigo:$('promoCode').value.toUpperCase().trim(),descuento:Number($('promoDiscount').value),motivo:$('promoReason').value||'marketing',usado:$('promoUsed').value==='true'};const{error}=await sb.from('promos').upsert(payload,{onConflict:'codigo'});if(error){toast('Promo',error.message,'error');return}await audit('upsert','promos',payload);toast('Promo','Guardada','success');e.target.reset();loadPromos()}

function populateConfig(){$('cfgUrl').textContent=SUPABASE_URL;$('cfgAnon').dataset.real=SUPABASE_ANON_KEY;$('cfgCallback').textContent=location.origin+'/crew/admin.html'}
async function loadChecklist(){
  const tableBlocks=await tableExists('page_blocks');
  const items=[
    {k:'Auth admin',v:'<code>marketing@thegulacorp.com</code> presente en Auth → Users.',s:user?'ok':'warn'},
    {k:'SQL 005',v:'Ejecuta <code>supabase_005_admin_consent_email.sql</code>.',s:'ok'},
    {k:'SQL 006',v:'Ejecuta <code>supabase_006_cms_missions_costs.sql</code>.',s:tableBlocks?'ok':'warn'},
    {k:'Edge function',v:'<code>supabase functions deploy send-email --project-ref gblmjealpcyswcgjrhzk</code>',s:'warn'},
    {k:'Resend DNS',v:'Verifica <code>thegulacorp.com</code> y cambia <code>FROM_EMAIL</code>.',s:'warn'},
    {k:'CMS keys',v:'Añade <code>data-cms-key</code> a HTML y pulsa <strong>Sincronizar</strong>.',s:'warn'}
  ];
  $('checklist').innerHTML='<table class="tb"><tbody>'+items.map(i=>'<tr><td style="width:160px"><span class="tag '+i.s+'">'+(i.s==='ok'?'OK':'Pendiente')+'</span></td><td><strong>'+i.k+'</strong></td><td style="color:var(--mut)">'+i.v+'</td></tr>').join('')+'</tbody></table>';
}
async function copyText(t){try{await navigator.clipboard.writeText(t);toast('Copiado','En el portapapeles','success')}catch(e){toast('Copiar',e.message,'error')}}
async function testEmail(){try{toast('Email','Enviando…');const{error}=await sb.functions.invoke('send-email',{body:{type:'test',to:user.email,subject:'GULA test',html:'<h1>Test OK</h1><p>Edge function operativa.</p>'}});if(error)toast('Email',error.message,'error');else toast('Email','Enviado a '+user.email,'success')}catch(e){toast('Email',e.message,'error')}}

function activateTab(t){$$('.nav,.tab').forEach(el=>el.classList.remove('active'));document.querySelector('.nav[data-tab="'+t+'"]').classList.add('active');$(t).classList.add('active');setTimeout(()=>$$('.spark').forEach(c=>{const n=c.dataset.spark;drawSpark(n,metrics.map(r=>Number(r[n==='revenue'?'revenue':n==='optins'?'marketing_optins':n]||0)))}),60)}

function openCmdk(){$('cmdk').classList.remove('hidden');$('cmdkInput').value='';renderCmdk('');setTimeout(()=>$('cmdkInput').focus(),50)}
function closeCmdk(){$('cmdk').classList.add('hidden')}
function renderCmdk(q){
  q=(q||'').toLowerCase();
  const tabs=[['Overview','overview'],['Catálogo','catalog'],['Editor web','content'],['Club','club'],['Pedidos','orders'],['Delivery','delivery'],['Growth','growth'],['Sistema','settings']].map(([n,t])=>({label:n,cat:'Ir a',action:()=>activateTab(t)}));
  const prods=products.filter(p=>!p._combo).map(p=>({label:p.title,cat:'Producto',action:()=>{activateTab('catalog');openProduct(p.id)}}));
  const cmbos=combos.map(c=>({label:c.name,cat:'Combo',action:()=>{activateTab('catalog');const p=products.find(x=>x._combo&&x._combo.id===c.id);if(p)openProduct(p.id)}}));
  const mis=clubItems.map(it=>({label:it.title||it.slug||'(sin título)',cat:'Club',action:()=>{activateTab('club');clubSel=it.id;renderClubList();renderClubForm()}}));
  const items=[...tabs,...prods,...cmbos,...mis].filter(i=>!q||i.label.toLowerCase().includes(q)||i.cat.toLowerCase().includes(q)).slice(0,30);
  $('cmdkList').innerHTML=items.map((i,idx)=>'<div class="cmdk-item '+(idx===0?'sel':'')+'" data-idx="'+idx+'"><span>'+safe(i.label)+'</span><span class="cat">'+safe(i.cat)+'</span></div>').join('')||'<div class="empty">Sin resultados.</div>';
  $$('#cmdkList .cmdk-item').forEach(el=>el.onclick=()=>{items[Number(el.dataset.idx)].action();closeCmdk()});
  window._cmdkItems=items;
}

function bind(){
  $('loginBtn').onclick=handleLogin;$('resetBtn').onclick=handleReset;$('updatePasswordBtn').onclick=handleUpdatePassword;
  $('logoutBtn').onclick=async()=>{await sb.auth.signOut();location.reload()};
  $('refreshBtn').onclick=loadAll;
  $$('.nav').forEach(b=>b.onclick=()=>activateTab(b.dataset.tab));
  $$('[data-goto]').forEach(b=>b.onclick=()=>activateTab(b.dataset.goto));

  $('catSearch').oninput=renderCatalog;$('catFilter').onchange=renderCatalog;
  ['pbChannel','pbTicket','pbType','pbValue','pbMinOrder','pbMin','pbGift'].forEach(id=>{const el=$(id);if(!el)return;const fn=()=>{updateChannelHint();renderCatalog();renderTopProducts();computeAvgMargin();if($('pPnl'))renderPnl();if($('cmbResult'))renderComboPanel()};el.oninput=fn;el.onchange=fn});
  $$('.seg[data-view],.seg .seg-btn[data-view]').forEach(()=>{});
  $$('.seg-btn[data-view]').forEach(b=>b.onclick=()=>{$$('.seg-btn[data-view]').forEach(x=>x.classList.remove('active'));b.classList.add('active');if(b.dataset.view==='grid'){$('catalogGrid').classList.remove('hidden');$('catalogTable').classList.add('hidden')}else{$('catalogTable').classList.remove('hidden');$('catalogGrid').classList.add('hidden')}});
  $('newProductBtn').onclick=()=>openProduct();$('seedBtn').onclick=seedMenu;
  $('panelClose').onclick=closePanel;$('panel .panel-bg').onclick=closePanel;document.querySelector('.panel-bg').onclick=closePanel;

  if($('livePage'))$('livePage').onchange=loadBlocks;
  if($('visualPage'))$('visualPage').onchange=loadBlocks;
  if($('reloadIframeBtn'))$('reloadIframeBtn').onclick=reloadIframe;
  if($('newBlockBtn'))$('newBlockBtn').onclick=newBlock;
  if($('saveBlockBtn'))$('saveBlockBtn').onclick=saveBlock;
  if($('deleteBlockBtn'))$('deleteBlockBtn').onclick=deleteBlock;
  if($('syncBlocksBtn'))$('syncBlocksBtn').onclick=syncBlocks;
  if($('blockSearch'))$('blockSearch').oninput=renderBlocks;

  $$('.seg-btn[data-club]').forEach(b=>b.onclick=()=>{$$('.seg-btn[data-club]').forEach(x=>x.classList.remove('active'));b.classList.add('active');clubMode=b.dataset.club;clubSel=null;loadClub()});
  $('newClubItemBtn').onclick=newClubItem;

  if($('promoForm'))$('promoForm').onsubmit=savePromo;
  $$('[data-copy]').forEach(b=>b.onclick=()=>{const el=$(b.dataset.copy);copyText(el.dataset.real||el.textContent)});
  $$('[data-copy-text]').forEach(b=>b.onclick=()=>copyText(b.dataset.copyText));
  $$('[data-toggle]').forEach(b=>b.onclick=()=>{const el=$(b.dataset.toggle);const masked=el.dataset.secret==='1';el.textContent=masked?(el.dataset.real||''):'●●●●●●●●●●●●●●●●●●●●';el.dataset.secret=masked?'0':'1'});
  if($('testEmailBtn'))$('testEmailBtn').onclick=testEmail;

  $('cmdkBtn').onclick=openCmdk;
  document.addEventListener('keydown',e=>{
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('cmdk').classList.contains('hidden')?openCmdk():closeCmdk();return}
    if(e.key==='Escape'){if(!$('cmdk').classList.contains('hidden'))closeCmdk();else if($('panel').classList.contains('open'))closePanel();return}
    if(!$('cmdk').classList.contains('hidden')){
      const sel=document.querySelector('#cmdkList .sel');const all=$$('#cmdkList .cmdk-item');if(!all.length)return;
      const idx=Array.from(all).indexOf(sel);
      if(e.key==='ArrowDown'){e.preventDefault();sel&&sel.classList.remove('sel');(all[idx+1]||all[0]).classList.add('sel')}
      if(e.key==='ArrowUp'){e.preventDefault();sel&&sel.classList.remove('sel');(all[idx-1]||all[all.length-1]).classList.add('sel')}
      if(e.key==='Enter'){e.preventDefault();sel&&sel.click()}
    }
    if(e.altKey){const map={o:'overview',c:'catalog',e:'content',l:'club',p:'orders',g:'growth',',':'settings'};const t=map[e.key.toLowerCase()];if(t){e.preventDefault();activateTab(t)}}
  });
  $('cmdkInput').oninput=e=>renderCmdk(e.target.value);
  document.querySelector('.cmdk-bg').onclick=closeCmdk;

  if($('visualModeBtn'))$('visualModeBtn').onclick=initVisualEditor;
  if($('visualPreviewBtn'))$('visualPreviewBtn').onclick=toggleVisualPreview;
  if($('visualSave'))$('visualSave').onclick=saveVisualChanges;
  if($('visualPublish'))$('visualPublish').onclick=publishVisualChanges;
  if($('sidebarClose'))$('sidebarClose').onclick=()=>$('visualSidebar').classList.add('collapsed');
  $$('.tool-btn[data-tool]').forEach(b=>b.onclick=()=>{$$('.tool-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');currentTool=b.dataset.tool});
}

let currentTool='select',visualMode=false,selectedElement=null,visualChanges=[];

function initVisualEditor(){
  visualMode=true;
  const frame=$('visualFrame');
  if(!frame)return;
  $('visualOverlay').classList.add('active');
  try{
    const doc=frame.contentDocument||frame.contentWindow.document;
    doc.addEventListener('click',handleVisualClick,true);
    doc.addEventListener('mouseover',handleVisualHover,true);
    doc.addEventListener('mouseout',handleVisualOut,true);
  }catch(e){toast('Editor','No se puede acceder al iframe. Asegúrate de que sea del mismo dominio.','error')}
  toast('Editor','Modo edición activado. Click en elementos para editar.','success');
}
function toggleVisualPreview(){
  visualMode=!visualMode;
  const frame=$('visualFrame');
  if(!frame)return;
  if(visualMode){
    $('visualOverlay').classList.add('active');
    initVisualEditor();
  }else{
    $('visualOverlay').classList.remove('active');
    try{
      const doc=frame.contentDocument||frame.contentWindow.document;
      doc.removeEventListener('click',handleVisualClick,true);
      doc.removeEventListener('mouseover',handleVisualHover,true);
      doc.removeEventListener('mouseout',handleVisualOut,true);
    }catch(e){}
    toast('Editor','Modo vista previa activado','success');
  }
}
function handleVisualClick(e){
  if(!visualMode)return;
  e.preventDefault();
  e.stopPropagation();
  const el=e.target;
  if(!el||el.tagName==='HTML'||el.tagName==='BODY')return;
  selectVisualElement(el);
}
function handleVisualHover(e){
  if(!visualMode)return;
  const el=e.target;
  if(!el||el.tagName==='HTML'||el.tagName==='BODY')return;
  el.style.outline='2px solid var(--o)';
  el.style.outlineOffset='2px';
}
function handleVisualOut(e){
  if(!visualMode)return;
  const el=e.target;
  if(el)el.style.outline='';
}
function selectVisualElement(el){
  selectedElement=el;
  $('visualSidebar').classList.remove('collapsed');
  renderSidebarProperties(el);
}
function renderSidebarProperties(el){
  const content=$('sidebarContent');
  if(!content)return;
  const tagName=el.tagName.toLowerCase();
  const computed=getComputedStyle(el);
  content.innerHTML=`<div class="sidebar-section"><div class="sidebar-section-title">Elemento</div><div class="sidebar-field"><label>Tag</label><input value="${tagName}" readonly></div></div><div class="sidebar-section"><div class="sidebar-section-title">Contenido</div>${el.innerText?'<div class="sidebar-field"><label>Texto</label><textarea id="visText">${safe(el.innerText)}</textarea></div>':''}${el.src?'<div class="sidebar-field"><label>Imagen URL</label><input id="visSrc" value="${safe(el.src)}"></div>':''}${el.href?'<div class="sidebar-field"><label>Enlace URL</label><input id="visHref" value="${safe(el.href)}"></div>':''}</div><div class="sidebar-section"><div class="sidebar-section-title">Estilos</div><div class="sidebar-field"><label>Color texto</label><input id="visColor" type="color" value="${rgbToHex(computed.color)}"></div><div class="sidebar-field"><label>Tamaño fuente (px)</label><input id="visFontSize" type="number" value="${parseInt(computed.fontSize)||16}"></div></div><div class="row right"><button class="btn btn-primary btn-sm" onclick="applyVisualChanges()">Aplicar</button></div>`;
  if($('visText'))$('visText').oninput=()=>trackChange(el,'text',$('visText').value);
  if($('visSrc'))$('visSrc').oninput=()=>trackChange(el,'src',$('visSrc').value);
  if($('visHref'))$('visHref').oninput=()=>trackChange(el,'href',$('visHref').value);
}
function trackChange(el,type,value){
  visualChanges.push({element:el,type,value,timestamp:Date.now()});
}
function applyVisualChanges(){
  if(!selectedElement)return;
  const text=$('visText')?$('visText').value:null;
  const src=$('visSrc')?$('visSrc').value:null;
  const href=$('visHref')?$('visHref').value:null;
  const color=$('visColor')?$('visColor').value:null;
  const fontSize=$('visFontSize')?$('visFontSize').value:null;
  if(text)selectedElement.innerText=text;
  if(src)selectedElement.src=src;
  if(href)selectedElement.href=href;
  if(color)selectedElement.style.color=color;
  if(fontSize)selectedElement.style.fontSize=fontSize+'px';
  toast('Editor','Cambios aplicados visualmente','success');
}
async function saveVisualChanges(){
  if(!visualChanges.length){toast('Editor','Sin cambios para guardar','error');return}
  const page=$('visualPage').value;
  const changesToSave=visualChanges.map(c=>({page,block_key:generateBlockKey(c.element),block_type:'text',value:c.type==='text'?c.value:JSON.stringify({type:c.type,value:c.value}),active:true,updated_at:new Date().toISOString(),updated_by:user&&user.email}));
  const{error}=await sb.from('page_blocks').upsert(changesToSave,{onConflict:'page,block_key'});
  if(error){toast('Editor',error.message,'error');return}
  await audit('update','page_blocks',{count:changesToSave.length,page});
  toast('Editor',changesToSave.length+' cambios guardados','success');
  visualChanges=[];
}
async function publishVisualChanges(){
  await saveVisualChanges();
  reloadIframe();
  toast('Editor','Cambios publicados','success');
}
function generateBlockKey(el){
  const tag=el.tagName.toLowerCase();
  const classes=el.className?el.className.split(' ').slice(0,2).join('.'):'';
  const id=el.id?'#'+el.id:'';
  return `${tag}${classes?'.'+classes:''}${id}`.replace(/\s+/g,'');
}
function rgbToHex(rgb){
  if(!rgb||rgb==='transparent')return '#000000';
  const match=rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if(!match)return '#000000';
  const r=parseInt(match[1]).toString(16).padStart(2,'0');
  const g=parseInt(match[2]).toString(16).padStart(2,'0');
  const b=parseInt(match[3]).toString(16).padStart(2,'0');
  return '#'+r+g+b;
}

function bindPremiumActions(){
  if($('quickDock'))$('quickDock').classList.remove('hidden');
  $$('[data-quick]').forEach(b=>b.onclick=()=>{pulseEl(b);activateTab(b.dataset.quick)});
  $$('[data-quick-action]').forEach(b=>b.onclick=()=>{pulseEl(b);handleQuickAction(b.dataset.quickAction)});
  document.addEventListener('pointerdown',e=>{const btn=e.target.closest&&e.target.closest('button,.cat-card,.block-item,.cmdk-item,.nav');if(btn)pulseEl(btn)});
}
function pulseEl(el){
  el.classList.remove('is-pressed');
  void el.offsetWidth;
  el.classList.add('is-pressed');
  setTimeout(()=>el.classList.remove('is-pressed'),260);
}
function handleQuickAction(action){
  if(action==='new-product'){activateTab('catalog');openProduct();return}
  if(action==='refresh'){loadAll();toast('Panel','Datos actualizados','success');return}
}

sb.auth.onAuthStateChange(ev=>{if(ev==='PASSWORD_RECOVERY'){$('recoveryBox').classList.remove('hidden');$('loginMsg').innerHTML='<span style="color:#50f2a8">Introduce nueva contraseña.</span>'}});
document.addEventListener('DOMContentLoaded',async()=>{bind();bindPremiumActions();$$('[data-copy-text]').forEach(btn=>btn.onclick=()=>copyText(btn.dataset.copyText));if(await isAdmin())enterApp()});

// ============= UBER EATS DELIVERY =============
const UBER_ORDERS_FN=`${SUPABASE_URL}/functions/v1/uber-eats-orders`;

async function loadDelivery(){
  const stores=['742103f3-6a55-5738-86dd-9901b0f26beb','0e2beda7-e867-5f1f-a4f7-fc2a477559a4','46eadb60-99e8-5077-bd3e-0df76c71ccac','1b3e6cfe-0c98-5eda-89c6-079015067a1d'];
  const storeNames={['742103f3-6a55-5738-86dd-9901b0f26beb']:'Cartagena',['0e2beda7-e867-5f1f-a4f7-fc2a477559a4']:'Móstoles',['46eadb60-99e8-5077-bd3e-0df76c71ccac']:'Sevilla',['1b3e6cfe-0c98-5eda-89c6-079015067a1d']:'Valencia'};
  $('uberOrdersTable').innerHTML='<div class="skeleton-list"></div>';
  try{
    const headers={'Authorization':`Bearer ${SUPABASE_ANON_KEY}`,'Content-Type':'application/json'};
    const allRes=await Promise.all(stores.map(s=>fetch(`${UBER_ORDERS_FN}?endpoint=orders&store_id=${encodeURIComponent(s)}`,{headers})));
    const allData=await Promise.all(allRes.map(r=>r.json()));
    const allOrders=allData.flatMap((d,i)=>(d.orders||d.data||[]).map(o=>({...o,_store:storeNames[stores[i]]})));
    renderUberKpis(allOrders);
    renderUberOrders(allOrders);
    $('uberLastSync').textContent='Sync '+new Date().toLocaleTimeString('es-ES');
  }catch(e){
    $('uberOrdersTable').innerHTML=`<div class="empty" style="color:#ff4d4d">Error: ${safe(e.message)}</div>`;
    toast('Uber Eats',e.message,'error');
  }
}

function renderUberKpis(orders){
  const today=new Date().toISOString().slice(0,10);
  const todayOrders=orders.filter(o=>(o.placed_at||o.created_at||'').startsWith(today));
  const revenue=todayOrders.reduce((s,o)=>s+(Number(o.cart?.total_price?.total_amount||o.total_price||0)/100),0);
  const avg=todayOrders.length?revenue/todayOrders.length:0;
  $('uberOrdersToday').textContent=todayOrders.length||orders.length||'0';
  $('uberRevenueToday').textContent=revenue.toFixed(2)+'€';
  $('uberAvgTicket').textContent=avg.toFixed(2)+'€';
  $('uberStoreStatus').textContent='Todas activas';
  $('uberStoreStatus').style.color='#50f2a8';
}

function renderUberOrders(data){
  const orders=data?.orders||data?.data||data||[];
  if(!orders.length){$('uberOrdersTable').innerHTML='<div class="empty">Sin pedidos en sandbox.</div>';return}
  $('uberOrdersTable').innerHTML=`<table class="data-table"><thead><tr><th>Tienda</th><th>ID</th><th>Estado</th><th>Artículos</th><th>Total</th><th>Fecha</th></tr></thead><tbody>${
    orders.slice(0,30).map(o=>{
      const id=(o.id||o.order_id||'—').slice(-8);
      const status=o.current_state||o.status||'—';
      const items=(o.cart?.items||[]).length||(o.items||[]).length||'—';
      const total=((o.cart?.total_price?.total_amount||o.total_price||0)/100).toFixed(2)+'€';
      const date=new Date(o.placed_at||o.created_at||Date.now()).toLocaleString('es-ES',{month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'});
      const store=o._store||'—';
      return`<tr><td><span class="pill">${safe(store)}</span></td><td><code>…${safe(id)}</code></td><td><span class="pill">${safe(status)}</span></td><td>${safe(String(items))}</td><td>${safe(total)}</td><td>${safe(date)}</td></tr>`;
    }).join('')
  }</tbody></table>`;
}
