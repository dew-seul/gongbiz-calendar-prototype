/* ============ 샵 운영 설정 모달 ============ */
const cbSetting = document.getElementById('cbSetting');
const setDropdown = document.getElementById('setDropdown');
const shopMask = document.getElementById('shopMask');

/* 설정 드롭다운 토글 */
cbSetting.addEventListener('click',e=>{
  if(e.target.closest('.sd-item'))return;
  e.stopPropagation();
  setDropdown.classList.toggle('open');
});
document.addEventListener('click',()=>setDropdown.classList.remove('open'));

/* 드롭다운 → 모달 열기 (해당 그룹 첫 메뉴로) */
const GOTO = {business:'hours', staff:'work', display:'view'};
setDropdown.querySelectorAll('.sd-item').forEach(it=>{
  it.addEventListener('click',e=>{
    e.stopPropagation();
    setDropdown.classList.remove('open');
    openShopModal(GOTO[it.dataset.goto]);
  });
});

function openShopModal(pane){ shopMask.classList.add('open'); selectPane(pane||'hours'); }
function closeShopModal(){ shopMask.classList.remove('open'); }
document.getElementById('shopClose').addEventListener('click',closeShopModal);
shopMask.addEventListener('click',e=>{ if(e.target===shopMask)closeShopModal(); });

/* 좌측 내비 ↔ 콘텐츠 전환 */
const navBtns = document.querySelectorAll('.smn-btn');
const panes = document.querySelectorAll('.smc-pane');
function selectPane(name){
  navBtns.forEach(b=>b.classList.toggle('is-active',b.dataset.pane===name));
  panes.forEach(p=>p.classList.toggle('is-active',p.dataset.pane===name));
}
navBtns.forEach(b=>b.addEventListener('click',()=>selectPane(b.dataset.pane)));

/* ===== 영업 요일·시간 콘텐츠 ===== */
const chev = '<span class="chev">▼</span>';
function selBox(text){ return `<div class="selbox"><span>${text}</span>${chev}</div>`; }

// data: on/off, 영업시간, 휴게(null=없음, {s,e}=설정됨)
const DAYS = [
  {d:'월요일', on:true,  s:'오전 6:40', e:'오후 12:00', brk:{s:'오전 9:00', e:'오후 12:00'}},
  {d:'화요일', on:true,  s:'오전 6:40', e:'오후 12:00', brk:null},
  {d:'수요일', on:false, s:'시작',     e:'종료',       brk:null},
  {d:'목요일', on:true,  s:'오전 6:40', e:'오후 12:00', brk:null},
  {d:'금요일', on:true,  s:'오전 6:40', e:'오후 12:00', brk:null},
  {d:'토요일', on:true,  s:'오전 6:40', e:'오후 12:00', brk:null},
  {d:'일요일', on:true,  s:'오전 6:40', e:'오후 12:00', brk:null},
];

function breakHtml(brk){
  if(brk){
    return `<div class="break-box" data-break>
      <div class="bb-row">
        <span class="bb-label">휴게 시간</span>
        <span class="bb-actions"><span class="ba" data-brk-del>삭제</span><span class="bdiv"></span><span class="ba">모든 영업일 적용</span></span>
      </div>
      <div class="bb-times">${selBox(brk.s)}<span class="tilde">~</span>${selBox(brk.e)}</div>
    </div>`;
  }
  return `<div class="break-box collapsed" data-break>
      <span class="bb-label">휴게 시간</span>
      <span class="bb-add" data-brk-add>＋ 추가</span>
    </div>`;
}
function dayHtml(day,i){
  return `<div class="dayblock ${day.on?'':'is-off'}" data-day="${i}">
    <div class="db-head">
      <span class="db-label">${day.d}</span>
      <span class="tg ${day.on?'':'off'}" data-tg></span>
    </div>
    <div class="db-times">${selBox(day.s)}<span class="tilde">~</span>${selBox(day.e)}</div>
    ${breakHtml(day.brk)}
  </div>`;
}
function renderHours(){
  document.getElementById('paneHours').innerHTML = DAYS.map(dayHtml).join('');
  // 토글
  document.querySelectorAll('#paneHours [data-tg]').forEach(tg=>tg.addEventListener('click',()=>{
    const block=tg.closest('.dayblock');
    const on=tg.classList.contains('off');
    tg.classList.toggle('off',!on);
    block.classList.toggle('is-off',!on);
  }));
  // 휴게 추가/삭제
  document.querySelectorAll('#paneHours [data-brk-add]').forEach(a=>a.addEventListener('click',()=>{
    const block=a.closest('.dayblock'); const box=a.closest('[data-break]');
    box.outerHTML = breakHtml({s:'오전 9:00', e:'오후 12:00'});
    bindBreak(block);
  }));
  document.querySelectorAll('#paneHours [data-brk-del]').forEach(bindDel);
}
function bindBreak(block){
  block.querySelectorAll('[data-brk-del]').forEach(bindDel);
  block.querySelectorAll('[data-brk-add]').forEach(a=>a.addEventListener('click',()=>{
    const box=a.closest('[data-break]');
    box.outerHTML = breakHtml({s:'오전 9:00', e:'오후 12:00'});
    bindBreak(block);
  }));
}
function bindDel(b){
  b.addEventListener('click',()=>{
    const block=b.closest('.dayblock'); const box=b.closest('[data-break]');
    box.outerHTML = breakHtml(null);
    bindBreak(block);
  });
}

/* ===== 임시 영업일 콘텐츠 (모달 내) ===== */
const T_YEAR=2025, T_DOW=['일','월','화','수','목','금','토'];
const T_FIRST_DOW=6, T_DIM=30, T_REG_OFF=[1]; // 월요일 정기휴무
const T_STAFF=[
  {n:'공대남',c:'#227EFF'},
  {n:'김직원이',c:'#9B7CFF'},
  {n:'박실장',c:'#1DC9B7'},
  {n:'이디자이너',c:'#FF6B6B'},
];
const tempOpen = [{day:17, s:'10:00', e:'18:00', staff:[0,1]}];
const twd=(d)=>(T_FIRST_DOW+(d-1))%7;
function staffLabel(arr){
  if(!arr||!arr.length)return '담당자 미지정';
  const names=arr.map(i=>T_STAFF[i].n);
  return names.length>1?`${names[0]} 외 ${names.length-1}명`:names[0];
}
const tOff=(d)=>T_REG_OFF.includes(twd(d));
const tIsOpen=(d)=>tempOpen.some(t=>t.day===d);
let tEditing=null; // {day, s, e} 편집중인 날짜

// 시간 옵션(06:00~22:00, 30분) — 값 "HH:MM", 표시 "오전/오후 h:mm"
const TIME_OPTS=(()=>{const a=[];for(let h=6;h<=22;h++){['00','30'].forEach(m=>a.push(`${String(h).padStart(2,'0')}:${m}`));}return a;})();
function fmtKo(v){const[h,m]=v.split(':').map(Number);const ap=h<12?'오전':'오후';const hh=h<=12?h:h-12;return `${ap} ${hh}:${String(m).padStart(2,'0')}`;}
function timeSelect(id,val){
  return `<select class="t-sel" id="${id}">`+TIME_OPTS.map(v=>`<option value="${v}" ${v===val?'selected':''}>${fmtKo(v)}</option>`).join('')+`</select>`;
}

function editorHtml(){
  if(!tEditing)return '';
  const isEdit=tIsOpen(tEditing.day);
  return `<div class="tbd-editor">
    <div class="te-head">
      <div class="te-date"><b>2025. 11. ${tEditing.day}</b> <span class="te-dow">(${T_DOW[twd(tEditing.day)]})</span>
        <span class="te-tag">${tOff(tEditing.day)?'정기 휴무':'휴무일'}</span></div>
    </div>
    <div class="te-field">
      <div class="te-label">영업시간 <span style="color:#f03e3e">*</span></div>
      <div class="te-times">${timeSelect('teStart',tEditing.s)}<span class="tilde">~</span>${timeSelect('teEnd',tEditing.e)}</div>
    </div>
    <div class="te-field">
      <div class="te-label">담당자 <span style="color:#f03e3e">*</span></div>
      <div class="te-staff">${T_STAFF.map((s,i)=>`<span class="staff-chip ${tEditing.staff.includes(i)?'sel':''}" data-staff="${i}"><span class="sd" style="background:${s.c}"></span>${s.n}</span>`).join('')}</div>
    </div>
    <div class="te-actions">
      <button class="te-cancel" data-te-cancel>취소</button>
      <button class="te-save" data-te-save>${isEdit?'수정 완료':'추가'}</button>
    </div>
  </div>`;
}

function renderTemp(){
  const pane=document.getElementById('paneTemp');
  let cells='';
  T_DOW.forEach((w,i)=>cells+=`<div class="mm-wd ${i===0?'sun':i===6?'sat':''}">${w}</div>`);
  const arr=[];
  for(let d=26;d<=31;d++)arr.push({n:d,o:true});
  for(let d=1;d<=T_DIM;d++)arr.push({n:d,o:false});
  let nd=1; while(arr.length<42)arr.push({n:nd++,o:true});
  arr.forEach(c=>{
    if(c.o){cells+=`<div class="mm-cell other"><span class="mm-n">${c.n}</span></div>`;return;}
    const selected = tEditing && tEditing.day===c.n;
    if(tIsOpen(c.n)){
      const t=tempOpen.find(x=>x.day===c.n);
      cells+=`<div class="mm-cell open ${selected?'sel':''}" data-edit="${c.n}"><span class="mm-n">${c.n}</span><span class="mm-badge">${fmtKo(t.s).replace('오전 ','').replace('오후 ','')}~</span></div>`;
    } else if(tOff(c.n)){
      cells+=`<div class="mm-cell off ${selected?'sel':''}" data-open="${c.n}"><span class="mm-n">${c.n}</span><span class="mm-tag">휴무</span></div>`;
    } else {
      cells+=`<div class="mm-cell"><span class="mm-n">${c.n}</span></div>`;
    }
  });
  const list = tempOpen.length
    ? tempOpen.slice().sort((a,b)=>a.day-b.day).map(t=>`
        <div class="tbd-mini-item">
          <div><div class="tmi-l"><b>2025. 11. ${t.day}</b> (${T_DOW[twd(t.day)]})</div>
          <div class="tmi-meta">🕒 ${fmtKo(t.s)} ~ ${fmtKo(t.e)} · 👤 ${staffLabel(t.staff)}</div></div>
          <div class="tmi-btns"><span class="tmi-edit" data-edit="${t.day}">수정</span><span class="tmi-del" data-del="${t.day}">삭제</span></div>
        </div>`).join('')
    : `<div class="pane-ph" style="padding:24px">등록된 임시 영업일이 없어요.</div>`;

  pane.innerHTML=`
    <div class="tbd-info">💡 <span>정기 휴무·공휴일이라도 임시 영업일로 지정하면, 휴무 설정을 해제하지 않고도 그 날짜만 <b>네이버 예약 + 공비서 캘린더</b>에 예약 가능으로 노출됩니다.</span></div>
    <div>
      <div class="tbd-cal-head">
        <div class="tch-left"><button class="nav-arrow">‹</button><span class="tch-title">2025. 11</span><button class="nav-arrow">›</button></div>
        <div class="tbd-legend">
          <span class="lg"><span class="sw" style="background:repeating-linear-gradient(45deg,#ECEDEF 0,#ECEDEF 4px,#F6F7F8 4px,#F6F7F8 8px);border:1px solid #DFE0E1"></span>휴무일</span>
          <span class="lg"><span class="sw" style="background:#ECF3FF;border:1px solid #BDD8FF"></span>임시 영업일</span>
        </div>
      </div>
      <div class="mini-month">${cells}</div>
      <p style="font-size:12px;color:#9fa1a4;margin-top:10px">※ 빗금 표시된 휴무일을 클릭하면 영업시간을 지정해 임시 영업일로 등록할 수 있어요.</p>
    </div>
    ${editorHtml()}
    <div>
      <div style="font-size:14px;font-weight:700;margin-bottom:10px">등록된 임시 영업일 <span style="color:#227eff">${tempOpen.length}</span></div>
      <div class="tbd-mini-list">${list}</div>
    </div>`;

  // 휴무일 클릭 → 편집기 오픈(추가)
  pane.querySelectorAll('[data-open]').forEach(c=>c.addEventListener('click',()=>{
    tEditing={day:+c.dataset.open, s:'10:00', e:'18:00', staff:[0]}; renderTemp(); scrollEditor();
  }));
  // 등록된 날짜/리스트 수정
  pane.querySelectorAll('[data-edit]').forEach(c=>c.addEventListener('click',()=>{
    const d=+c.dataset.edit; const t=tempOpen.find(x=>x.day===d);
    tEditing={day:d, s:t?t.s:'10:00', e:t?t.e:'18:00', staff:t?[...t.staff]:[0]}; renderTemp(); scrollEditor();
  }));
  // 삭제
  pane.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',()=>{
    const d=+b.dataset.del; const i=tempOpen.findIndex(t=>t.day===d); if(i>-1)tempOpen.splice(i,1);
    if(tEditing&&tEditing.day===d)tEditing=null;
    renderTemp();
  }));
  // 편집기 동작
  const cancel=pane.querySelector('[data-te-cancel]'); if(cancel)cancel.addEventListener('click',()=>{tEditing=null;renderTemp();});
  const save=pane.querySelector('[data-te-save]'); if(save)save.addEventListener('click',()=>{
    const s=pane.querySelector('#teStart').value, e=pane.querySelector('#teEnd').value;
    if(e<=s){ alert('종료 시간은 시작 시간보다 늦어야 해요.'); return; }
    if(!tEditing.staff.length){ alert('담당자를 1명 이상 선택해 주세요.'); return; }
    const i=tempOpen.findIndex(t=>t.day===tEditing.day);
    const rec={day:tEditing.day,s,e,staff:[...tEditing.staff]};
    if(i>-1)tempOpen[i]=rec; else tempOpen.push(rec);
    tEditing=null; renderTemp();
  });
  // 담당자 칩 토글
  pane.querySelectorAll('[data-staff]').forEach(ch=>ch.addEventListener('click',()=>{
    const i=+ch.dataset.staff; const arr=tEditing.staff;
    const at=arr.indexOf(i);
    if(at>-1)arr.splice(at,1); else arr.push(i);
    ch.classList.toggle('sel');
  }));
  // 셀렉트 변경 시 tEditing 동기화(재렌더 없이)
  const ss=pane.querySelector('#teStart'), ee=pane.querySelector('#teEnd');
  if(ss)ss.addEventListener('change',()=>tEditing.s=ss.value);
  if(ee)ee.addEventListener('change',()=>tEditing.e=ee.value);
}
function scrollEditor(){ const ed=document.querySelector('.tbd-editor'); if(ed)ed.scrollIntoView({block:'nearest',behavior:'smooth'}); }

renderHours();
renderTemp();

/* 미리보기용 deep-link */
(function(){
  const h=location.hash;
  if(h.startsWith('#shop')){
    const pane=h.split(':')[1]||'hours';
    if(h.includes('edit')){ tEditing={day:3,s:'10:00',e:'18:00',staff:[0]}; renderTemp(); }
    openShopModal(pane);
  }
  if(h==='#dd'){ setDropdown.classList.add('open'); }
})();
