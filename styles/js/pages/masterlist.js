/* ==================================================================== */
/* Import Charadex
/* ==================================================================== */
import { charadex } from '../charadex.js';

/* ==================================================================== */
/* Load
/* ==================================================================== */
document.addEventListener("DOMContentLoaded", async () => {
  console.time('[masterlist] initialize.page');

  // 0) 설정값 확인
  console.log('[cfg] filters:', charadex.page.masterlist?.filters?.parameters);
  console.log('[cfg] search:', charadex.page.masterlist?.search?.parameters);

  // 1) 페이지 초기화
  let dex = await charadex.initialize.page(
    null,
    charadex.page.masterlist,
    null, 
    async (listData) => {
      // 2) 프로필 모드 콜백
      console.log('[cb] listData:', listData?.type, listData);

      if (listData.type == 'profile') {
        // Create the log dex
        if (charadex.tools.checkArray(listData.profileArray[0].masterlistlog)) {
          let logs = await charadex.initialize.page(
            listData.profileArray[0].masterlistlog,
            charadex.page.masterlist.relatedData['masterlist log']
          );
          console.log('[cb] logs dex:', logs);
        }
      }
    }
  );

  console.timeEnd('[masterlist] initialize.page');

  // 3) List.js 핸들 확인 (있으면 valueNames/첫 아이템 출력)
  try {
    const list = dex?.list || dex?.listJs || dex; // 구현에 따라 이름 다를 수 있어 방어적 접근
    console.log('[list] handle:', list);
    console.log('[list] valueNames:', list?.valueNames);
    console.log('[list] first item values:', list?.items?.[0]?.values?.());
  } catch (e) {
    console.warn('[list] inspect failed:', e);
  }

  // 4) 필터 변경 시: 키/선택값/현재 매칭 개수 로그
  //   - bootstrap-select를 쓰면 change 외에 changed.bs.select도 같이 듣는 게 안전
  const onFilterChange = (ev) => {
    const $sel = $(ev.currentTarget);
    const key = $sel.attr('name');          // 예: '디자인타입' (scrub된 name)
    const val = $sel.val() || [];            // ['all'] 또는 ['공식디자인개체', ...]
    console.log('[filter] change:', { key, val });

    try {
      const list = dex?.list || dex?.listJs || dex;
      // updated 이벤트 직후 매칭 수 보기 위해 약간 지연
      setTimeout(() => {
        console.log('[filter] matching count:', list?.matchingItems?.length);
      }, 0);
    } catch {}
  };

  $(document).on('change', '#charadex-filters select', onFilterChange);
  $(document).on('changed.bs.select', '#charadex-filters select', onFilterChange);

  // 5) 검색 입력 로그 (필드+검색어)
  $(document).on('input', '#charadex-search', function () {
    const term = $(this).val();
    const field = $('#charadex-search-filter').val() || 'All';
    console.log('[search] term:', term, 'field:', field);
  });

  // 6) List.js updated 훅으로 현재 상태 보기
  try {
    const list = dex?.list || dex?.listJs || dex;
    list?.on?.('updated', (l) => {
      console.log('[list] updated -> matching:', l?.matchingItems?.length, 'total:', l?.items?.length);
    });
  } catch {}

  // 7) 페이지 로드 애니메이션
  charadex.tools.loadPage('.softload', 500);
});
