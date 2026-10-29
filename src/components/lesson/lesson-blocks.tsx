import { Card } from "@/components/ui/card";
import { En } from "@/components/en";
import { MixedText } from "@/components/mixed-text";
import type { LessonBlock } from "@/lib/content/types";
import { Markdown } from "./markdown";
import { AudioBlock } from "./audio-block";
import { VideoBlock, type VideoStatus } from "./video-block";
import { ExerciseBlock } from "./exercise-block";

/**
 * Renders a lesson's content blocks (student player and admin preview).
 * `videos` (student player only) makes videos mandatory and carries what the student already watched.
 */
export function LessonBlocks({ blocks, videos }: { blocks: LessonBlock[]; videos?: Record<string, VideoStatus> }) {
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "text":
            return block.markdown_ar ? (
              <Card key={i} className="p-4">
                <Markdown source={block.markdown_ar} />
              </Card>
            ) : null;
          case "table":
            return (
              <div key={i} className="overflow-x-auto rounded-2xl border border-border bg-card">
                <table className="w-full border-collapse text-[15px]">
                  {block.headers && (
                    <thead>
                      <tr className="bg-background">
                        {block.headers.map((h, hi) => (
                          <th key={hi} className="border-b border-border px-3 py-2.5 text-start text-[13px] font-semibold text-muted-foreground">
                            <MixedText text={h} />
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {(block.rows ?? []).map((row, ri) => (
                      <tr key={ri} className="border-b border-muted last:border-b-0">
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-3 py-2.5">
                            <MixedText text={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "reading":
            return block.text_en ? (
              <Card key={i} className="p-4">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">نص القراءة</p>
                <En as="div" className="text-[17px] leading-[1.8] whitespace-pre-line">
                  {block.text_en}
                </En>
              </Card>
            ) : null;
          case "audio":
            return block.text_en ? <AudioBlock key={i} text={block.text_en} /> : null;
          case "video":
            return <VideoBlock key={i} block={block} required={Boolean(videos)} status={block.youtube_id ? videos?.[block.youtube_id] : undefined} />;
          case "exercise":
            return block.exercise ? <ExerciseBlock key={i} exercise={block.exercise} /> : null;
          default:
            return null;
        }
      })}
    </div>
  );
}
