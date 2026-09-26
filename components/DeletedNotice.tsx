'use client';

import { useEffect, useState } from 'react';
import { DeletedBanner } from '@/components/DeletedBanner';

export function DeletedNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('konto') === 'slettet') return;
    try {
      if (sessionStorage.getItem('pladeplan-account-deleted') === '1') {
        sessionStorage.removeItem('pladeplan-account-deleted');
        setShow(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  if (!show) return null;
  return <DeletedBanner />;
}
