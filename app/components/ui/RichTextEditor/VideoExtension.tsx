"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface VideoAttrs {
  src: string;
  controls: boolean;
  width: number | null;
  height: number | null;
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    video: {
      setVideo: (attrs: Partial<VideoAttrs> & { src: string }) => ReturnType;
    };
  }
}

// ─── NodeView ─────────────────────────────────────────────────────────────────

function VideoNodeView({ node }: NodeViewProps) {
  const { src, controls, width, height, autoplay, loop, muted } =
    node.attrs as VideoAttrs;

  return (
    <NodeViewWrapper>
      <div className="my-2" contentEditable={false}>
        <video
          src={src}
          controls={controls}
          autoPlay={autoplay}
          loop={loop}
          muted={muted}
          width={width ?? undefined}
          height={height ?? undefined}
          style={{ maxWidth: "100%", display: "block" }}
        />
      </div>
    </NodeViewWrapper>
  );
}

// ─── TipTap Extension ─────────────────────────────────────────────────────────

export const VideoExtension = Node.create({
  name: "video",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src:      { default: null },
      controls: { default: true },
      width:    { default: null },
      height:   { default: null },
      autoplay: { default: false },
      loop:     { default: false },
      muted:    { default: false },
    };
  },

  parseHTML() {
    return [{ tag: "video[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["video", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoNodeView);
  },

  addCommands() {
    return {
      setVideo:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: "video", attrs }),
    };
  },
});
