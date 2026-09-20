/* Guided voice entry for the existing farewell note. No AI rewriting or audio storage. */
(() => {
  'use strict';
  const init = () => {
    const plan = document.getElementById('plan');
    if (!plan || document.getElementById('wishVoiceIntro')) return;
    const $ = id => document.getElementById(id);
    const schema = [
      ['wishSubject',1,'작성 대상','누구의 이별 노트를 작성하시나요?','본인의 희망을 남기거나, 부모님과 나눈 이야기를 정리할 수 있습니다.'],
      ['wishName',1,'작성 대상 이름','노트에 남길 이름이 있나요?','이름은 선택 사항입니다. 적지 않고 넘어가셔도 괜찮습니다.'],
      ['wishFuneralType',2,'장례 방식','어떤 장례방식을 원하시나요?','아직 결정하지 않으셨다면 해당 선택지를 골라도 괜찮습니다.'],
      ['wishVisitors',2,'조문과 접객','조문과 접객은 어떻게 했으면 하나요?','아래 선택지에서 지금 생각에 가까운 답변을 골라주세요.'],
      ['wishCeremony',3,'입관과 발인','입관과 발인은 어떻게 진행했으면 하나요?','가족과 함께할 방식에 대해 생각나는 만큼 답해주세요.'],
      ['wishMemorial',3,'추모식','추모식은 어떻게 했으면 하나요?','아직 정하지 않았다면 나중에 다시 바꿀 수 있습니다.'],
      ['wishMemorialDetail',3,'추모식의 내용','추모식에서 꼭 담고 싶은 내용이 있나요?','예를 들어, 가족이 추억을 이야기하고 사진을 함께 보는 시간을 남길 수 있습니다.'],
      ['wishMusic',4,'음악','어떤 음악이 흘렀으면 하나요?','곡명이나 가수, 좋아하는 음악의 분위기를 편하게 말씀해주세요.'],
      ['wishWords',5,'글과 문장','좋아하는 글이나 문장이 있나요?','시나 책의 한 문장, 평소 좋아하던 말을 남겨주세요.'],
      ['wishMemory',6,'기억될 모습','어떤 모습으로 기억되고 싶나요?','가족과 친구들이 기억해주었으면 하는 모습을 말씀해주세요.'],
      ['wishStory',6,'사진과 이야기','추모영상에 남기고 싶은 사진이나 이야기가 있나요?','가족여행이나 젊은 시절의 추억처럼 떠오르는 이야기를 남겨주세요.'],
      ['wishLetter',7,'가족에게 남기는 말','가족에게 남기고 싶은 말이 있나요?','짧아도 괜찮습니다. 잠시 쉬거나 이 질문을 건너뛰셔도 됩니다.'],
      ['wishResting',8,'장지','희망하는 장지가 있나요?','아래 선택지에서 골라주세요. 아직 결정하지 않아도 괜찮습니다.'],
      ['wishRestingDetail',8,'구체적인 장소','구체적으로 생각해 둔 장소가 있나요?','장소 이름이나 지역을 남겨주세요. 선택 사항입니다.'],
      ['wishEpitaph',9,'마지막 한 문장','묘비명이나 마지막 한 문장을 남긴다면요?','지금 떠오르는 한 문장을 편하게 말씀해주세요.'],
      ['region',10,'희망 지역','장례를 진행할 희망 지역이 있나요?','현재 노트의 지역 선택지에서 골라주세요.'],
      ['planHall',10,'희망 장례식장','희망하는 장례식장이 있나요?','현재 노트에 있는 선택지입니다. 아직 정하지 않아도 괜찮습니다.'],
      ['planPack',10,'장례서비스','장례서비스에 대한 희망이 있나요?','현재 노트의 선택지에서 골라주세요.'],
      ['wishPractical',10,'장례 실무와 부탁','종교나 의식, 꼭 지켜주었으면 하는 부탁이 있나요?','연락했으면 하는 사람이나 하지 않았으면 하는 일을 남겨도 좋습니다.'],
      ['wishShare',11,'가족에게 전하는 방법','이 노트를 가족에게 어떻게 전하고 싶으세요?','여기서는 희망만 기록합니다. 답변을 선택해도 가족에게 자동 전송되지 않습니다.'],
      ['wishFamilyNote',11,'가족에게 남기는 안내','이 노트를 읽을 가족에게 안내할 말이 있나요?','가족이 결정할 때 참고해주었으면 하는 말을 남겨주세요.']
    ].map(([id,group,label,question,hint]) => ({id,group,label,question,hint}));
    const mic = '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="8" y="2" width="8" height="13" rx="4"/><path d="M5 10v2a7 7 0 0014 0v-2M12 19v3M8 22h8"/></svg>';
    const intro = document.createElement('section');
    intro.id = 'wishVoiceIntro';
    intro.className = 'wv-intro';
    intro.innerHTML = `<div class="wv-eyebrow">한 질문씩, 편안하게</div><h3>말로 남기는 나의 이별 노트</h3><p>질문을 듣고 편하게 말씀해주세요.<br>말씀하신 내용을 확인한 뒤 노트에 담습니다.</p><button type="button" class="wv-primary" id="wvOpen">${mic}<span>음성 인터뷰로 작성</span></button><p class="wv-small">직접 입력도 그대로 이용할 수 있습니다. 답하기 어려운 질문은 건너뛰세요.</p><p class="wv-support" id="wvSupport"></p><div role="status" id="wvPageStatus" class="wv-small"></div>`;
    plan.querySelector('.wishIntro').after(intro);
    const dialog = document.createElement('dialog');
    dialog.id = 'wishVoiceDialog';
    dialog.setAttribute('aria-labelledby','wvTitle');
    dialog.innerHTML = `<div class="wv-shell"><header class="wv-header"><span>나의 이별 노트</span><button type="button" id="wvClose" aria-label="인터뷰 닫고 직접 입력하기">닫기</button></header><div class="wv-body"><div class="wv-progress-row"><span id="wvProgressText"></span><span id="wvGroup"></span></div><progress id="wvProgress" max="21" value="1" aria-label="인터뷰 진행"></progress><section id="wvQuestionPanel"><div class="wv-eyebrow" id="wvLabel"></div><h2 id="wvTitle" tabindex="-1"></h2><p id="wvHint"></p><button type="button" id="wvRead" class="wv-read">질문 듣기</button><p id="wvCurrent" class="wv-current"></p><div id="wvChoices" class="wv-choices" role="group" aria-label="답변 선택지"></div><label for="wvAnswer" id="wvAnswerLabel">내 답변 · 직접 고칠 수 있어요</label><textarea id="wvAnswer" rows="4" placeholder="말하기 버튼을 누르거나 여기에 직접 입력해주세요."></textarea><p id="wvInterim" class="wv-interim" aria-live="off"></p><button type="button" id="wvMic" class="wv-mic">${mic}<span>말하기 시작</span></button><p id="wvStatus" role="status" aria-live="polite" class="wv-status"></p><p class="wv-privacy">음성 인식 과정에서 음성이 브라우저 제공 업체의 서비스로 전송될 수 있습니다. 이 페이지는 음성 파일을 보관하지 않습니다. 확인한 답변과 인터뷰 초안은 이 기기에 임시 저장됩니다.</p><p id="wvStorage" role="status" class="wv-storage"></p><div class="wv-nav"><button type="button" id="wvPrev">이전 질문</button><button type="button" id="wvSkip">건너뛰기</button></div><button type="button" id="wvApply" class="wv-primary">이 답변 반영하고 다음</button></section><section id="wvDone" hidden><div class="wv-finish-mark" aria-hidden="true">✓</div><h3>생각나는 만큼, 잘 남겨주셨어요.</h3><p id="wvDoneText"></p><button type="button" id="wvReview" class="wv-primary">노트 전체 확인하기</button><button type="button" id="wvDocument">가족 공유용 문서 보기</button><button type="button" id="wvAgain">처음 질문부터 다시 보기</button></section></div></div>`;
    document.body.append(dialog);
    // Keep the microphone near the question and the navigation visible on small screens.
    $('wvRead').after($('wvMic'));
    $('wvMic').after($('wvStatus'));
    const footer=document.createElement('div');footer.id='wvFooter';footer.className='wv-footer';
    footer.append(dialog.querySelector('.wv-nav'),$('wvApply'));
    dialog.querySelector('.wv-shell').append(footer);

    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    const supported = !!Speech && window.isSecureContext;
    const synth = window.speechSynthesis;
    const draftKey = 'farewellVoiceDraft.v1';
    let drafts = {}, index = 0, recognition = null, session = 0, stopTimer = null, opener = null;
    let phase = 'idle', selected = '', seed = '', sawFinal = false, recognitionError = false, utterance = null;
    const setStatus = text => { $('wvStatus').textContent = text; };
    const current = () => schema[index];
    const options = () => current().id === 'wishSubject' ? ['나','부모님'] : Array.from($(current().id).options || [], o => o.value);
    const isChoice = () => options().length > 0;
    const normal = text => text.replace(/[\s.,!?。！？]/g,'').trim();
    const resolveChoice = text => {
      const values = options(), norm = normal(text);
      const n = norm.match(/^([1-9])(?:번|번째)?$/);
      if(n) return values[Number(n[1])-1] || '';
      const spoken = {'일번':0,'첫번째':0,'이번':1,'두번째':1,'삼번':2,'세번째':2,'사번':3,'네번째':3,'오번':4,'다섯번째':4,'육번':5,'여섯번째':5,'칠번':6,'일곱번째':6};
      if(Object.prototype.hasOwnProperty.call(spoken,norm)) return values[spoken[norm]] || '';
      return values.find(v => normal(v) === norm) || '';
    };
    const saveDrafts = () => {
      try { localStorage.setItem(draftKey,JSON.stringify({index,drafts})); $('wvStorage').textContent=''; return true; }
      catch (_) { $('wvStorage').textContent='이 기기에 임시 저장하지 못했습니다. 창을 닫기 전에 답변을 노트에 반영하고 문서로 보관해주세요.'; return false; }
    };
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || 'null');
      if(saved && saved.drafts && typeof saved.drafts === 'object') {
        for(const q of schema) if(typeof saved.drafts[q.id]?.text === 'string') drafts[q.id]={text:saved.drafts[q.id].text.slice(0,50000),selected:String(saved.drafts[q.id].selected || '')};
        if(Number.isInteger(saved.index)) index=Math.max(0,Math.min(schema.length-1,saved.index));
      }
    } catch (_) { /* Direct entry remains available if storage is unavailable. */ }
    const remember = () => { drafts[current().id]={text:$('wvAnswer').value,selected}; saveDrafts(); };
    const cancelRead = () => { if(synth) synth.cancel(); utterance=null; $('wvRead').textContent='질문 듣기'; };
    const controls = () => {
      const busy=phase!=='idle';
      $('wvAnswer').readOnly=busy;
      for(const id of ['wvPrev','wvSkip','wvApply','wvRead']) $(id).disabled=busy || (id==='wvPrev'&&index===0) || (id==='wvRead'&&!synth);
      for(const b of $('wvChoices').querySelectorAll('button')) b.disabled=busy;
      $('wvMic').disabled=!supported || phase==='stopping';
      $('wvMic').classList.toggle('is-listening',busy);
      $('wvMic').setAttribute('aria-pressed',String(busy));
      $('wvMic').querySelector('span').textContent=phase==='stopping'?'답변을 정리하는 중…':busy?'말하기 마치기':'말하기 시작';
    };
    const abortCapture = () => {
      session++; clearTimeout(stopTimer); stopTimer=null;
      const r=recognition; recognition=null; phase='idle';
      if(r) { try{r.abort();}catch(_){} }
      $('wvInterim').textContent=''; controls();
    };
    const renderChoices = () => {
      const box=$('wvChoices');box.replaceChildren();
      options().forEach((value,i)=>{
        const b=document.createElement('button'); b.type='button'; b.textContent=`${i+1}. ${value}`;
        b.setAttribute('aria-pressed',String(selected===value));
        b.addEventListener('click',()=>{
          selected=value; $('wvAnswer').value=value; remember(); renderChoices();
          setStatus('선택한 답변을 확인하고 아래 반영 버튼을 눌러주세요.');
        });box.append(b);
      });
    };
    const render = () => {
      abortCapture();cancelRead();
      $('wvDone').hidden=true;$('wvQuestionPanel').hidden=false;footer.hidden=false;
      const q=current(), saved=drafts[q.id];
      $('wvProgressText').textContent=`질문 ${index+1} / ${schema.length}`;
      $('wvGroup').textContent=`기존 항목 ${String(q.group).padStart(2,'0')} / 11`;
      $('wvProgress').value=index+1;
      $('wvLabel').textContent=q.label;$('wvTitle').textContent=q.question;$('wvHint').textContent=q.hint;
      const existing=$(q.id).value;
      $('wvCurrent').textContent=existing ? `현재 노트: ${existing.length>150?existing.slice(0,150)+'…':existing}` : '아직 작성한 내용이 없습니다.';
      $('wvAnswer').value=saved?saved.text:(isChoice()?'':existing);
      selected=saved && options().includes(saved.selected)?saved.selected:'';
      $('wvAnswerLabel').textContent=isChoice()?'말씀하신 선택 · 번호나 선택지 그대로 말해주세요':'내 답변 · 직접 고칠 수 있어요';
      $('wvAnswer').placeholder=isChoice()?'예: 2번. 또는 위에서 답변을 직접 선택하세요.':'말하기 버튼을 누르거나 여기에 직접 입력해주세요.';
      renderChoices();
      $('wvApply').textContent=index===schema.length-1?'이 답변 반영하고 마치기':'이 답변 반영하고 다음';
      setStatus(supported?'말하기 버튼을 누르면 마이크가 켜집니다.':unsupportedText);
      controls();saveDrafts();$('wvTitle').focus({preventScroll:true});dialog.querySelector('.wv-body').scrollTop=0;
    };
    const unsupportedText=!window.isSecureContext?'음성 입력은 보안 연결(HTTPS)에서 사용할 수 있습니다. 지금은 직접 입력해주세요.':'이 브라우저에서는 음성 입력을 사용할 수 없습니다. 직접 입력하거나 음성 입력을 지원하는 브라우저에서 열어주세요.';
    $('wvSupport').textContent=supported?'질문 듣기 · 말로 답하기 · 확인 후 반영':unsupportedText;

    // Save through the existing data structure so documents and the original form stay in sync.
    const persistNote = () => {
      try { localStorage.setItem('farewellWish',JSON.stringify(window.getWishData()));
        $('wishSaveState').textContent='이 기기에 임시 저장되었습니다 · '+new Date().toLocaleString('ko-KR');
        $('wvPageStatus').textContent='확인한 답변을 이 기기에 임시 저장했습니다.';return true;
      }catch(_) { $('wishSaveState').textContent='임시 저장에 실패했습니다. 현재 화면의 내용을 인쇄·PDF로 보관해주세요.';
        $('wvPageStatus').textContent='저장 공간 또는 브라우저 설정 때문에 임시 저장하지 못했습니다.'; return false; }
    };
    window.saveWish = () => { const ok=persistNote();window.makeWishDocument(false);window.refreshMyPage();return ok; };
    const done = () => {
      abortCapture();cancelRead();$('wvQuestionPanel').hidden=true;$('wvDone').hidden=false;footer.hidden=true;
      $('wvProgressText').textContent='인터뷰를 마쳤습니다';$('wvProgress').value=schema.length;
      $('wvDoneText').textContent='확인한 답변은 원래 노트에 반영했습니다. 건너뛴 항목은 기존 내용을 유지합니다. 전체 내용을 살펴보고 필요하면 수정해주세요.';
      $('wvReview').focus();dialog.querySelector('.wv-body').scrollTop=0;
    };
    const advance = () => { if(index<schema.length-1){index++;render();}else done(); };
    const close = () => { if(!$('wvQuestionPanel').hidden)remember();abortCapture();cancelRead();dialog.close();if(opener?.isConnected)opener.focus(); };
    const open = (at, trigger) => {
      opener=trigger; if(typeof at==='number') index=at;
      dialog.showModal();render();
    };
    $('wvOpen').addEventListener('click',e=>open(undefined,e.currentTarget));
    $('wvClose').addEventListener('click',close);
    dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
    $('wvAnswer').addEventListener('input',()=>{
      if(isChoice()){selected=resolveChoice($('wvAnswer').value);renderChoices();}
      remember();
    });
    $('wvPrev').addEventListener('click',()=>{remember();if(index>0){index--;render();}});
    $('wvSkip').addEventListener('click',()=>{remember();advance();});
    $('wvApply').addEventListener('click',()=>{
      const q=current(); let value=$('wvAnswer').value.trim();
      if(isChoice()) {
        value=selected || resolveChoice(value);
        if(!value){setStatus('답변을 임의로 고르지 않았습니다. 위의 선택지를 직접 고르거나 번호로 말씀해주세요.');return;}
      } else if(!value) {setStatus('답변이 비어 있습니다. 내용을 입력하거나 건너뛰기를 눌러주세요.');return;}
      if(q.id==='wishSubject')window.setWishSubject(value);else $(q.id).value=value;
      $(q.id).dispatchEvent(new Event('input',{bubbles:true}));
      $(q.id).dispatchEvent(new Event('change',{bubbles:true}));
      delete drafts[q.id];saveDrafts();
      const ok=persistNote();
      if(!ok){setStatus('답변은 노트에 반영했지만 기기에 저장하지 못했습니다. 직접 입력 화면에서 문서로 보관해주세요.');return;}
      advance();
    });
    $('wvReview').addEventListener('click',()=>{close();intro.scrollIntoView({block:'start'});});
    $('wvDocument').addEventListener('click',()=>{close();window.makeWishDocument();});
    $('wvAgain').addEventListener('click',()=>{index=0;render();});
    $('wvRead').addEventListener('click',()=>{
      if(utterance){cancelRead();return;}
      if(!synth)return;
      cancelRead();const q=current();
      const u=new SpeechSynthesisUtterance(`${q.question} ${q.hint}${isChoice()?' '+options().map((o,i)=>`${i+1}번, ${o}`).join('. '):''}`);
      u.lang='ko-KR';u.rate=.9;
      const voice=synth.getVoices().find(v=>v.lang.startsWith('ko'));if(voice)u.voice=voice;
      utterance=u;$('wvRead').textContent='읽기 멈추기';
      u.onend=()=>{if(utterance===u){utterance=null;$('wvRead').textContent='질문 듣기';}};
      u.onerror=()=>{if(utterance===u){utterance=null;$('wvRead').textContent='질문 듣기';setStatus('질문을 소리 내어 읽지 못했습니다. 화면의 질문을 확인해주세요.');}};
      synth.speak(u);
    });
    const finishRecognition = (token, message) => {
      if(token!==session)return;
      clearTimeout(stopTimer);recognition=null;phase='idle';$('wvInterim').textContent='';
      if(isChoice()){selected=resolveChoice($('wvAnswer').value);renderChoices();}
      remember();controls();
      if(message)setStatus(message);
      else if(!recognitionError)setStatus(sawFinal?'말씀하신 내용을 확인하고 필요하면 고쳐주세요.':'말씀을 인식하지 못했습니다. 다시 말하거나 직접 입력해주세요.');
      if(sawFinal)$('wvAnswer').scrollIntoView({block:'nearest'});
    };
    $('wvMic').addEventListener('click',()=>{
      if(phase==='stopping')return;
      if(phase!=='idle'){
        phase='stopping';controls();setStatus('마지막 말씀을 확인하고 있습니다.');
        const token=session;
        try{recognition.stop();}catch(_){finishRecognition(token);}
        stopTimer=setTimeout(()=>{
          if(token!==session || phase==='idle')return;
          const r=recognition;finishRecognition(token,'인식된 내용까지 남겼습니다. 빠진 말이 있다면 다시 말해주세요.');session++;try{r?.abort();}catch(_){}
        },5000);return;
      }
      if(!supported){setStatus(unsupportedText);return;}
      cancelRead();
      const token=++session;
      let r;
      try{r=new Speech();}catch(_){setStatus('음성 입력을 시작할 수 없습니다. 직접 입력해주세요.');return;}
      recognition=r;seed=isChoice()?'':$('wvAnswer').value.trim();sawFinal=false;recognitionError=false;
      const finalParts=new Map();
      r.lang='ko-KR';r.continuous=true;r.interimResults=true;r.maxAlternatives=1;
      phase='starting';controls();setStatus('마이크 연결을 기다리고 있습니다. 권한 요청이 나타나면 허용해주세요.');
      r.onstart=()=>{if(token!==session)return;clearTimeout(stopTimer);phase='listening';controls();setStatus('듣고 있습니다. 말씀을 마치면 말하기 마치기를 눌러주세요.');};
      r.onresult=e=>{
        if(token!==session || !dialog.open)return;
        const interim=[];
        for(let i=0;i<e.results.length;i++){
          const result=e.results[i];
          if(result.isFinal){finalParts.set(i,result[0].transcript.trim());sawFinal=true;}
          else interim.push(result[0].transcript);
        }
        const finalText=Array.from(finalParts.entries()).sort((a,b)=>a[0]-b[0]).map(x=>x[1]).filter(Boolean).join(' ');
        if(finalText) $('wvAnswer').value=[seed,finalText].filter(Boolean).join(seed&&finalText?'\n':'');
        $('wvInterim').textContent=interim.length?'인식 중: '+interim.join(' '):'';
        if(sawFinal)remember();
      };
      r.onerror=e=>{
        if(token!==session)return;recognitionError=true;
        const messages={
          'not-allowed':'마이크 사용이 허용되지 않았습니다. 브라우저의 사이트 설정에서 마이크를 허용하거나 직접 입력해주세요.',
          'service-not-allowed':'이 브라우저에서 음성 인식 서비스를 사용할 수 없습니다. 다른 브라우저에서 열거나 직접 입력해주세요.',
          'audio-capture':'사용할 수 있는 마이크를 찾지 못했습니다. 마이크 연결을 확인하거나 직접 입력해주세요.',
          'network':'음성 인식 서비스에 연결하지 못했습니다. 인터넷 연결을 확인해주세요. 입력된 내용은 유지됩니다.',
          'no-speech':'말소리를 인식하지 못했습니다. 다시 말하거나 직접 입력해주세요.',
          'language-not-supported':'이 브라우저에서 한국어 음성 인식을 지원하지 않습니다. 직접 입력해주세요.',
          'aborted':'음성 입력을 멈췄습니다. 인식된 내용을 확인해주세요.'
        };
        finishRecognition(token,messages[e.error] || '음성 입력 중 문제가 생겼습니다. 인식된 내용은 유지되니 확인해주세요.');
        session++;try{r.abort();}catch(_){}
      };
      r.onend=()=>finishRecognition(token);
      stopTimer=setTimeout(()=>{
        if(token!==session || phase!=='starting')return;
        finishRecognition(token,'마이크 연결이 지연되고 있습니다. 권한과 연결을 확인하거나 직접 입력해주세요.');session++;try{r.abort();}catch(_){}
      },20000);
      try{r.start();}catch(_){recognitionError=true;finishRecognition(token,'음성 입력을 시작하지 못했습니다. 잠시 후 다시 시도하거나 직접 입력해주세요.');session++;}
    });
    for(const card of plan.querySelectorAll('.card')){
      const first=schema.find(q=>card.contains($(q.id)));if(!first)continue;
      const b=document.createElement('button');b.type='button';b.className='wv-field-button';b.textContent='이 항목을 말로 작성';
      b.setAttribute('aria-label',`${first.group}번 항목을 음성 인터뷰로 작성`);
      b.addEventListener('click',e=>open(schema.indexOf(first),e.currentTarget));
      card.querySelector('.wishStepTitle')?.after(b);
    }
    for(const q of schema) {
      const el=$(q.id);
      if(el.type!=='hidden' && !el.labels?.length)el.setAttribute('aria-label',q.label);
      el.addEventListener('input',()=>{if(!dialog.open){delete drafts[q.id];saveDrafts();}});
      el.addEventListener('change',()=>{if(!dialog.open){delete drafts[q.id];saveDrafts();}});
    }
    const setOriginalSubject=window.setWishSubject;
    window.setWishSubject=subject=>{
      setOriginalSubject(subject);
      if(!dialog.open){delete drafts.wishSubject;saveDrafts();}
    };
    const pause = () => {
      if(!dialog.open)return;
      if(phase!=='idle'){remember();abortCapture();setStatus('화면을 떠나 음성 입력을 멈췄습니다. 인식된 답변은 유지됩니다.');}
      cancelRead();
    };
    document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
    window.addEventListener('pagehide',pause);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
