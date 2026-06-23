/* ============ View tabs ============ */
const tabs = document.querySelectorAll('.cb-tab');
const views = {
  month: document.getElementById('view-month'),
  week:  document.getElementById('view-week'),
  day:   document.getElementById('view-day'),
  list:  document.getElementById('view-list'),
};
tabs.forEach(t=>t.addEventListener('click',()=>{
  tabs.forEach(x=>x.classList.remove('is-active'));
  t.classList.add('is-active');
  Object.values(views).forEach(v=>v.classList.remove('is-active'));
  views[t.dataset.view].classList.add('is-active');
}));

/* ============ Hours model ============ */
const HOURS = [7,8,9,10,11,12,13,14,15,16,17,18,19,20,21];
const HOUR_PX = 120;
const fmtHour = h => {
  const ap = h < 12 ? '오전' : '오후';
  const hh = h <= 12 ? h : h - 12;
  return `${ap} ${hh}:00`;
};
const yOf = h => (h - HOURS[0]) * HOUR_PX;

/* ============ MONTH VIEW ============ */
// 임시 영업일 pane(shop-setting.js)과 동일 기준 데이터 — 정기휴무: 월요일, 임시영업: 11/17
const M_TODAY = 9;
const M_REG_OFF_COL = 1;                 // 월요일 정기휴무
// 임시영업: { 일: {s,e,staff[]} } — 캘린더에서 직접 추가/수정/삭제
// 24=등록된 예시(월 뷰), 17=미설정 휴무로 비워 주 뷰에서 설정 시연
const M_TEMP_OPEN = { 24:{s:'10:00', e:'18:00', staff:[0,1]} };
const M_PAL=['#227EFF','#9B7CFF','#1DC9B7','#FF6B6B','#FFB020','#2BB0ED','#E64980','#7048E8','#12B886','#FA5252'];
const M_NAMES=['공대남','김직원이','박실장','이디자이너','최원장','정수석','강매니저','윤디자','임실장','한선생',
  '오대리','서디자','신매니','권원장','황실장','안수석','송디자','전매니','홍선생','문대리','양실장','구디자','배수석','조매니'];
const M_STAFF = M_NAMES.map((n,i)=>({n, c:M_PAL[i%M_PAL.length]})); // 24명 — 다인원 사용성 검증용
const M_TIME_OPTS=(()=>{const a=[];for(let h=6;h<=22;h++){['00','30'].forEach(m=>a.push(`${String(h).padStart(2,'0')}:${m}`));}return a;})();
const mFmtKo=v=>{const[h,m]=v.split(':').map(Number);const ap=h<12?'오전':'오후';const hh=h<=12?h:h-12;return `${ap} ${hh}:${String(m).padStart(2,'0')}`;};

function renderMonth(){
  const wdWrap = document.getElementById('monthWeekdays');
  if(!wdWrap.childElementCount){
    ['일','월','화','수','목','금','토'].forEach((d,i)=>{
      const s=document.createElement('span'); s.textContent=d;
      if(i===0)s.className='sun'; if(i===6)s.className='sat';
      wdWrap.appendChild(s);
    });
  }
  // 2025.11 — Nov 1 2025 is Saturday => grid starts Sun Oct 26
  const grid=document.getElementById('monthGrid');
  grid.innerHTML='';
  const cells=[];
  for(let d=26; d<=31; d++) cells.push({n:d,other:true});
  for(let d=1; d<=30; d++) cells.push({n:d,other:false});
  let nd=1; while(cells.length<42){cells.push({n:nd++,other:true});}
  cells.forEach((c,i)=>{
    const col=i%7;
    const el=document.createElement('div');
    el.className='mcell';
    if(c.other)el.classList.add('other');
    if(col===0)el.classList.add('sun');
    if(col===6)el.classList.add('sat');
    if(!c.other && c.n===M_TODAY)el.classList.add('today');

    const open = !c.other && M_TEMP_OPEN[c.n];
    const isOff  = !c.other && !open && col===M_REG_OFF_COL;
    let html=`<span class="dnum">${c.n}</span>`;

    if(open){
      // 임시 영업일 — 휴무지만 그날만 온라인 예약 노출. 클릭 시 수정/삭제
      el.classList.add('openday','openable');
      const t=mFmtKo(open.s).replace('오전 ','').replace('오후 ','');
      html+=`<div class="open-badge">임시영업 ${t}~</div>`;
      el.dataset.tempDay=c.n;
    } else if(isOff){
      // 정기휴무 — 미래는 임시영업(온라인 예약 열기) 가능
      el.classList.add('off');
      if(c.n>=M_TODAY) el.dataset.offDay=c.n;
      html+=`<span class="off-tag">휴무</span>`;
    }
    if(!c.other && c.n===12){
      html+=`<div class="ev"><span class="ev-dot"></span><span class="ev-time">오전 8:00</span><span>김고객</span></div>`;
    }
    el.innerHTML=html;
    // 모든 날짜 칸 클릭 → 액션 시트(실제 제품 동선)
    if(!c.other){
      el.classList.add('clickable');
      el.addEventListener('click',e=>{
        e.stopPropagation();
        const day=c.n, off=(col===M_REG_OFF_COL);
        if(M_TEMP_OPEN[day]){
          if(e.target.closest('.open-badge')) openTempPop(el, day, true); // 뱃지=바로 수정
          else openDaySheet(el, day, 'open');                            // 빈칸=시트
        }
        else if(off && day>=M_TODAY) openDaySheet(el, day, 'off');    // 미래 휴무
        else if(off)                 openDaySheet(el, day, 'offpast'); // 지난 휴무
        else                         openDaySheet(el, day, 'biz');    // 영업일
      });
    }
    grid.appendChild(el);
  });
}
renderMonth();
// 임시영업 변경 시 월·주 뷰 동시 갱신
function refreshViews(){ renderMonth(); renderWeek(); }

/* 토스트(예약 등록 등 스텁) */
let toastT=null;
function showToast(msg){
  let t=document.getElementById('mToast');
  if(!t){ t=document.createElement('div'); t.id='mToast'; t.className='m-toast'; document.body.appendChild(t); }
  t.textContent=msg; t.classList.add('show');
  if(toastT)clearTimeout(toastT);
  toastT=setTimeout(()=>t.classList.remove('show'),2200);
}

function stubBooking(day,what){ showToast(`11월 ${day}일 ${what} (프로토타입 범위 외)`); }
const mDow=day=>['일','월','화','수','목','금','토'][(6+(day-1))%7];

/* 날짜 액션 항목 구성(월 시트·주 드롭다운 공용). withEdit=주 뷰는 메뉴에 수정 포함 */
function dayItems(cell, day, kind, withEdit){
  const items=[{ico:'＋', txt:'예약 등록', act:()=>stubBooking(day,'예약 등록 화면')}];
  if(kind==='biz')
    items.push({ico:'⊘', txt:'예약 막기', act:()=>stubBooking(day,'예약 막기')});
  else if(kind==='off')
    items.push({ico:'🟢', txt:'임시 영업일로 설정', hl:true, keep:true, act:()=>openTempPop(cell,day,false)});
  else if(kind==='open'){
    if(withEdit) items.push({ico:'🟢', txt:'임시 영업일 수정', hl:true, keep:true, act:()=>openTempPop(cell,day,true)});
    items.push({ico:'⊗', txt:'임시 영업일 해제', keep:true, act:()=>{ delete M_TEMP_OPEN[day]; closeFloaters(); refreshViews(); showToast(`11월 ${day}일 임시 영업일을 해제했어요`); }});
  }
  items.push({ico:'📅', txt:'일정 상세보기', act:()=>stubBooking(day,'일정 상세')});
  return items;
}

/* ===== 월 뷰: 날짜 칸 클릭 → 딤 + 중앙 액션 시트 ===== */
function openDaySheet(cell, day, kind){
  closeFloaters();
  const items=dayItems(cell, day, kind, false); // 월: 수정은 뱃지 클릭이 담당
  mMenu=document.createElement('div');
  mMenu.className='sheet-mask';
  const sheet=document.createElement('div');
  sheet.className='day-sheet';
  sheet.addEventListener('click',e=>e.stopPropagation());
  sheet.innerHTML=`<div class="ds-chip">2025. 11. ${day} (${mDow(day)}요일)</div>`+
    items.map((it,i)=>`<button class="ds-btn ${it.hl?'hl':''}" data-i="${i}">
      <span class="ds-ico">${it.ico}</span>${it.txt}${it.sub?`<span class="ds-sub">${it.sub}</span>`:''}</button>`).join('');
  mMenu.appendChild(sheet);
  document.body.appendChild(mMenu);
  items.forEach((it,i)=>sheet.querySelector(`[data-i="${i}"]`).addEventListener('click',()=>{
    if(!it.keep) closeFloaters();
    it.act();
  }));
}

/* ===== 주 뷰: 날짜 헤더 클릭 → 헤더 아래 앵커 드롭다운(딤 없음) ===== */
function openWeekMenu(anchor, day, kind){
  closeFloaters();
  const items=dayItems(anchor, day, kind, true); // 주: 메뉴에 수정 포함
  anchor.classList.add('menu-open');
  mMenu=document.createElement('div');
  mMenu.className='wk-menu';
  mMenu.addEventListener('click',e=>e.stopPropagation());
  mMenu.innerHTML=items.map((it,i)=>`<button class="wk-mi ${it.hl?'hl':''}" data-i="${i}"><span class="wk-ico">${it.ico}</span>${it.txt}</button>`).join('');
  document.body.appendChild(mMenu);
  const r=anchor.getBoundingClientRect(), mw=mMenu.offsetWidth;
  let left=r.left+r.width/2-mw/2;
  left=Math.min(Math.max(12,left), innerWidth-mw-12);
  mMenu.style.left=left+'px'; mMenu.style.top=(r.bottom+6)+'px';
  items.forEach((it,i)=>mMenu.querySelector(`[data-i="${i}"]`).addEventListener('click',()=>{ if(!it.keep)closeFloaters(); it.act(); }));
}

/* ===== 일 뷰: 직원 컬럼 헤더 클릭 → 드롭다운(직원 액션 + 임시영업) ===== */
function openDayStaffMenu(anchor, name){
  closeFloaters();
  const si=M_STAFF.findIndex(s=>s.n===name);
  // 담당자없음 또는 미매칭 → 전체 선택, 특정 직원 → 그 직원 기본 선택
  const preset = (name==='담당자없음' || si<0) ? M_STAFF.map((_,i)=>i) : si;
  const items=[
    {ico:'＋', txt:'예약 등록', act:()=>stubBooking(DAY_N,`${name} 예약 등록`)},
    {ico:'⊘', txt:'예약 막기', act:()=>stubBooking(DAY_N,`${name} 예약 막기`)},
    {ico:'👤', txt:'스케줄 설정', act:()=>stubBooking(DAY_N,`${name} 스케줄 설정`)},
    {ico:'📅', txt:'직원 색상 설정', act:()=>stubBooking(DAY_N,'직원 색상 설정')},
  ];
  if(M_TEMP_OPEN[DAY_N])
    items.push({ico:'🟢', txt:'임시 영업일 수정', hl:true, keep:true, act:()=>openTempPop(anchor,DAY_N,true)});
  else if(DAY_OFF)
    items.push({ico:'🟢', txt:'임시 영업일로 설정', hl:true, keep:true, act:()=>openTempPop(anchor,DAY_N,false, preset)});

  anchor.classList.add('menu-open');
  mMenu=document.createElement('div');
  mMenu.className='wk-menu';
  mMenu.addEventListener('click',e=>e.stopPropagation());
  mMenu.innerHTML=items.map((it,i)=>`<button class="wk-mi ${it.hl?'hl':''}" data-i="${i}"><span class="wk-ico">${it.ico}</span>${it.txt}</button>`).join('');
  document.body.appendChild(mMenu);
  const r=anchor.getBoundingClientRect(), mw=mMenu.offsetWidth;
  let left=r.left+r.width/2-mw/2;
  left=Math.min(Math.max(12,left), innerWidth-mw-12);
  mMenu.style.left=left+'px'; mMenu.style.top=(r.bottom+4)+'px';
  items.forEach((it,i)=>mMenu.querySelector(`[data-i="${i}"]`).addEventListener('click',()=>{ if(!it.keep)closeFloaters(); it.act(); }));
}

/* ===== 캘린더 인라인 임시 영업일 팝오버 ===== */
let mPop=null, mMenu=null, mDraft=null;
function closeFloaters(){
  if(mPop){mPop.remove();mPop=null;} if(mMenu){mMenu.remove();mMenu=null;} mDraft=null;
  document.querySelectorAll('.menu-open').forEach(d=>d.classList.remove('menu-open'));
}
document.addEventListener('click',closeFloaters);

function openTempPop(cell, day, isEdit, defStaff){
  closeFloaters();
  const cur = M_TEMP_OPEN[day];
  // 기본 담당자: 지정 없으면 전체, 배열이면 그대로, 숫자면 단일(직원 헤더 진입)
  const initStaff = defStaff==null ? M_STAFF.map((_,i)=>i)
                  : Array.isArray(defStaff) ? [...defStaff] : [defStaff];
  mDraft = isEdit
    ? {day, s:cur.s, e:cur.e, staff:[...cur.staff]}
    : {day, s:'10:00', e:'18:00', staff:initStaff};
  const dow=['일','월','화','수','목','금','토'][(6+(day-1))%7];
  const tag = (M_REG_OFF_COL===((6+(day-1))%7)) ? '정기 휴무' : '휴무일';

  mPop=document.createElement('div');
  mPop.className='cal-mask';
  const pop=document.createElement('div');
  pop.className='cal-pop';
  pop.addEventListener('click',e=>e.stopPropagation());
  const timeSel=(id,val)=>`<select id="${id}" class="cp-sel">`+
    M_TIME_OPTS.map(v=>`<option value="${v}" ${v===val?'selected':''}>${mFmtKo(v)}</option>`).join('')+`</select>`;
  pop.innerHTML=`
    <div class="cp-head">
      <div>
        <div class="cp-title">임시 영업일 ${isEdit?'수정':'설정'}</div>
        <div class="cp-date"><b>2025. 11. ${day}</b> (${dow}) <span class="cp-tag">${tag}</span></div>
      </div>
      <button class="cp-x" data-x>✕</button>
    </div>
    <div class="cp-note">이 날만 <b>네이버·공비서 온라인 예약</b>에 예약 가능으로 노출돼요.</div>
    <div class="cp-field">
      <div class="cp-label">영업시간 <span class="req">*</span></div>
      <div class="cp-times">${timeSel('cpS',mDraft.s)}<span class="cp-tilde">~</span>${timeSel('cpE',mDraft.e)}</div>
    </div>
    <div class="cp-field">
      <div class="cp-label">담당자 <span class="req">*</span></div>
      <div class="cp-msel">
        <button type="button" class="cp-trig" id="cpTrig"><span id="cpSum" class="cp-sum-ph">담당자 선택</span><span class="cp-caret">▾</span></button>
        <div class="cp-panel" id="cpPanel" hidden>
          <div class="cp-search"><input id="cpSearch" placeholder="담당자 이름 검색"><span class="cp-search-ico">🔍</span></div>
          <div class="cp-list" id="cpStaff"></div>
        </div>
      </div>
    </div>
    <div class="cp-actions">
      ${isEdit?'<button class="cp-del" data-del>삭제</button>':'<span></span>'}
      <div class="cp-right">
        <button class="cp-cancel" data-x>취소</button>
        <button class="cp-save" data-save>${isEdit?'수정 완료':'임시 영업일 등록'}</button>
      </div>
    </div>`;
  mPop.appendChild(pop);
  document.body.appendChild(mPop);

  mPop.querySelectorAll('[data-x]').forEach(b=>b.addEventListener('click',closeFloaters));
  // 담당자: 접이식 드롭다운 + 검색 + 체크리스트(다인원 대응, 단정)
  const trig=mPop.querySelector('#cpTrig'), panel=mPop.querySelector('#cpPanel'),
        sumEl=mPop.querySelector('#cpSum'), staffBox=mPop.querySelector('#cpStaff'), searchEl=mPop.querySelector('#cpSearch');
  function staffSummary(){
    const n=mDraft.staff.length;
    if(!n) return {t:'담당자 선택', ph:true};
    if(n===M_STAFF.length) return {t:`전체 ${n}명`, ph:false};
    const first=M_STAFF[[...mDraft.staff].sort((a,b)=>a-b)[0]].n;
    return {t: n>1?`${first} 외 ${n-1}명`:first, ph:false};
  }
  function renderStaff(){
    const f=(searchEl?.value||'').trim();
    const all=mDraft.staff.length===M_STAFF.length;
    const list=M_STAFF.map((s,i)=>({s,i})).filter(o=>!f||o.s.n.includes(f));
    let h=`<button type="button" class="cp-row cp-row-all ${all?'on':''}" data-all><span class="cp-rl">전체 ${M_STAFF.length}명</span><span class="cp-ck"></span></button>`;
    h+=list.map(({s,i})=>`<button type="button" class="cp-row ${mDraft.staff.includes(i)?'on':''}" data-staff="${i}"><span class="cp-rl"><span class="cp-sd" style="background:${s.c}"></span>${s.n}</span><span class="cp-ck"></span></button>`).join('')
      || `<div class="cp-empty">검색 결과 없음</div>`;
    staffBox.innerHTML=h;
    const sm=staffSummary(); sumEl.textContent=sm.t; sumEl.className=sm.ph?'cp-sum-ph':'';
  }
  trig.addEventListener('click',e=>{ e.stopPropagation(); panel.hidden=!panel.hidden; trig.classList.toggle('open',!panel.hidden); if(!panel.hidden&&searchEl)searchEl.focus(); });
  staffBox.addEventListener('click',e=>{
    if(e.target.closest('[data-all]')){
      mDraft.staff = (mDraft.staff.length===M_STAFF.length)?[]:M_STAFF.map((_,i)=>i);
      renderStaff(); return;
    }
    const r=e.target.closest('[data-staff]'); if(!r)return;
    const i=+r.dataset.staff, at=mDraft.staff.indexOf(i);
    if(at>-1)mDraft.staff.splice(at,1); else mDraft.staff.push(i);
    renderStaff();
  });
  if(searchEl)searchEl.addEventListener('input',renderStaff);
  renderStaff();
  mPop.querySelector('#cpS').addEventListener('change',e=>mDraft.s=e.target.value);
  mPop.querySelector('#cpE').addEventListener('change',e=>mDraft.e=e.target.value);
  const del=mPop.querySelector('[data-del]');
  if(del)del.addEventListener('click',()=>{ delete M_TEMP_OPEN[day]; closeFloaters(); refreshViews(); });
  mPop.querySelector('[data-save]').addEventListener('click',()=>{
    if(mDraft.e<=mDraft.s){ alert('종료 시간은 시작 시간보다 늦어야 해요.'); return; }
    if(!mDraft.staff.length){ alert('담당자를 1명 이상 선택해 주세요.'); return; }
    M_TEMP_OPEN[day]={s:mDraft.s,e:mDraft.e,staff:[...mDraft.staff]};
    closeFloaters(); refreshViews();
  });
}

/* ============ TIME GRID builders ============ */
function buildGutter(elId){
  const g=document.getElementById(elId);
  HOURS.forEach((h,i)=>{
    const row=document.createElement('div');
    row.className='hour';
    if(i>0) row.innerHTML=`<span>${fmtHour(h)}</span>`;
    g.appendChild(row);
  });
}
function buildColumns(elId,count){
  const wrap=document.getElementById(elId);
  const cols=[];
  for(let c=0;c<count;c++){
    const col=document.createElement('div');
    col.className='tg-col';
    HOURS.forEach((h,i)=>{
      const hr=document.createElement('div');
      hr.className='hour';
      if(i===0) hr.classList.add('closed'); // pre-open hatched block
      col.appendChild(hr);
    });
    wrap.appendChild(col);
    cols.push(col);
  }
  return cols;
}
function addEventCard(col,{variant,start,end,name,desc,time,naver}){
  const card=document.createElement('div');
  card.className=`ev-card ev-card--${variant}`;
  card.style.top=yOf(start)+'px';
  card.style.height=(yOf(end)-yOf(start))+'px';
  card.innerHTML=`
    <div class="ev-name"><span class="ev-wlogo">W</span>${name}</div>
    <div class="ev-desc">${desc}</div>
    <div class="ev-time">${time}</div>
    ${naver?'<div class="ev-naver">N</div>':''}`;
  col.appendChild(card);
}
function addBlock(col,{start,end,label}){
  const b=document.createElement('div');
  b.className='ev-block';
  b.style.top=yOf(start)+'px';
  b.style.height=(yOf(end)-yOf(start))+'px';
  b.textContent=label;
  col.appendChild(b);
}

/* ============ WEEK VIEW ============ */
// 임시영업(11/17)이 보이는 주: 11.16(일)~11.22(토)
function renderWeek(){
  const WK=[16,17,18,19,20,21,22], WD=['일','월','화','수','목','금','토'];
  const head=document.getElementById('weekDayCols');
  head.innerHTML='<div class="gut"></div>';
  document.getElementById('weekGutter').innerHTML='';   // 재렌더 시 중복 방지
  document.getElementById('weekColumns').innerHTML='';
  const offCols=[];
  WK.forEach((n,i)=>{
    const el=document.createElement('div');
    const temp=M_TEMP_OPEN[n], off=(i===M_REG_OFF_COL)&&!temp;
    el.className='dc clickable '+(i===0?'sun':i===6?'sat':'')+(n===M_TODAY?' selected':'');
    if(temp)el.classList.add('dc-temp'); if(off){el.classList.add('dc-off'); offCols.push(i);}
    const tag = temp?`<span class="dc-tag temp">임시영업</span>` : off?`<span class="dc-tag off">휴무</span>`:'';
    el.innerHTML=`<span class="pill">11. ${n} ${WD[i]}</span>${tag}`;
    el.addEventListener('click',e=>{ e.stopPropagation();
      openWeekMenu(el, n, temp?'open':off?'off':'biz'); // 헤더 아래 드롭다운
    });
    head.appendChild(el);
  });
  buildGutter('weekGutter');
  const cols=buildColumns('weekColumns',7);
  offCols.forEach(i=>cols[i].classList.add('col-off'));   // 휴무 컬럼 빗금
  if(M_TEMP_OPEN[17]) cols[1].classList.add('col-temp');  // 임시영업 컬럼 강조
  // events
  addEventCard(cols[3],{
    variant:'blue',start:10,end:11,name:'김고객',
    desc:'손>젤네일 여름한정 디자인 및 스톤 추가외에도 이름이 길어질 경우 표시되는 방식은 이렇게 됩니다.',
    time:'오전 10:00 - 11:00',naver:true});

  buildMini('weekMini',{
    title:'2025.11', mode:'week', selectedRow:3, dayCircle:null,
    statTitle:'주간 일정 상세',
    stats:[['📅','예약','25 건'],['⊗','예약 취소','5 건'],['📍','노쇼','5 건'],['⊘','예약 막기','1 건']]
  });
}
renderWeek();

/* ============ DAY VIEW ============ */
// 일 뷰 기준일: 11.17(월) — 정기휴무 → 직원 헤더에서 임시 영업일 설정 시연
const DAY_N=17, DAY_OFF=((6+(DAY_N-1))%7)===M_REG_OFF_COL;
(function renderDay(){
  const staff=[
    {n:'담당자없음',c:'#B4B9C0'},{n:'공대남',c:'#227EFF'},{n:'김직원이',c:'#9B7CFF'},
    {n:'박실장',c:'#1DC9B7'},{n:'이디자이너',c:'#FF6B6B'},{n:'최원장',c:'#FFB020'},
    {n:'정수석',c:'#2BB0ED'},{n:'강매니저',c:'#E64980'},
  ];
  const head=document.getElementById('dayStaff');
  head.innerHTML='<div class="gut"></div>';
  staff.forEach(s=>{
    const el=document.createElement('div');
    el.className='st clickable';
    el.innerHTML=`<span class="sdot" style="background:${s.c}"></span>${s.n}`;
    el.addEventListener('click',e=>{ e.stopPropagation(); openDayStaffMenu(el, s.n); });
    head.appendChild(el);
  });
  buildGutter('dayGutter');
  const cols=buildColumns('dayColumns',8);
  if(DAY_OFF && !M_TEMP_OPEN[DAY_N]) cols.forEach(c=>c.classList.add('col-off')); // 휴무 → 컬럼 빗금
  addEventCard(cols[0],{
    variant:'blue',start:9,end:10,name:'김고객',
    desc:'손>젤네일 여름한정 디자인 및 스톤 추가외에도 이름이 길어질 경우 표시되는 방식',
    time:'오전 9:00 - 10:00',naver:true});
  addEventCard(cols[2],{
    variant:'purple',start:9,end:10,name:'김고객',
    desc:'손>젤네일 여름한정 디자인 및 스톤 추가외에도 이',
    time:'오전 9:00 - 10:00',naver:false});

  buildMini('dayMini',{
    title:'2025.11', mode:'day', selectedRow:3, dayCircle:17,
    statTitle:'일정 상세',
    stats:[['📅','예약','8 건'],['⊗','예약 취소','0 건'],['📍','노쇼','3 건'],['⊘','예약 막기','2 건']]
  });
  // Today 옆 버튼 — 직원 헤더 외 일반 진입(담당자 전체 default)
  const dBtn=document.getElementById('dayTempBtn');
  if(dBtn) dBtn.addEventListener('click',e=>{ e.stopPropagation(); openTempPop(dBtn, DAY_N, !!M_TEMP_OPEN[DAY_N], M_STAFF.map((_,i)=>i)); });
})();

/* ============ LIST VIEW ============ */
(function renderList(){
  // 상태: done(매출등록) noshow done-strike wait cancel block
  const ROWS=[
    {st:'done',  time:'오전 8:00 - 오전 9:00', dur:'1시간', label:'매출 등록', naver:true,
     cust:'홍길동 01012345678', staff:'김디자이너', svc:'손>젤제거', memo:'메모 없음', memoMuted:true},
    {st:'noshow', time:'오전 8:00 - 오전 9:00', dur:'1시간', label:'노쇼', strike:true,
     cust:'홍길동 01012345678', staff:'김디자이너', svc:'마용>젤제거', memo:'메모 없음', memoMuted:true},
    {st:'wait',  time:'오전 8:00 - 오전 9:00', dur:'1시간', label:'예약 대기', naver:true,
     cust:'홍길동 01012345678', staff:'김디자이너', svc:'예약서비스 예약 고객 가나라마사아자차가나라마사아자차가나라…', clamp:true},
    {st:'cancel', time:'오전 8:00 - 오전 9:00', dur:'1시간', label:'예약 취소', strike:true, muted:true,
     cust:'홍길동 01012345678 앵두 | 아바시나인 | 5kg', staff:'김디자이너', svc:'밤>젤제거',
     memo:'예약서비스 예약 고객 가나라마사아자차가나라마사아자차가나라…', clamp:true},
    {st:'block', time:'오전 8:00 - 오전 9:00', dur:'1시간', label:'예약 막기', muted:true,
     cust:'세미나 참여', staff:'공대남', svc:'7월 25일 뷰티 컨퍼런스 참여'},
  ];
  const naverBadge='<span class="lr-n">N</span>';
  document.getElementById('listRows').innerHTML = ROWS.map(r=>`
    <div class="lrow lrow--${r.st} ${r.muted?'is-muted':''} ${r.strike?'is-strike':''}">
      <span class="lr-bar"></span>
      <div class="lr-col lr-c1">
        <div class="lr-time">${r.time} <span class="lr-dur">(${r.dur})</span></div>
        <div class="lr-label">${r.label}${r.naver?naverBadge:''}</div>
      </div>
      <div class="lr-col lr-c2">
        <div class="lr-cust">${r.cust}</div>
        <div class="lr-staff">${r.staff}</div>
      </div>
      <div class="lr-col lr-c3">
        <div class="lr-svc ${r.clamp?'clamp':''}">${r.svc}</div>
        <div class="lr-memo ${r.memoMuted?'muted':''} ${r.clamp?'clamp':''}">${r.memo||''}</div>
      </div>
    </div>`).join('');

  buildMini('listMini',{
    title:'2025.11', mode:'day', selectedRow:3, dayCircle:17,
    statTitle:'일정 상세',
    stats:[['📅','예약','5 건'],['⊗','예약 취소','0 건'],['📍','노쇼','3 건'],['⊘','예약 막기','2 건']]
  });
  // Today 좌측 '임시 영업일 설정' 버튼 — 리스트는 클릭 대상이 없어 헤더에 배치
  const lcBtn=document.getElementById('lcTempBtn');
  if(lcBtn) lcBtn.addEventListener('click',e=>{ e.stopPropagation(); openTempPop(lcBtn, 17, !!M_TEMP_OPEN[17]); });
})();

/* ============ MINI CALENDAR ============ */
function buildMini(elId,opt){
  // hardcoded grid matching design (July). 6 rows x 7 cols
  const grid=[
    [26,27,28,29,30,1,2],
    [3,4,5,6,7,8,9],
    [10,11,12,13,14,15,16],
    [17,18,19,20,21,22,23],
    [24,25,26,27,28,29,30],
    [31,1,2,3,4,5,6],
  ];
  // which cells are "other month": row0 first 5 (26-30 prev), row5 last 6 (1-6 next)
  const isOther=(r,col)=> (r===0 && col<5) || (r===5 && col>0);
  const reds=[18,19,20]; // sample holiday markers
  // pseudo counts per in-month day
  const counts={};
  [2,3,4,5,1,2,3, 4,2,1,3,5,1,2, 3,12,5,1,2,4,2, 5,3,12,1,22,12, 2,11,5,4,2,1, 3,1,4,5,2,3].forEach((v,i)=>counts[i]=v);

  const wd=['일','월','화','수','목','금','토'];
  let html=`<div class="mini-head">
      <button>‹</button><div class="mtit">${opt.title}</div><button>›</button>
    </div>
    <div class="mini-weekdays">${wd.map((d,i)=>`<span class="${i===0?'sun':i===6?'sat':''}">${d}</span>`).join('')}</div>
    <div class="mini-grid ${opt.mode==='week'?'week-sel':''}">`;
  if(opt.mode==='week'){
    html+=`<div class="row-sel" style="top:${opt.selectedRow*52}px"></div>`;
  }
  let idx=0;
  grid.forEach((row,r)=>{
    row.forEach((n,col)=>{
      const other=isOther(r,col);
      const inWeek = opt.mode==='week' && r===opt.selectedRow;
      const dayCircle = opt.mode==='day' && r===opt.selectedRow && n===opt.dayCircle;
      let cls='mini-cell';
      if(other)cls+=' other';
      else if(reds.includes(n) && !inWeek)cls+=' sun-c';
      else if(col===0)cls+=' sun-c';
      else if(col===6)cls+=' sat-c';
      if(inWeek)cls+=' in-week';
      const cnt = other ? '' : (counts[idx]||'');
      const numHtml = dayCircle ? `<span class="num-wrap">${n}</span>` : n;
      html+=`<div class="${cls}${dayCircle?' day-sel':''}">
          <span class="cnt">${cnt}</span>${numHtml}</div>`;
      idx++;
    });
  });
  html+=`</div>
    <div class="mini-divider"></div>
    <div class="mini-sec-title">${opt.statTitle}</div>
    <div class="mini-stats">
      ${opt.stats.map(s=>`<div class="mini-stat"><span class="si">${s[0]}</span><span class="sl">${s[1]}</span><span class="sv">${s[2]}</span></div>`).join('')}
    </div>
    <div class="mini-foot">⌃ 접기</div>`;
  document.getElementById(elId).innerHTML=html;
}

/* deep-link to a view for previews: ?view=week , 임시영업 팝오버: ?pop=add|edit */
(function(){
  const q=new URLSearchParams(location.search);
  const v=q.get('view');
  if(v && views[v]){document.querySelector(`.cb-tab[data-view="${v}"]`)?.click();}
  const wk=q.get('wk'); // 주 헤더 드롭다운 미리보기: wk=17(휴무)|18(영업)
  if(wk){ document.querySelector('.cb-tab[data-view="week"]')?.click();
    setTimeout(()=>{ const dcs=[...document.querySelectorAll('#weekDayCols .dc')]; const idx=[16,17,18,19,20,21,22].indexOf(+wk); if(idx>=0)dcs[idx]?.click(); },0); }
  const ds=q.get('dstaff'); // 일 뷰 직원 헤더 메뉴 미리보기: dstaff=1(공대남 등)
  if(ds){ document.querySelector('.cb-tab[data-view="day"]')?.click();
    setTimeout(()=>document.querySelectorAll('#dayStaff .st')[+ds]?.click(),0); }
  const p=q.get('pop');  // 미리보기: add=휴무칸 시트, edit=임시영업칸 시트, biz=영업일 시트, editor=설정 모달
  if(p) setTimeout(()=>{
    if(p==='editor'||p==='staff'){ const c=document.querySelector('.mcell[data-off-day]'); if(c) openTempPop(c, +c.dataset.offDay, false); if(p==='staff') document.querySelector('#cpTrig')?.click(); return; }
    const sel = p==='edit' ? '.mcell[data-temp-day] .open-badge'
              : p==='biz'  ? '.mcell.clickable:not(.off):not(.openday)'
              : '.mcell[data-off-day]';
    document.querySelector(sel)?.click();
  },0);
})();

/* close naver toast */
document.querySelector('.nt-close').addEventListener('click',e=>{
  e.target.closest('.naver-toast').style.display='none';
});
