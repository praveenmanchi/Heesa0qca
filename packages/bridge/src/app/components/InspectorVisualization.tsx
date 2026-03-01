import React, { useEffect, useState, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionLineType,
  MarkerType,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';

import {
  Text, Spinner,
} from '@tokens-studio/ui';
import Box from './Box';
import { AsyncMessageChannel } from '@/AsyncMessageChannel';
import {
  AsyncMessageTypes,
  type SelectionVisualizationNode,
} from '@/types/AsyncMessages';
import { FONT_SIZE } from '@/constants/UIConstants';
import { GraphSidebar } from './VisualizationGraph/GraphSidebar';
import { ComponentNode } from './VisualizationGraph/ComponentNode';
import { VariableNode } from './VisualizationGraph/VariableNode';
import { VariableGroupNode } from './VisualizationGraph/VariableGroupNode';
import ModeImpactPanel, { type ImpactData } from './VisualizationGraph/ModeImpactPanel';

const nodeTypes = {
  customComponent: ComponentNode,
  customVariable: VariableNode,
  customGroup: VariableGroupNode,
};

import dagre from 'dagre';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

// Dagre Layout Engine
export function getLayoutedElements(nodes: any[], edges: any[], direction = 'LR') {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    let width = 150;
    let height = 50;
    if (node.type === 'customComponent') {
      width = 200;
      height = 60;
    } else if (node.type === 'customVariable') {
      width = 200;
      height = 50;
    } else if (node.type === 'customGroup') {
      width = 260;
      height = parseInt(node.style?.height || 200, 10);
    }
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newNode = { ...node };

    let width = 150;
    let height = 50;
    if (node.type === 'customComponent') { width = 200; height = 60; } else if (node.type === 'customVariable') { width = 200; height = 50; } else if (node.type === 'customGroup') { width = 260; height = parseInt(node.style?.height || 200, 10); }

    newNode.position = {
      x: nodeWithPosition.x - width / 2,
      y: nodeWithPosition.y - height / 2,
    };

    if (newNode.parentId) {
      delete newNode.parentId;
      delete newNode.extent;
    }

    return newNode;
  });

  return { nodes: layoutedNodes, edges, isHorizontal };
}

function initialLayoutGraph(rootComponent: SelectionVisualizationNode) {
  const nodes: any[] = [];
  const edges: any[] = [];

  // Root Component Node
  nodes.push({
    id: `comp-${rootComponent.id}`,
    type: 'customComponent',
    position: { x: 0, y: 0 },
    data: { label: rootComponent.name || rootComponent.type, count: 1, figmaNodeId: rootComponent.id },
  });

  rootComponent.variables.forEach((v) => {
    const varId = `var-${v.variableId}`;
    nodes.push({
      id: varId,
      type: 'customVariable',
      position: { x: 0, y: 0 },
      data: {
        label: v.variableName,
        resolvedType: v.resolvedType,
        collectionName: v.collectionName,
        totalCount: v.totalCount,
        variableId: v.variableId,
      },
    });

    edges.push({
      id: `edge-${rootComponent.id}-${v.variableId}`,
      source: `comp-${rootComponent.id}`,
      target: varId,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#8b5cf6', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
    });
  });

  return getLayoutedElements(nodes, edges);
}

function InspectorVisualizationInner() {
  const { fitView } = useReactFlow();
  const [root, setRoot] = useState<SelectionVisualizationNode | null>(null);
  const [loading, setLoading] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Mode/brand impact panel state
  const [impactPanel, setImpactPanel] = useState<ImpactData | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);

  const [filters, setFilters] = useState([
    { id: 'components', label: 'Components', active: true },
    { id: 'COLOR', label: 'Colors', active: true },
    { id: 'STRING', label: 'Text/Strings', active: true },
    { id: 'FLOAT', label: 'Numbers/Dimensions', active: true },
    { id: 'BOOLEAN', label: 'Booleans', active: true },
  ]);

  const loadSelection = useCallback(() => {
    setLoading(true);
    AsyncMessageChannel.ReactInstance.message({
      type: AsyncMessageTypes.GET_SELECTION_VISUALIZATION,
    }).then((res: any) => {
      setRoot(res.root ?? null);
      if (res.root) {
        const { nodes: newNodes, edges: newEdges } = initialLayoutGraph(res.root);
        setNodes(newNodes);
        setEdges(newEdges);
      } else {
        setNodes([]);
        setEdges([]);
      }
    }).catch(() => {
      setRoot(null);
    }).finally(() => {
      setLoading(false);
    });
  }, [setNodes, setEdges]);

  useEffect(() => {
    loadSelection();
  }, [loadSelection]);

  const toggleFilter = useCallback((id: string, active: boolean) => {
    setFilters((prev) => prev.map((f) => (f.id === id ? { ...f, active } : f)));
  }, []);

  // Sync the `hidden` property on nodes based on active filters
  useEffect(() => {
    const activeTypeFilters = filters.filter((f) => f.active).map((f) => f.id);
    setNodes((nds) => nds.map((n) => {
      let isHidden = false;
      if (n.type === 'customComponent') isHidden = !activeTypeFilters.includes('components');
      if (n.type === 'customVariable') isHidden = !(activeTypeFilters.includes(n.data.resolvedType as string) || activeTypeFilters.includes('UNKNOWN'));

      if (n.hidden !== isHidden) {
        return { ...n, hidden: isHidden };
      }
      return n;
    }));
  }, [filters, setNodes]);

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: any) => {
    // 1. Variable Node clicked — show mode/brand impact + find all components using this variable
    if (node.type === 'customVariable') {
      const { variableId } = node.data;
      if (!variableId) return;

      // Highlight clicked node
      setNodes((nds) => nds.map((n) => (n.id === node.id
        ? { ...n, style: { ...n.style, border: '2px solid #8b5cf6' } }
        : { ...n, style: { ...n.style, border: undefined } })));

      // Open impact panel immediately in loading state
      setImpactPanel({
        variableId,
        variableName: node.data.label,
        collectionName: node.data.collectionName ?? '',
        resolvedType: node.data.resolvedType,
        totalCount: node.data.totalCount ?? 0,
        components: [],
        modes: [],
      });
      setImpactLoading(true);

      AsyncMessageChannel.ReactInstance.message({
        type: AsyncMessageTypes.CALCULATE_VARIABLES_IMPACT,
        variableIds: [variableId],
      }).then((res: any) => {
        if (!res.variables || res.variables.length === 0) {
          setImpactLoading(false);
          return;
        }
        const targetVar = res.variables[0];
        if (!targetVar) { setImpactLoading(false); return; }

        // Update the panel with real data
        setImpactPanel({
          variableId,
          variableName: targetVar.variableName ?? node.data.label,
          collectionName: targetVar.collectionName ?? node.data.collectionName ?? '',
          resolvedType: targetVar.resolvedType ?? node.data.resolvedType,
          totalCount: targetVar.totalCount ?? 0,
          components: targetVar.components ?? [],
          modes: targetVar.modes ?? [],
        });

        // Also draw green arrows to component nodes in the graph
        const newNodes = [...nodes];
        const newEdges = [...edges];
        let addedSomething = false;

        (targetVar.components ?? []).forEach((comp: any, index: number) => {
          const existingNode = newNodes.find((n) => n.type === 'customComponent' && n.data.label === comp.componentName);
          const targetNode = existingNode ?? (() => {
            const created = {
              id: `depcomp-${variableId}-${index}`,
              type: 'customComponent',
              position: { x: 0, y: 0 },
              data: { label: comp.componentName, count: comp.nodeIds.length, figmaNodeId: comp.nodeIds[0] },
              hidden: !filters.find((f) => f.id === 'components')?.active,
            };
            newNodes.push(created);
            addedSomething = true;
            return created;
          })();

          const edgeId = `edge-${variableId}-${targetNode.id}`;
          if (!newEdges.find((e) => e.id === edgeId)) {
            newEdges.push({
              id: edgeId,
              source: node.id,
              target: targetNode.id,
              type: 'smoothstep',
              animated: true,
              style: { stroke: '#10b981', strokeWidth: 2, strokeDasharray: '5,5' },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
            });
            addedSomething = true;
          }
        });

        // Update usage count badge
        const baseNodes = addedSomething ? newNodes : [...nodes];
        const updatedNodes = baseNodes.map((n) => (n.id === node.id
          ? { ...n, data: { ...n.data, totalCount: targetVar.totalCount } }
          : n));

        if (addedSomething) {
          const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(updatedNodes, newEdges);
          setNodes(layoutedNodes);
          setEdges(layoutedEdges);
          setTimeout(() => window.requestAnimationFrame(() => fitView({ padding: 0.2, duration: 800 })), 50);
        } else {
          setNodes(updatedNodes);
        }
      }).catch(console.error).finally(() => setImpactLoading(false));
    }

    // 2. Component Node clicked — spawn its attached variables
    if (node.type === 'customComponent') {
      const figmaNodeId = node.data.figmaNodeId || node.id.replace('comp-', '');
      if (!figmaNodeId) return;

      setNodes((nds) => nds.map((n) => (n.id === node.id
        ? { ...n, style: { ...n.style, border: '2px solid #8b5cf6' } }
        : n)));

      AsyncMessageChannel.ReactInstance.message({
        type: AsyncMessageTypes.GET_NODE_VARIABLES,
        nodeId: figmaNodeId,
      }).then((res: any) => {
        if (!res.root || !res.root.variables || res.root.variables.length === 0) return;

        const newNodes = [...nodes];
        const newEdges = [...edges];
        let addedSomething = false;

        res.root.variables.forEach((v: any, index: number) => {
          let targetVarNode = newNodes.find((n) => n.type === 'customVariable' && n.data.variableId === v.variableId);

          if (!targetVarNode) {
            const varId = `spawn-var-${node.id}-${v.variableId}-${index}`;
            targetVarNode = {
              id: varId,
              type: 'customVariable',
              position: { x: 0, y: 0 },
              data: {
                label: v.variableName,
                resolvedType: v.resolvedType,
                collectionName: v.collectionName,
                totalCount: v.totalCount,
                variableId: v.variableId,
              },
              hidden: !(
                filters.find((f) => f.id === v.resolvedType)?.active
                || filters.find((f) => f.id === 'UNKNOWN')?.active
              ),
            };
            newNodes.push(targetVarNode);
            addedSomething = true;
          }

          const edgeId = `edge-${node.id}-${targetVarNode.id}`;
          if (!newEdges.find((e) => e.id === edgeId)) {
            newEdges.push({
              id: edgeId,
              source: node.id,
              target: targetVarNode.id,
              type: 'smoothstep',
              animated: true,
              style: { stroke: '#8b5cf6', strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
            });
            addedSomething = true;
          }
        });

        if (addedSomething) {
          const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges);
          setNodes(layoutedNodes);
          setEdges(layoutedEdges);
          setTimeout(() => window.requestAnimationFrame(() => fitView({ padding: 0.2, duration: 800 })), 50);
        }
      }).catch(console.error);
    }
  }, [nodes, edges, setNodes, setEdges, fitView, filters]);

  const handleClosePanel = useCallback(() => {
    setImpactPanel(null);
    // Remove highlight from all nodes
    setNodes((nds) => nds.map((n) => ({ ...n, style: { ...n.style, border: undefined } })));
  }, [setNodes]);

  return (
    <Box
      css={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'row',
        height: '100%',
        borderTop: '1px solid $borderSubtle',
        backgroundColor: '$bgDefault',
        overflow: 'hidden',
      }}
    >
      <GraphSidebar types={filters} onToggle={toggleFilter} />

      <Box css={{ flexGrow: 1, position: 'relative', overflow: 'hidden' }}>
        {loading && (
          <Box css={{
            position: 'absolute', top: '$4', left: '$4', zIndex: 10, display: 'flex', alignItems: 'center', gap: '$2', color: '$fgSubtle',
          }}
          >
            <Spinner />
            <Text css={{ fontSize: FONT_SIZE.sm }}>Loading visualization…</Text>
          </Box>
        )}

        {!loading && !root && (
          <Box css={{ padding: '$4', fontSize: FONT_SIZE.sm, color: '$fgSubtle' }}>
            Select a single component, instance, or frame to see its visualization.
          </Box>
        )}

        {(!loading || nodes.length > 0) && root && (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            fitView
            connectionLineType={ConnectionLineType.SmoothStep}
          >
            <Background color="#ccc" gap={16} size={1} />
            <Controls />
            <MiniMap
              nodeColor={(n: any) => {
                if (n.type === 'customComponent') return '#8b5cf6';
                if (n.type === 'customVariable') return '#10b981';
                return '#cbd5e1';
              }}
            />
          </ReactFlow>
        )}

        {/* Mode / Brand Impact Panel — slides in from the right */}
        {impactPanel && (
          <ModeImpactPanel
            data={impactPanel}
            loading={impactLoading}
            onClose={handleClosePanel}
          />
        )}
      </Box>
    </Box>
  );
}

export default function InspectorVisualization() {
  return (
    <ReactFlowProvider>
      <InspectorVisualizationInner />
    </ReactFlowProvider>
  );
}
