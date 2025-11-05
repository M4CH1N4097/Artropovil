// ====== 디자인(마스터리스트) 검색 로그 강화 유틸 ======
const DesignSearchLogger = (() => {
  const log  = (...a) => console.log('[design-search]', ...a);
  const warn = (...a) => console.warn('[design-search]', ...a);
  const err  = (...a) => console.error('[design-search]', ...a);

  // 간단한 디바운스
  const debounce = (fn, ms=200) => {
    let t; 
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  // 리스트 아이템 스냅샷(첫 n개)
  const snapshotItems = (root, {itemSelector='[data-item], .list .item, .list li, .card', fields=[]} = {}, n=3) => {
    const nodes = Array.from(root.querySelectorAll(itemSelector)).slice(0, n);
    return nodes.map(node => {
      const snap = { _text: node.textContent.trim().slice(0, 120) };
      fields.forEach(sel => {
        const el = node.querySelector(sel);
        if (el) snap[sel] = el.textContent.trim().slice(0, 80);
      });
      return snap;
    });
  };

  // valueNames(검색 대상 필드) 추정
  const guessValueNames = (root) => {
    // 자주 쓰는 클래스/셀렉터 후보
    const candidates = ['.name', '.title', '.id', '.owner', '.designer', '.artist', '.traits', '[data-name]', '[data-title]'];
    const hit = candidates.filter(sel => root.querySelector(sel));
    return hit.length ? hit : null;
  };

  // 리스트 크기 측정
  const countItems = (root, sel='[data-item], .list .item, .list li, .card') =>
    root.querySelectorAll(sel).length;

  // 토큰화(간단)
  const tokenize = (str) => (str || '')
    .toString()
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  // MutationObserver로 렌더 완료 감지
  const observeList = (root, onChange) => {
    const obs = new MutationObserver(debounce(() => onChange(), 50));
    obs.observe(root, { childList: true, subtree: true });
    return obs;
  };

  // 메인: 검색 로깅 부착
  const attach = ({
    container,           // 디자인 리스트 전체 컨테이너(필수)
    searchInput,         // 검색 인풋(선택: 자동탐지)
    filterSelects = [],  // 필터 셀렉트들(선택: 자동탐지)
    itemSelector,        // 아이템 셀렉터(선택)
    valueNames,          // 검색 필드 셋(선택: 자동 추정)
    debounceMs = 250,    // 입력 디바운스(ms)
  }) => {
    if (!container) {
      warn('컨테이너가 없습니다. attach() 생략');
      return;
    }

    // 자동 탐지
    searchInput  = searchInput  || container.querySelector('input[type="search"], input[data-search], .search input, .searchbar input');
    if (!filterSelects.length) {
      filterSelects = Array.from(container.querySelectorAll('select, .filters select'));
    }
    valueNames = valueNames || guessValueNames(container);
    const fields = Array.isArray(valueNames) ? valueNames : [];

    // 초기 스캔
    const totalBefore = countItems(container, itemSelector);
    log('[init] items:', totalBefore, 'valueNames:', valueNames || '(unknown)');
    log('[init] searchInput:', !!searchInput, 'filterSelects:', filterSelects.length);

    const renderTick = () => {
      const total = countItems(container, itemSelector);
      log('[render] current items:', total, 'snapshot:', snapshotItems(container, { itemSelector, fields }, 2));
    };

    const obs = observeList(container, () => {
      log('[observer] list DOM changed');
      renderTick();
    });

    const applySearch = debounce((src='input') => {
      const q = searchInput ? searchInput.value : '';
      const tokens = tokenize(q);
      const activeFilters = filterSelects.map(s => ({ name: s.name || s.id || 'select', value: s.value }));

      // 필터/검색 적용 전후 개수 비교(“적용은 외부 라이브러리/기존 코드”가 한다고 가정)
      const before = countItems(container, itemSelector);

      log('[apply]', {
        src,
        query: q,
        tokens,
        filters: activeFilters,
        fields: fields.length ? fields : '(unknown)',
        before
      });

      // 여기서 실제 필터링/검색은 charadex/리스트 라이브러리가 수행한다고 가정.
      // 만약 list.js 사용 중이면 window.List 인스턴스에 접근해 수동 필터도 가능.
      // (여기서는 관찰/로깅 전용이라 직접 필터링은 하지 않음)

      // 렌더 완료는 MutationObserver가 잡아줄 것이고,
      // 만약 동기 필터링이면 바로 after 찍기
      setTimeout(() => {
        const after = countItems(container, itemSelector);
        const matchedPct = before ? ((after / before) * 100).toFixed(1) + '%' : 'n/a';
        log('[apply][after]', { after, matchedPct, firstItems: snapshotItems(container, { itemSelector, fields }, 3) });
      }, 0);
    }, debounceMs);

    // 이벤트 부착
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        log('[keydown]', e.key, 'valueLen=', searchInput.value.length);
      });
      searchInput.addEventListener('input', () => applySearch('search-input'));
    } else {
      warn('검색 인풋을 찾지 못했습니다.');
    }

    filterSelects.forEach(sel => {
      sel.addEventListener('change', () => {
        log('[filter][change]', { name: sel.name || sel.id, value: sel.value });
        applySearch('filter-change');
      });
    });

    // 초기 1회 렌더 스냅샷
    renderTick();

    // 클린업 반환(원하면 detach해서 옵저버 해제 가능)
    return () => {
      obs.disconnect();
      log('[detach] observers removed');
    };
  };

  return { attach };
})();

// ====== 디자인 초기화 이후, 검색 로거 연결 ======
// designs 초기화하는 곳에서 아래처럼 호출해줘.
async function initDesignsWithLogs(profile) {
  const dStart = performance.now();
  console.log('[designs] masterlist length:', profile.masterlist.length);

  const designs = await charadex.initialize.page(
    profile.masterlist,
    charadex.page.inventory.relatedData['masterlist'],
  );

  console.log('[designs] initialize.page result:', designs, 'in', (performance.now() - dStart).toFixed(1), 'ms');

  // 컨테이너 DOM이 렌더된 다음에 attach (약간의 지연)
  setTimeout(() => {
    // 아래 셀렉터는 실제 마크업에 맞게 조정
    const container = document.querySelector('#designs, .designs, [data-section="masterlist"]') || document;
    DesignSearchLogger.attach({
      container,
      // 필요시 명시:
      // searchInput: container.querySelector('#designSearch'),
      // filterSelects: [container.querySelector('#statusFilter'), container.querySelector('#rarityFilter')],
      // itemSelector: '.design-card, .list .item',
      // valueNames: ['.title', '.id', '.owner', '.designer', '.artist', '.traits'],
      debounceMs: 200,
    });
  }, 100);

  return designs;
}
