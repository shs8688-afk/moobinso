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
    selected = p.id;
    panel.hidden = false;
    panel.classList.remove('is-expanded');
    panel.replaceChildren();

    const header = element('div',null,'finder-selection-head');
    const identity = element('div',null,'finder-selection-identity');
    identity.append(element('small',labels[p.type]),element('h3',p.name),element('p',p.address));
    const controls = element('div',null,'finder-selection-controls');
    const expand = element('button','상세 펼치기');
    expand.type = 'button'; expand.dataset.expand = ''; expand.setAttribute('aria-expanded','false');
    const close = element('button','닫기');
    close.dataset.close = ''; close.type = 'button'; close.setAttribute('aria-label','선택한 시설 정보 닫기');
    controls.append(expand,close); header.append(identity,controls); panel.append(header);

    const actions = element('div',null,'finder-selection-actions');
    if (p.phone && /^[0-9-]+$/.test(p.phone)) {
      const phone = element('a',(p.type === 'available' ? '☎ 이별예식장 상담 ' : '전화 문의 ')+p.phone); phone.href = 'tel:'+p.phone; actions.append(phone);
    }
    const facilityUrl = p.type === 'available' ? p.homepage : p.sourceUrl;
    if (facilityUrl && /^https?:\/\//.test(facilityUrl)) {
      const source = element('a',p.type === 'available' ? '홈페이지' : '공식 시설 안내'); source.href = facilityUrl; source.target = '_blank'; source.rel = 'noopener'; actions.append(source);
    }
    const directions = element('a','길찾기');
    directions.href = `https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.lat},${p.lng}`;
    directions.target = '_blank'; directions.rel = 'noopener'; actions.append(directions);
    panel.append(actions);

    const extra = element('div',null,'finder-selection-extra');
    extra.id = 'mapSelectionExtra'; extra.hidden = true;
    expand.setAttribute('aria-controls',extra.id);
    extra.append(element('p','시설 구분: '+(p.category || labels[p.type])));
    if (p.verifiedAt) extra.append(element('p','정보 확인일: '+p.verifiedAt));
    if (p.summary && p.type !== 'available') extra.append(element('p',p.summary));
    if (p.additionalInfo) extra.append(element('p',p.additionalInfo,'finder-selection-note'));
    if (p.fees !== undefined && p.fees !== null && p.fees !== '') extra.append(element('p','이용요금: '+(typeof p.fees === 'number' ? p.fees.toLocaleString('ko-KR')+'원' : p.fees)));
    if (p.hours) extra.append(element('p','운영시간: '+p.hours));
    if (p.reservation) extra.append(element('p','예약 안내: '+p.reservation));
    if (Number.isInteger(p.furnaces)) extra.append(element('p','화장로: '+p.furnaces+'기'));
    if (p.type === 'crematory' && !p.hours && (p.fees === undefined || p.fees === null || p.fees === '') && !p.reservation && !Number.isInteger(p.furnaces)) {
      extra.append(element('p','운영시간·이용요금 등은 공식 시설 안내에서 확인해 주세요.','finder-selection-note'));
    }
    if (p.nearestCrematory) {
      const c = records.find(c => c.id === p.nearestCrematory.id);
      if (c) extra.append(element('p',`가장 가까운 화장장: ${c.name} (${p.nearestCrematory.distanceType === 'straight' ? '직선거리' : '도로거리'} ${p.nearestCrematory.distanceKm}km)`));
    }
    const url = detailLink(p);
    if (url) {
      const detail = element('a','상세보기'); detail.href = url; extra.append(detail);
      const shareButton = element('button','공유'); shareButton.type = 'button';
      const feedback = element('p'); feedback.setAttribute('role','status');
      shareButton.onclick = () => share(p,feedback); extra.append(shareButton,feedback);
    }
    panel.append(extra);

    expand.onclick = () => {
      const open = panel.classList.toggle('is-expanded');
      extra.hidden = !open;
      expand.textContent = open ? '상세 접기' : '상세 펼치기';
      expand.setAttribute('aria-expanded',String(open));
    };
    close.onclick = () => { panel.hidden = true; selected = null; popup?.setMap(null); highlight(); };
    highlight();
    if (map) {
      const point = new kakao.maps.LatLng(p.lat,p.lng);
      map.setLevel(5); map.panTo(point); popup?.setMap(null);
      const popupContent = element('div',p.name); popupContent.style.cssText = 'padding:8px 12px;background:white;border:1px solid #294238;border-radius:8px;font-size:14px;white-space:nowrap';
      popup = new kakao.maps.CustomOverlay({position:point,content:popupContent,yAnchor:2.5,map});
    }
    if (fromList) canvas.scrollIntoView({behavior:'smooth',block:'center'});
    else panel.scrollIntoView({behavior:'smooth',block:'nearest'});
  }  function highlight() {
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
      const marker = new kakao.maps.Marker({position,title:p.name,image:new kakao.maps.MarkerImage(crematory ? '/assets/crematory-marker.svg' : 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg),new kakao.maps.Size(crematory ? 21 : 28,crematory ? 26 : 34),{offset:new kakao.maps.Point(crematory ? 10 : 14,crematory ? 25 : 33)})});
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
      for(const type of ['preferred','available','crematory']) clusters[type]=new kakao.maps.MarkerClusterer({map,averageCenter:true,minLevel:8,minClusterSize:3,calculator:[10,30,50],texts:n=>type==='crematory'?'화장 '+n:symbols[type]+' '+n,styles:[{width:'34px',height:type==='crematory'?'26px':'34px',fontSize:'11px',borderRadius:type==='crematory'?'4px':'50%',background:type==='preferred'?'#98732d':type==='available'?'#315749':'#436b86',color:'#fff',textAlign:'center',lineHeight:type==='crematory'?'26px':'34px',fontWeight:'700'}]});
      render();
    } catch(e) { console.error('Hall map loading failed:', e.message); map=null; message('지도를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.'); }
  }

  root.querySelectorAll('[data-map-type]').forEach(input=>input.addEventListener('change',render));
  root.addEventListener('click',e=>{const button=e.target.closest('[data-select]'); if(button){const p=[...records,...available].find(p=>p.id===button.dataset.select);if(p)select(p,true);}});
  (async()=>{
    try{[records,available]=await Promise.all([read('initial'),read('available')]); render(); await loadMap();}
    catch(e){message('시설 정보를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.');status.textContent='시설 정보를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.';toggle.disabled=true;}
  })();
})();

