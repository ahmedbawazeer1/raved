import { useEffect, useMemo, useRef, useState, type ComponentType, type Ref } from "react";
import { Modal, Pressable, View } from "react-native";
import { WebView, type WebViewMessageEvent, type WebViewProps } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { VideoBlock } from "@shared/content/types";
import type { GameWord } from "@shared/games/logic";
import { addSecond, watchedSeconds, type WatchRanges } from "@shared/gamification/watch";
import { checkpointsFor, dueCheckpoint, formatTime, type Checkpoint } from "@shared/lesson/player";
import { WEB_URL } from "@/config";
import { fx } from "@/lib/fx";
import { supabase } from "@/lib/supabase";
import { Button, colors, fonts, radius, Text } from "@/ui";

// react-native-webview's class typings do not match React 19.3's yet; the runtime component is fine.
const YouTubeView = WebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebView> }>;

export interface VideoStatus {
  watched: number;
  duration: number;
  done: boolean;
}

/** YouTube's own player inside the app, without the seek bar (no skipping ahead), reporting the time every second. */
function playerHtml(id: string, start: number, end: number | undefined): string {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;background:#000;height:100%}#p{position:absolute;inset:0}</style></head><body><div id="p"></div>
<script src="https://www.youtube.com/iframe_api"></script><script>
var player;function send(m){window.ReactNativeWebView.postMessage(JSON.stringify(m))}
function onYouTubeIframeAPIReady(){player=new YT.Player('p',{videoId:'${id}',playerVars:{controls:0,disablekb:1,playsinline:1,rel:0,modestbranding:1,start:${start}${end ? `,end:${end}` : ""}},
events:{onReady:function(){send({type:'ready',duration:player.getDuration()})},onStateChange:function(e){send({type:'state',state:e.data})}}});
setInterval(function(){if(player&&player.getCurrentTime){send({type:'tick',t:player.getCurrentTime(),state:player.getPlayerState(),duration:player.getDuration()})}},1000)}
</script></body></html>`;
}

/**
 * A mandatory lesson video: only seconds really played count (80% unlocks the lesson, checked by the
 * server in record_video_watch), and it pauses for surprise questions about the part just watched.
 */
export function LessonVideo({
  block,
  words,
  status,
  onStatus,
}: {
  block: VideoBlock;
  words: GameWord[];
  status?: VideoStatus;
  onStatus: (s: VideoStatus) => void;
}) {
  const id = block.youtube_id!;
  const start = block.start_sec ?? 0;
  const web = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(block.end_sec && block.start_sec !== undefined ? block.end_sec - block.start_sec : (block.duration_sec ?? 0));
  const [ranges, setRanges] = useState<WatchRanges>([]);
  const [question, setQuestion] = useState<Checkpoint | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const answered = useRef(new Set<number>());
  const prev = useRef(0);
  const lastSent = useRef(0);
  const key = `raved:watch:${id}`;
  const checkpoints = useMemo(() => checkpointsFor(id, duration, block.checkpoints, words), [id, duration, block.checkpoints, words]);

  useEffect(() => {
    void AsyncStorage.getItem(key).then((raw) => {
      try {
        if (raw) setRanges(JSON.parse(raw) as WatchRanges);
      } catch {
        // start fresh
      }
    });
  }, [key]);

  const run = (js: string) => web.current?.injectJavaScript(`try{${js}}catch(e){};true;`);

  async function report(next: WatchRanges) {
    const seconds = watchedSeconds(next);
    if (seconds - lastSent.current < 10) return;
    lastSent.current = seconds;
    const { data } = await supabase.rpc("record_video_watch", { p_youtube_id: id, p_watched_sec: Math.floor(seconds) });
    const d = data as { watched_sec: number; duration_sec: number; done: boolean } | null;
    if (d) onStatus({ watched: d.watched_sec, duration: d.duration_sec, done: d.done });
  }

  function onMessage(e: WebViewMessageEvent) {
    const m = JSON.parse(e.nativeEvent.data) as { type: string; t?: number; state?: number; duration?: number };
    if (m.type === "ready") {
      setReady(true);
      if (m.duration && !block.end_sec) setDuration(Math.floor(m.duration - start));
    }
    if (m.type === "state") setPlaying(m.state === 1);
    if (m.type === "tick" && m.state === 1 && typeof m.t === "number") {
      const now = m.t - start;
      const due = dueCheckpoint(checkpoints, prev.current, now, answered.current);
      prev.current = now;
      if (due) {
        run("player.pauseVideo()");
        setPicked(null);
        setQuestion(due);
        return;
      }
      setRanges((r) => {
        const next = addSecond(r, now);
        void AsyncStorage.setItem(key, JSON.stringify(next));
        void report(next);
        return next;
      });
    }
  }

  const seen = watchedSeconds(ranges);
  const pct = duration ? Math.min(100, Math.round((seen / duration) * 100)) : 0;
  const done = status?.done || (block.needs_check ?? false);

  return (
    <View style={{ gap: 10 }}>
      <View style={{ aspectRatio: 16 / 9, borderRadius: radius.lg, overflow: "hidden", backgroundColor: "#000" }}>
        <YouTubeView
          ref={web}
          source={{ html: playerHtml(id, start, block.end_sec), baseUrl: WEB_URL }}
          onMessage={onMessage}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          style={{ backgroundColor: "#000" }}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button
            title={playing ? "إيقاف مؤقت" : seen > 0 ? "تابع المشاهدة" : "شاهد الدرس"}
            disabled={!ready}
            onPress={() => run(playing ? "player.pauseVideo()" : "player.playVideo()")}
          />
        </View>
      </View>
      <View style={{ height: 8, borderRadius: 999, backgroundColor: colors.border, overflow: "hidden" }}>
        <View style={{ width: `${pct}%`, height: "100%", backgroundColor: done ? colors.success : colors.accent }} />
      </View>
      <Text variant="small">
        {done ? "✅ شاهدت الفيديو، يمكنك إكمال الدرس" : `شاهدت ${pct}% · المطلوب 80% · المدة ${formatTime(duration)}`}
        {block.channel ? ` · ${block.channel}` : ""}
      </Text>

      <Modal visible={question !== null} transparent animationType="fade" onRequestClose={() => undefined}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,.55)", justifyContent: "center", padding: 20 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: radius.xl, padding: 20, gap: 12 }}>
            <Text variant="small">سؤال مفاجئ ⚡</Text>
            <Text style={{ fontFamily: fonts.bold, fontSize: 18 }}>{question?.prompt}</Text>
            {question?.options.map((o, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  setPicked(i);
                  fx(i === question.answer ? "good" : "bad");
                }}
                style={{
                  minHeight: 48,
                  justifyContent: "center",
                  paddingHorizontal: 14,
                  borderRadius: radius.md,
                  borderWidth: 2,
                  borderColor: picked === i ? (i === question.answer ? colors.success : colors.error) : colors.border,
                  backgroundColor: picked === i ? (i === question.answer ? colors.successTint : colors.errorTint) : colors.card,
                }}
              >
                <Text variant={/[A-Za-z]/.test(o) ? "en" : "body"}>{o}</Text>
              </Pressable>
            ))}
            {picked !== null && picked !== question?.answer ? <Text style={{ color: colors.error }}>حاول مرة أخرى.</Text> : null}
            {picked === question?.answer ? (
              <>
                {question?.explanation ? <Text variant="muted">{question.explanation}</Text> : null}
                <Button
                  title="تابع المشاهدة"
                  onPress={() => {
                    answered.current.add(question!.at);
                    setQuestion(null);
                    run("player.playVideo()");
                  }}
                />
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}
