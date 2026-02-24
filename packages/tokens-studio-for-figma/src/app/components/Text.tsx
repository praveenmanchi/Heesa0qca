import React, { type HTMLAttributes } from 'react';
import { Text as InternalText, type TextProps } from '@tokens-studio/ui';

/** Text with type scale support. Default size='xsmall' (11px). Use bodySm, body, subtitle for hierarchy. */
function WrappedText(props: TextProps & HTMLAttributes<Element>) {
  const { size = 'xsmall' } = props;
  return <InternalText {...props} size={size} />;
}

export default WrappedText;
