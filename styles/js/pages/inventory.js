/* ==================================================================== */
/* Import Charadex
======================================================================= */
import { charadex } from '../charadex.js';

/* ==================================================================== */
/* Load
======================================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  const t0 = performance.now();
  const log = (...args) => console.log('[inventory]', ...args);
  const warn = (...args) => console.warn('[inventory]', ...args);
  const err = (...args) => console.error('[inventory]', ...args);

  log('DOMContentLoaded');

  try {
    let dex = await charadex.initialize.page(
      null,
      charadex.page.inventory,
      null,
      async (listData) => {
        const tList = performance.now();
        log('[cb] listData:', {
          type: listData?.type,
          pageUrl: listData?.pageUrl,
          hasArray: !!listData?.array,
          arrayLen: Array.isArray(listData?.array) ? listData.array.length : undefined,
          keys: Object.keys(listData || {})
        });

        if (listData.type === 'profile') {
          const profile = listData.profileArray?.[0];
          if (!profile) {
            warn('profileArray[0] is undefined');
            return;
          }
          log('[profile] id:', profile?.id, 'name:', profile?.name ?? profile?.username);

          // Inventory
          const invStart = performance.now();
          const fixedInv = await charadex.manageData.inventoryFix(profile);
          log('[inventoryFix] items:', Array.isArray(fixedInv) ? fixedInv.length : fixedInv);
          await charadex.initialize.groupGallery(
            charadex.page.inventory.inventoryConfig,
            fixedInv,
            'type',
            charadex.url.getPageUrl('items')
          );
          log('[groupGallery] done in', (performance.now() - invStart).toFixed(1), 'ms');

          // Designs
          if (charadex.tools.checkArray(profile.masterlist)) {
            const dStart = performance.now();
            log('[designs] masterlist length:', profile.masterlist.length);
            const designs = await charadex.initialize.page(
              profile.masterlist,
              charadex.page.inventory.relatedData['masterlist'],
            );
            log('[designs] initialize.page result:', designs, 'in', (performance.now() - dStart).toFixed(1), 'ms');
          } else {
            log('[designs] no masterlist');
          }

          // Logs
          if (charadex.tools.checkArray(profile.inventorylog)) {
            const lStart = performance.now();
            log('[logs] inventorylog length:', profile.inventorylog.length);
            const logs = await charadex.initialize.page(
              profile.inventorylog,
              charadex.page.inventory.relatedData['inventory log'],
            );
            log('[logs] initialize.page result:', logs, 'in', (performance.now() - lStart).toFixed(1), 'ms');
          } else {
            log('[logs] no inventorylog');
          }
        } else {
          log('[cb] non-profile type:', listData.type);
        }

        log('[cb] handled in', (performance.now() - tList).toFixed(1), 'ms');
      }
    );

    log('[initialize.page] returned:', dex, 'in', (performance.now() - t0).toFixed(1), 'ms');

    const softStart = performance.now();
    charadex.tools.loadPage('.softload', 500);
    log('[loadPage] .softload scheduled (500ms), call took', (performance.now() - softStart).toFixed(1), 'ms');
  } catch (e) {
    err('Unhandled error:', e);
  }
});
