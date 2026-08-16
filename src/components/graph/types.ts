/** Shape serialized into the page as JSON for the client script to read. */
export interface GraphNodeData {
  id: string;
  type: "core" | "branch" | "project";
  parentId: string | null;
  route?: string;
  label?: {
    title: string;
    meta?: string;
    dockCopy?: string;
  };
  layout: {
    mode: "fixed" | "auto";
    position?: { x: number; y: number };
    angleHint?: number;
  };
  pinned: boolean;
  order?: number;
  status?: "active" | "wip" | "planned" | "archived";
  relations: { targetId: string; kind: "related" | "powers" | "depends-on" }[];
}

/** A node after the layout engine has resolved a concrete 0..1 position. */
export interface ResolvedNode extends GraphNodeData {
  resolvedPosition: { x: number; y: number };
}
