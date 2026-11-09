import { useCallback, useEffect, useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { router } from "expo-router";
import {
  answerSchema,
  arenaError,
  finishSchema,
  GAME_INFO,
  opponentAt,
  runSchema,
  type ArenaFinish,
  type ArenaGame,
  type ArenaMode,
  type ArenaQuestion,
  type ArenaRun,
} from "@shared/arena/games";
import { fx } from "@/lib/fx";
import { usePrefs } from "@/lib/prefs";
import { speak } from "@/lib/speech";
import { supabase } from "@/lib/supabase";
import { Bottle, Button, Card, Chip, colors, Face, FullAvatar, radius, RafedArt, Row, Text, type ChipState } from "@/ui";

type Phase = "mode" | "search" | "vs" | "play" | "done";
interface Feedback {
  ok: boolean;
  answer: string | null;
  given: string;
}

const stateOf = (i: number, fb: Feedback | null): ChipState => (!fb ? "idle" : String(i) === fb.answer ? "right" : String(i) === fb.given ? "wrong" : "dim");

/** One question of any of the five games. */
function Question({ game, q, onAnswer, feedback }: { game: ArenaGame; q: ArenaQuestion; onAnswer: (a: string) => void; feedback: Feedback | null }) {
  const [picked, setPicked] = useState<number[]>([]);
  const [text, setText] = useState("");
  const done = useRef(false);
  useEffect(() => {
    done.current = false;
    if (game === "echo" && q.say) speak(q.say, 0.85);
    if (game !== "errors") return;
    // The sentence reaches the dam after 8 seconds.
    const t = setTimeout(() => {
      if (!done.current) {
        done.current = true;
        onAnswer("-1");
      }
    }, 8000);
    return () => clearTimeout(t);
  }, [game, q, onAnswer]);
  const once = (a: string) => {
    if (done.current) return;
    done.current = true;
    onAnswer(a);
  };

  if (game === "drops" || game === "net")
    return (
      <View style={{ gap: 12 }}>
        <Card tone="primary" style={{ alignItems: "center" }}>
          {game === "net" ? <Text variant="muted">اصطد:</Text> : null}
          <Text variant={game === "drops" ? "en" : "heading"} style={{ fontSize: 28, lineHeight: 40, textAlign: "center", fontWeight: "700" }}>
            {q.prompt}
          </Text>
        </Card>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {(q.options ?? []).map((o, i) => (
            <View key={i} style={{ width: "47%" }}>
              <Chip label={o} en={game === "net"} state={stateOf(i, feedback)} disabled={!!feedback} onPress={() => once(String(i))} />
            </View>
          ))}
        </View>
      </View>
    );
  if (game === "errors")
    return (
      <View style={{ gap: 12 }}>
        <Text variant="muted">في الجملة كلمة واحدة خطأ. اضغطها قبل السدّ!</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, direction: "ltr" }}>
          {(q.words ?? []).map((w, i) => (
            <Chip
              key={i}
              label={w}
              en
              state={stateOf(i, feedback) === "dim" ? "idle" : stateOf(i, feedback)}
              disabled={!!feedback}
              onPress={() => once(String(i))}
            />
          ))}
        </View>
      </View>
    );
  if (game === "bridge") {
    const tiles = q.tiles ?? [];
    return (
      <View style={{ gap: 12 }}>
        <Card style={{ minHeight: 70, flexDirection: "row", flexWrap: "wrap", gap: 6, direction: "ltr" }}>
          {picked.map((k, j) => (
            <Chip key={j} label={tiles[k]} en disabled={!!feedback} onPress={() => setPicked(picked.filter((_, x) => x !== j))} />
          ))}
        </Card>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, direction: "ltr" }}>
          {tiles.map((t, k) => (picked.includes(k) ? null : <Chip key={k} label={t} en disabled={!!feedback} onPress={() => setPicked([...picked, k])} />))}
        </View>
        {feedback && !feedback.ok && feedback.answer ? (
          <Card tone="primary">
            <Text variant="en">{feedback.answer}</Text>
          </Card>
        ) : null}
        <Button title="تحقّق" disabled={!!feedback || picked.length < tiles.length} onPress={() => once(picked.map((k) => tiles[k]).join(" "))} />
      </View>
    );
  }
  return (
    <View style={{ gap: 12 }}>
      <Button title="🔊 استمع" variant="secondary" onPress={() => q.say && speak(q.say, 0.85)} />
      <TextInput
        value={text}
        onChangeText={setText}
        editable={!feedback}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Type what you hear…"
        accessibilityLabel="اكتب ما سمعت"
        style={{
          minHeight: 52,
          borderWidth: 2,
          borderColor: colors.border,
          borderRadius: radius.md,
          paddingHorizontal: 14,
          fontSize: 18,
          backgroundColor: colors.card,
          textAlign: "left",
        }}
      />
      {feedback && !feedback.ok && feedback.answer ? (
        <Card tone="primary">
          <Text variant="en">{feedback.answer}</Text>
        </Card>
      ) : null}
      <Button title="تحقّق" disabled={!!feedback || !text.trim()} onPress={() => once(text)} />
    </View>
  );
}

/** The arena match: mode → searching → «ضد!» → play (both bottles fill) → result. Graded by the database. */
export function ArenaMatch({ game }: { game: ArenaGame }) {
  const prefs = usePrefs();
  const [phase, setPhase] = useState<Phase>("mode");
  const [mode, setMode] = useState<ArenaMode>("online");
  const [run, setRun] = useState<ArenaRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [right, setRight] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [opp, setOpp] = useState({ answered: 0, right: 0 });
  const [result, setResult] = useState<ArenaFinish | null>(null);
  const started = useRef(0);
  const busy = useRef(false);

  const begin = async (m: ArenaMode) => {
    setMode(m);
    setError(null);
    setPhase("search");
    const [{ data, error: e }] = await Promise.all([supabase.rpc("arena_start", { p_game: game, p_mode: m }), new Promise((r) => setTimeout(r, 1200))]);
    const parsed = runSchema.safeParse(data);
    if (e || !parsed.success) {
      setError(arenaError(e?.message));
      setPhase("mode");
      return;
    }
    setRun(parsed.data);
    setIndex(0);
    setRight(0);
    setFeedback(null);
    setOpp({ answered: 0, right: 0 });
    setResult(null);
    setPhase("vs");
    fx("pop");
  };

  useEffect(() => {
    if (phase !== "vs") return;
    const t = setTimeout(() => {
      started.current = Date.now();
      setPhase("play");
    }, 3000);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "play" || !run) return;
    const t = setInterval(() => setOpp(opponentAt(run.opponent, Date.now() - started.current)), 300);
    return () => clearInterval(t);
  }, [phase, run]);

  const onAnswer = useCallback(
    async (answer: string) => {
      if (!run || busy.current) return;
      busy.current = true;
      const { data } = await supabase.rpc("arena_answer", { p_run: run.id, p_index: index, p_answer: answer.slice(0, 300) });
      const r = answerSchema.safeParse(data);
      const ok = r.success && r.data.ok;
      setFeedback({ ok, answer: r.success ? r.data.answer : null, given: answer });
      if (ok) setRight((n) => n + 1);
      fx(ok ? "good" : "bad");
      setTimeout(
        async () => {
          busy.current = false;
          setFeedback(null);
          if (index + 1 < run.total) return setIndex((i) => i + 1);
          const { data: f } = await supabase.rpc("arena_finish", { p_run: run.id });
          const fin = finishSchema.safeParse(f);
          setResult(fin.success ? fin.data : null);
          setOpp({ answered: run.opponent.timeline?.length ?? 0, right: run.opponent.score });
          setPhase("done");
          fx(fin.success && fin.data.won ? "coin" : "pop");
        },
        ok ? 650 : 1500,
      );
    },
    [run, index],
  );

  const bot = run?.opponent.kind !== "ghost";
  if (phase === "mode")
    return (
      <View style={{ gap: 12 }}>
        <Card>
          <Text variant="heading">{GAME_INFO[game].name}</Text>
          <Text variant="muted">{GAME_INFO[game].howTo}</Text>
        </Card>
        {error ? (
          <Card tone="warning">
            <Text accessibilityRole="alert">{error}</Text>
          </Card>
        ) : null}
        <Button title="🌐 أونلاين · خصم من مستواك" onPress={() => void begin("online")} />
        <Button title="🤖 ضد الروبوت" variant="secondary" onPress={() => void begin("bot")} />
        <Button title="⚔️ مع صديق · برمز التحدي" variant="secondary" onPress={() => router.push("/duel")} />
      </View>
    );
  if (phase === "search")
    return (
      <View style={{ alignItems: "center", gap: 16, paddingVertical: 40 }} accessibilityLiveRegion="polite">
        <FullAvatar avatar={prefs.avatar} height={130} />
        <Text variant="heading">{mode === "online" ? "نبحث عن خصم…" : "نجهّز الروبوت…"}</Text>
        <Text variant="muted">من مستواك</Text>
      </View>
    );
  if (!run) return null;
  if (phase === "vs")
    return (
      <View style={{ alignItems: "center", gap: 16, paddingVertical: 30 }} accessibilityLiveRegion="polite">
        <Row gap={24}>
          <View style={{ alignItems: "center" }}>
            <FullAvatar avatar={prefs.avatar} height={120} />
            <Text style={{ fontWeight: "700" }}>أنت</Text>
          </View>
          <Text variant="title" style={{ color: colors.accent }}>
            ضد!
          </Text>
          <View style={{ alignItems: "center" }}>
            {bot ? <RafedArt size={110} /> : <FullAvatar avatar={run.opponent.avatar} height={120} />}
            <Text style={{ fontWeight: "700" }}>{run.opponent.name}</Text>
          </View>
        </Row>
        {run.opponent.fallback ? <Text variant="small">لم نجد أحداً الآن، فستلعب ضد الروبوت.</Text> : null}
        <Text variant="muted">استعد…</Text>
      </View>
    );
  if (phase === "play")
    return (
      <View style={{ gap: 14 }}>
        <Card tone="primary" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <Bottle value={right} total={run.total} color="#1C6FA3" label="أنت" />
          <View style={{ alignItems: "center", paddingBottom: 20 }}>
            <Text style={{ fontWeight: "700" }}>{GAME_INFO[game].name}</Text>
            <Text variant="en">
              {index + 1} / {run.total}
            </Text>
          </View>
          <Bottle value={opp.right} total={run.total} color="#C77F06" label={run.opponent.name} />
        </Card>
        <Question key={index} game={game} q={run.questions[index]} onAnswer={onAnswer} feedback={feedback} />
      </View>
    );
  const won = Boolean(result?.won);
  return (
    <View style={{ gap: 14, alignItems: "stretch" }}>
      <Row gap={24}>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Face avatar={prefs.avatar} size={70} />
        </View>
        <View style={{ flex: 1, alignItems: "center" }}>
          {bot ? <RafedArt size={80} mood={won ? "sad" : "happy"} /> : <Face avatar={run.opponent.avatar} size={70} />}
        </View>
      </Row>
      <Text variant="title" style={{ textAlign: "center" }}>
        {won ? "فزت!" : result && Math.abs(result.score - result.opponent_score) <= 1 ? "خسارة قريبة!" : "المرة القادمة لك!"}
      </Text>
      {result ? (
        <Row>
          <Card style={{ flex: 1, alignItems: "center" }}>
            <Text variant="small">نتيجتك</Text>
            <Text variant="title">{result.score}</Text>
          </Card>
          <Card style={{ flex: 1, alignItems: "center" }}>
            <Text variant="small">الخصم</Text>
            <Text variant="title">{result.opponent_score}</Text>
          </Card>
          <Card tone="primary" style={{ flex: 1, alignItems: "center" }}>
            <Text variant="small">قطرات</Text>
            <Text variant="title" style={{ color: colors.primary }}>
              +{result.drops}
            </Text>
          </Card>
        </Row>
      ) : (
        <Text variant="muted">تعذّر حفظ النتيجة. تحقّق من الاتصال.</Text>
      )}
      <Button title={won ? "العب مرة أخرى" : "حاول مرة أخرى"} onPress={() => void begin(mode)} />
      <Button title="الساحة" variant="secondary" onPress={() => router.back()} />
    </View>
  );
}
