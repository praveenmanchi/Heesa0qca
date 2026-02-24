import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@tokens-studio/ui';
import { styled } from '@/stitches.config';
import { Modal } from './Modal/Modal';

const ModalFooterRight = styled('div', {
  display: 'flex',
  justifyContent: 'flex-end',
});

export const TERMS_UPDATE_MODAL_KEY = 'seenTermsUpdate2026';

export default function TermsUpdateModal() {
  const dispatch = useDispatch();
  const seenFlag = useSelector((state: any) => state.settings?.seenTermsUpdate2026);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const isCypress = typeof window !== 'undefined' && (window as any).Cypress;
    if (seenFlag === false && !isCypress) {
      setOpen(true);
    } else if (seenFlag === true) {
      setOpen(false);
    }
  }, [seenFlag]);

  const handleClose = useCallback(() => {
    dispatch.settings.setSeenTermsUpdate2026(true);
    setOpen(false);
  }, [dispatch]);

  if (!open) return null;

  return (
    <Modal
      title="Welcome to The Bridge"
      isOpen={open}
      close={handleClose}
      showClose={false}
      footer={(
        <ModalFooterRight>
          <Button variant="primary" onClick={handleClose}>Get Started</Button>
        </ModalFooterRight>
      )}
    >
      <div style={{ lineHeight: 1.6 }}>
        <p style={{ fontWeight: 600, marginBottom: '8px' }}>
          The Bridge — Connecting gap between Design and dev handoff
        </p>
        <p>
          This plugin helps you extract design tokens, inspect variable usage, generate style guides, and export tokens for developer handoff — all inside Figma.
        </p>
        <p style={{ marginTop: '12px' }}>
          Use the tabs at the top to navigate:
        </p>
        <p style={{ marginTop: '8px' }}>
          📐
          {' '}
          <b>Extract</b>
          {' '}
          — pull tokens from your Figma file
          <br />
          🔍
          {' '}
          <b>Variables</b>
          {' '}
          — search variable usage across all pages
          <br />
          🎨
          {' '}
          <b>Style Guide</b>
          {' '}
          — generate a living style guide on canvas
        </p>
      </div>
    </Modal>
  );
}
