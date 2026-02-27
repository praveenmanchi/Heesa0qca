export interface NodeInfo {
  id: string
  name: string;
  type: NodeType
  /** Closest parent component/instance name, or undefined if not inside one */
  componentName?: string;
}
