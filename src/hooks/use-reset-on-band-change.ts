import { useEffect, useRef } from 'react';

import { useAuth } from '@/contexts/auth-context';

/** Calls `reset` the moment the active band changes, so a screen's list from
 *  the *previous* band never renders — not even briefly — while the new
 *  band's data is still loading.
 *
 *  Screens refetch on focus (`useFocusEffect`), but that alone isn't enough:
 *  switching bands happens from the Account tab, which doesn't refocus every
 *  other tab, so whatever list is already sitting in memory keeps rendering
 *  the old band's data until that tab is next focused *and* its fetch
 *  resolves. Clearing it as soon as the band changes — while the tab is
 *  still off-screen — means there's nothing stale left to flash. */
export function useResetOnBandChange(reset: () => void) {
  const { activeBandId } = useAuth();
  const lastBandId = useRef(activeBandId);

  useEffect(() => {
    if (lastBandId.current === activeBandId) return;
    lastBandId.current = activeBandId;
    reset();
    // `reset` is intentionally excluded — callers pass a fresh closure each
    // render, and re-running this because of that (rather than an actual
    // band change) would defeat the point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBandId]);
}
