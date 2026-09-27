(() => {
  'use strict';
  const root = document.querySelector('.finder'); if (!root) return;
  const canvas = root.querySelector('#hallMap'), region = {value:'all'};
  const toggle = root.querySelector('#mapAvailable'), status = root.querySelector('#mapStatus');
  const panel = root.querySelector('#mapSelection');
  const labels = {preferred:'무빈소 우대',available:'무빈소 가능',crematory:'화장장'};
  const symbols = {preferred:'★',available:'●',crematory:'◆'};
  let records = [], available = [], availableLoaded = false, selected = null;
  let map, clusters = {}, markers = new Map(), popup, sequence = 0;
  const visible = () => [...records, ...available].filter(p => root.querySelector('[data-map-type="'+p.type+'"]').checked);
  const element = (tag, text, cls) => { const e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; };
  async function read(file) {
    const response = await fetch('/assets/hall-data/'+file+'.json', {cache:'no-cache'});
    if (!response.ok) throw Error('Data unavailable');
    const data = await response.json();
    if (!Array.isArray(data.places)) throw Error('Invalid data');
    return data.places;
  }
  function message(text) { canvas.replaceChildren(element('p',text)); }
  function detailLink(p) {
    if (!p.detailUrl) return null;
    const url = new URL(p.detailUrl, location.origin);
    return url.origin === location.origin && url.pathname.startsWith('/') ? url.href : null;
  }
  async function share(p, feedback) {
    const url = detailLink(p); if (!url) return;
    try {
      if (navigator.share) await navigator.share({title:p.name+' | 이별예식장',url});
      else { await navigator.clipboard.writeText(url); feedback.textContent = '상세페이지 주소를 복사했습니다.'; }
    } catch (e) { if (e.name !== 'AbortError') feedback.textContent = '공유할 주소: '+url; }
  }
  function select(p, fromList = false) {
    selected = p.id; panel.hidden = false; panel.replaceChildren();
    const close = element('button','닫기'); close.dataset.close = ''; close.type = 'button';
    close.onclick = () => { panel.hidden = true; selected = null; popup?.setMap(null); highlight(); };
    panel.append(close,element('small',labels[p.type]),element('h3',p.name),element('p',p.address));
    if (p.summary) panel.append(element('p',p.summary));
    if (p.type === 'crematory') {
      if (p.hours) panel.append(element('p','운영시간: '+p.hours));
      if (p.reservation) panel.append(element('p','예약 안내: '+p.reservation));
      if (Number.isInteger(p.furnaces)) panel.append(element('p','화장로: '+p.furnaces+'기'));
      if (p.phone && /^[0-9-]+$/.test(p.phone)) {
        const phone = element('a','전화 문의 '+p.phone); phone.href = 'tel:'+p.phone; panel.append(phone);
      }
      if (p.sourceUrl && /^https:\/\//.test(p.sourceUrl)) {
        const source = element('a','공식 시설 안내'); source.href = p.sourceUrl; source.target = '_blank'; source.rel = 'noopener'; panel.append(source);
      }
    }
    if (p.nearestCrematory) {
      const c = records.find(c => c.id === p.nearestCrematory.id);
      if (c) panel.append(element('p',`가장 가까운 화장장: ${c.name} (${p.nearestCrematory.distanceType === 'straight' ? '직선거리' : '도로거리'} ${p.nearestCrematory.distanceKm}km)`));
    }
    const url = detailLink(p);
    if (url) {
      const link = element('a','상세보기'); link.href = url;
      const button = element('button','공유'); button.type = 'button';
      const feedback = element('p'); feedback.setAttribute('role','status');
      button.onclick = () => share(p,feedback); panel.append(link,button,feedback);
    }
    const directions = element('a','길찾기');
    directions.href = `https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.lat},${p.lng}`;
    directions.target = '_blank'; directions.rel = 'noopener'; panel.append(directions);
    highlight();
    if (map) {
      const point = new kakao.maps.LatLng(p.lat,p.lng);
      map.setLevel(5); map.panTo(point); popup?.setMap(null);
      const content = element('div',p.name); content.style.cssText = 'padding:8px 12px;background:white;border:1px solid #294238;border-radius:8px;font-size:14px;white-space:nowrap';
      popup = new kakao.maps.CustomOverlay({position:point,content,yAnchor:2.5,map});
    }
    if (fromList) canvas.scrollIntoView({behavior:'smooth',block:'center'});
  }
  function highlight() {
    root.querySelectorAll('[data-place-id]').forEach(li => li.classList.toggle('is-selected',li.dataset.placeId === selected));
  }
  function render() {
    const rows = visible();
    status.textContent = ['preferred','available','crematory'].map(type=>labels[type]+' '+rows.filter(p=>p.type===type).length+'곳').join(' · ');
    root.querySelectorAll('[data-place-id]').forEach(li => { li.hidden = region.value !== 'all' && li.dataset.region !== region.value; });
    for (const type of ['preferred','crematory']) { const empty = root.querySelector('#'+type+'Empty'); if (empty) empty.hidden = !records.some(p=>p.type===type) || rows.some(p=>p.type===type); }
    if (!rows.some(p=>p.id===selected)) { selected=null; panel.hidden=true; popup?.setMap(null); }
    highlight();
    if (!map) return;
    for (const c of Object.values(clusters)) c.clear();
    markers.clear();
    const bounds = new kakao.maps.LatLngBounds();
    for (const p of rows) {
      const position = new kakao.maps.LatLng(p.lat,p.lng);
      const colors = {preferred:'#98732d',available:'#315749',crematory:'#436b86'};
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="42"><rect x="1" y="1" width="34" height="34" rx="${p.type==='crematory'?3:17}" fill="${colors[p.type]}" stroke="white" stroke-width="2"/><text x="18" y="25" text-anchor="middle" fill="white" font-size="22">${symbols[p.type]}</text><path d="M13 34L18 41L23 34" fill="${colors[p.type]}"/></svg>`;
      const crematory = p.type === 'crematory';
      const marker = new kakao.maps.Marker({position,title:p.name,image:new kakao.maps.MarkerImage(crematory ? '/assets/crematory-marker.svg' : 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg),new kakao.maps.Size(crematory ? 26 : 36,crematory ? 32 : 42),{offset:new kakao.maps.Point(crematory ? 13 : 18,crematory ? 31 : 41)})});
      kakao.maps.event.addListener(marker,'click',()=>select(p)); markers.set(p.id,marker); bounds.extend(position);
    }
    for (const type of Object.keys(clusters)) clusters[type].addMarkers(rows.filter(p=>p.type===type).map(p=>markers.get(p.id)));
    if (rows.length) map.setBounds(bounds);
  }
  async function loadMap() {
    const key = window.HALL_MAP_CONFIG?.javascriptKey;
    if (!key) { message('지도를 준비하고 있습니다. 잠시만 기다려 주세요.'); return; }
    try {
      await new Promise((resolve,reject) => {
        const timeout=setTimeout(()=>reject(Error('Map timeout')),12000);
        const script=document.createElement('script');
        script.src='https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&libraries=clusterer&appkey='+encodeURIComponent(key);
        script.onerror=()=>{clearTimeout(timeout);reject(Error('Map unavailable'));};
        script.onload=()=>{if(!window.kakao?.maps){clearTimeout(timeout);reject(Error('Map unavailable'));return;} kakao.maps.load(()=>{clearTimeout(timeout);resolve();});};
        document.head.append(script);
      });
      canvas.replaceChildren();
      map=new kakao.maps.Map(canvas,{center:new kakao.maps.LatLng(37.5,126.98),level:10});
      map.addControl(new kakao.maps.ZoomControl(),kakao.maps.ControlPosition.RIGHT);
      for(const type of ['preferred','available','crematory']) clusters[type]=new kakao.maps.MarkerClusterer({map,averageCenter:true,minLevel:8,minClusterSize:3,calculator:[10,30,50],texts:n=>type==='crematory'?'화장 '+n:symbols[type]+' '+n,styles:[{width:'42px',height:type==='crematory'?'32px':'42px',fontSize:'12px',borderRadius:type==='crematory'?'4px':'50%',background:type==='preferred'?'#98732d':type==='available'?'#315749':'#436b86',color:'#fff',textAlign:'center',lineHeight:type==='crematory'?'32px':'42px',fontWeight:'700'}]});
      render();
    } catch(e) { console.error('Hall map loading failed:', e.message); map=null; message('지도를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.'); }
  }

  root.querySelectorAll('[data-map-type]').forEach(input=>input.addEventListener('change',render));
  root.addEventListener('click',e=>{const button=e.target.closest('[data-select]'); if(button){const p=records.find(p=>p.id===button.dataset.select);if(p)select(p,true);}});
  (async()=>{
    try{[records,available]=await Promise.all([read('initial'),read('available')]); render(); await loadMap();}
    catch(e){message('시설 정보를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.');status.textContent='시설 정보를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.';toggle.disabled=true;}
  })();
})();
