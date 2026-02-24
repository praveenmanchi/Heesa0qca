import React from 'react';
import {
  ComponentInstanceIcon,
  FrameIcon,
  TextIcon,
  MixIcon,
  GroupIcon,
  BoxIcon,
  MinusIcon,
  ValueIcon,
} from '@radix-ui/react-icons';
import Box from '../Box';

interface NodeIconProps {
  type: NodeType;
  width?: number;
  height?: number;
}

export default function NodeIcon({ type, width = 12, height = 12 }: NodeIconProps): JSX.Element {
  let icon;
  switch (type) {
    case 'TEXT':
      icon = <TextIcon width={width} height={height} />;
      break;
    case 'FRAME':
      icon = <FrameIcon width={width} height={height} />;
      break;
    case 'INSTANCE':
    case 'COMPONENT':
    case 'COMPONENT_SET':
      icon = <ComponentInstanceIcon width={width} height={height} />;
      break;
    case 'VECTOR':
    case 'BOOLEAN_OPERATION':
    case 'POLYGON':
    case 'STAR':
      icon = <MixIcon width={width} height={height} />;
      break;
    case 'GROUP':
      icon = <GroupIcon width={width} height={height} />;
      break;
    case 'RECTANGLE':
      icon = <BoxIcon width={width} height={height} />;
      break;
    case 'LINE':
      icon = <MinusIcon width={width} height={height} />;
      break;
    case 'ELLIPSE':
      icon = <ValueIcon width={width} height={height} />;
      break;
    default:
      icon = <BoxIcon width={width} height={height} />;
      break;
  }
  return (
    <Box
      css={{
        marginRight: '$3',
        display: 'flex',
        alignItems: 'center',
        svg: {
          fill: '$contextMenuFg',
        },
      }}
    >
      {icon}
    </Box>
  );
}
