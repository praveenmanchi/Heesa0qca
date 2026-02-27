import React from 'react';
import { SingleToken } from '@/types/tokens';
import { MoreButton } from '../MoreButton';
import { TokenTypes } from '@/constants/TokenTypes';

import { DragOverItem } from './DragOverItem';
import { DraggableWrapper } from './DraggableWrapper';
import { ShowFormOptions } from '@/types/ShowFormOptions';

// @TODO fix typings

type Props = {
  type: TokenTypes;
  token: SingleToken;
  showForm: (opts: ShowFormOptions) => void;
  draggedToken: SingleToken | null;
  dragOverToken: SingleToken | null;
  setDraggedToken: (token: SingleToken | null) => void;
  setDragOverToken: (token: SingleToken | null) => void;
  simplified?: boolean;
};

export const TokenButton: React.FC<React.PropsWithChildren<Props>> = ({
  type,
  token,
  showForm,
  draggedToken,
  dragOverToken,
  setDraggedToken,
  setDragOverToken,
  simplified,
}) => (
  <DraggableWrapper
    token={token}
    dragOverToken={dragOverToken}
    draggedToken={draggedToken}
    setDragOverToken={setDragOverToken}
    setDraggedToken={setDraggedToken}
  >
    {/* TODO: We should restructure and rename MoreButton as it's only ever used in TokenButton */}
    <MoreButton
      token={token}
      type={type}
      showForm={showForm}
      simplified={simplified}
    />
    <DragOverItem
      token={token}
      draggedToken={draggedToken}
      dragOverToken={dragOverToken}
    />
  </DraggableWrapper>
);
