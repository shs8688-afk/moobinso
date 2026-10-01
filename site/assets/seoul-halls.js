(() => {
  document.querySelectorAll('[data-hall-list]').forEach(root => {
  fetch(root.dataset.hallList).then(response => {
    if (!response.ok) throw new Error('목록을 불러오지 못했습니다.');
    return response.json();
  }).then(data => {
    const fragment = document.createDocumentFragment();
    data.halls.forEach((hall, index) => {
      const row = document.createElement('li');
      row.className = 'seoulHallRow';
      if (hall.image) {
        const image = document.createElement('img');
        image.className = 'seoulHallPhoto';
        image.src = hall.image;
        image.alt = hall.name + ' 시설 사진';
        image.loading = 'lazy';
        image.width = 112; image.height = 88;
        row.append(image);
      } else {
        const pending = document.createElement('div');
        pending.className = 'seoulHallPhoto seoulHallPhotoPending';
        pending.textContent = '시설 사진 확인 중';
        row.append(pending);
      }
      const info = document.createElement('div'); info.className = 'seoulHallInfo';
      const name = document.createElement('h4'); name.textContent = (index + 1) + '. ' + hall.name;
      const meta = document.createElement('div'); meta.className = 'seoulHallMeta';
      const category = document.createElement('span'); category.className = 'seoulHallCategory'; category.textContent = hall.category;
      const pageUrl = hall.homepage || hall.infoUrl;
      const homepage = document.createElement(pageUrl ? 'a' : 'span');
      homepage.className = 'seoulHallHomepage'; homepage.textContent = hall.homepage ? '홈페이지' : '시설정보';
      if (pageUrl) {
        homepage.href = pageUrl; homepage.target = '_blank'; homepage.rel = 'noopener noreferrer';
        homepage.setAttribute('aria-label', hall.name + ' ' + homepage.textContent + ' (새 창)');
        if (hall.homepageNote) homepage.title = hall.homepageNote;
      } else { homepage.setAttribute('aria-disabled', 'true'); homepage.title = '공식 홈페이지 주소 확인 중'; }
      const call = document.createElement('a'); call.className = 'seoulHallCall'; call.href = 'tel:' + data.consultPhone;
      call.textContent = '☎ 상담'; call.setAttribute('aria-label', hall.name + ' 이용 상담, 이별예식장 공통 상담번호 ' + data.consultPhone);
      meta.append(category, homepage, call); info.append(name, meta); row.append(info); fragment.append(row);
    });
    root.replaceChildren(fragment);
  }).catch(() => { root.textContent = '목록을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.'; });
  });
})();
