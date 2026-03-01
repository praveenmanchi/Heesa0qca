import React, { useCallback } from 'react';
import { Badge, Spinner } from '@tokens-studio/ui';
import { Xmark } from 'iconoir-react';
import Box from '../Box';
import Stack from '../Stack';
import { AsyncMessageChannel } from '@/AsyncMessageChannel';
import { AsyncMessageTypes } from '@/types/AsyncMessages';
import { FONT_SIZE } from '@/constants/UIConstants';

export interface ComponentUsage {
  componentName: string;
  nodeIds: string[];
}

export interface ModeValue {
  modeId: string;
  modeName: string;
  value: any;
}

export interface ImpactData {
  variableId: string;
  variableName: string;
  collectionName: string;
  resolvedType?: string;
  totalCount: number;
  components: ComponentUsage[];
  modes: ModeValue[];
}

interface Props {
  data: ImpactData;
  loading: boolean;
  onClose: () => void;
}

/** Render a color swatch if value looks like a Figma color object */
function ColorSwatch({ value }: { value: any }) {
  if (!value || typeof value !== 'object') return null;
  const { r, g, b, a } = value as { r?: number; g?: number; b?: number; a?: number };
  if (r === undefined || g === undefined || b === undefined) return null;
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  return (
    <Box
      css={{
        width: '14px',
        height: '14px',
        borderRadius: '3px',
        background: hex,
        border: '1px solid $borderMuted',
        flexShrink: 0,
      }}
    />
  );
}

/** Format a variable value for display */
function formatValue(value: any, resolvedType?: string): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') {
    if ('type' in value && value.type === 'VARIABLE_ALIAS') return `→ ${value.id}`;
    if ('r' in value) {
      const { r, g, b, a } = value;
      const toHex = (n: number) => Math.round((n ?? 0) * 255).toString(16).padStart(2, '0');
      const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      return a !== undefined && a < 1 ? `${hex} / ${Math.round(a * 100)}%` : hex;
    }
    return JSON.stringify(value);
  }
  if (resolvedType === 'FLOAT' && typeof value === 'number') return `${value}`;
  return String(value);
}

export default function ModeImpactPanel({ data, loading, onClose }: Props) {
  const handleSelectNodes = useCallback((nodeIds: string[]) => {
    AsyncMessageChannel.ReactInstance.message({
      type: AsyncMessageTypes.SELECT_NODES,
      ids: nodeIds,
    });
  }, []);

  return (
    <Box
      css={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: '280px',
        zIndex: 20,
        background: '$bgCanvas',
        borderLeft: '1px solid $borderSubtle',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-4px 0 16px rgba(0,0,0,0.18)',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <Box
        css={{
          padding: '$3 $4',
          borderBottom: '1px solid $borderSubtle',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '$2',
          position: 'sticky',
          top: 0,
          background: '$bgCanvas',
          zIndex: 1,
        }}
      >
        <Box css={{ flexGrow: 1, overflow: 'hidden' }}>
          <Box css={{ fontSize: '$bodyXs', color: '$fgSubtle', marginBottom: '2px' }}>
            {data.collectionName}
          </Box>
          <Box css={{
            fontSize: '$bodySm', fontWeight: '$sansBold', color: '$fgDefault', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
          >
            {data.variableName}
          </Box>
          <Box css={{ marginTop: '$2', display: 'flex', gap: '$2', flexWrap: 'wrap' }}>
            <Badge size="small">{data.totalCount} {data.totalCount === 1 ? 'use' : 'uses'}</Badge>
            <Badge size="small">{data.components.length} {data.components.length === 1 ? 'component' : 'components'}</Badge>
          </Box>
        </Box>
        <Box
          as="button"
          onClick={onClose}
          css={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '$fgMuted',
            padding: '$1',
            borderRadius: '$small',
            display: 'flex',
            alignItems: 'center',
            '&:hover': { color: '$fgDefault', background: '$bgSubtle' },
          }}
        >
          <Xmark width={14} height={14} />
        </Box>
      </Box>

      {loading ? (
        <Box css={{ display: 'flex', alignItems: 'center', gap: '$2', padding: '$4', color: '$fgSubtle' }}>
          <Spinner />
          <Box css={{ fontSize: FONT_SIZE.sm }}>Calculating impact…</Box>
        </Box>
      ) : (
        <>
          {/* ── Mode / Brand Values ── */}
          {data.modes.length > 0 && (
            <Box css={{ padding: '$3 $4', borderBottom: '1px solid $borderSubtle' }}>
              <Box css={{ fontSize: '$bodyXs', fontWeight: '$sansBold', color: '$fgSubtle', marginBottom: '$2', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Values by Mode / Brand
              </Box>
              <Stack direction="column" gap={1}>
                {data.modes.map((m) => (
                  <Box
                    key={m.modeId}
                    css={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '$1 $2',
                      borderRadius: '$small',
                      background: '$bgSubtle',
                      gap: '$2',
                    }}
                  >
                    <Box css={{ fontSize: '$bodyXs', color: '$fgMuted', flexShrink: 0, minWidth: '80px' }}>
                      {m.modeName}
                    </Box>
                    <Box css={{ display: 'flex', alignItems: 'center', gap: '$2', overflow: 'hidden' }}>
                      <ColorSwatch value={m.value} />
                      <Box css={{
                        fontSize: '$bodyXs', color: '$fgDefault', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace',
                      }}
                      >
                        {formatValue(m.value, data.resolvedType)}
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          {/* ── Components using this variable ── */}
          <Box css={{ padding: '$3 $4' }}>
            <Box css={{ fontSize: '$bodyXs', fontWeight: '$sansBold', color: '$fgSubtle', marginBottom: '$2', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Components Using This Variable
            </Box>

            {data.components.length === 0 ? (
              <Box css={{ fontSize: '$bodyXs', color: '$fgSubtle', padding: '$2 0' }}>
                No component usages found on this page.
              </Box>
            ) : (
              <Stack direction="column" gap={1}>
                {data.components.map((comp) => (
                  <Box
                    key={comp.componentName}
                    as="button"
                    onClick={() => handleSelectNodes(comp.nodeIds)}
                    css={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '$2 $3',
                      background: 'transparent',
                      border: '1px solid $borderSubtle',
                      borderRadius: '$small',
                      cursor: 'pointer',
                      textAlign: 'left',
                      gap: '$2',
                      '&:hover': { background: '$bgSubtle', borderColor: '$accentDefault' },
                    }}
                  >
                    <Box css={{
                      fontSize: '$bodyXs', color: '$fgDefault', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexGrow: 1,
                    }}
                    >
                      {comp.componentName}
                    </Box>
                    <Badge size="small">{comp.nodeIds.length}</Badge>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </>
      )}
    </Box>
  );
}
