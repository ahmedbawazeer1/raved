import { useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { choiceRound, GAME_TITLES, sameText, scramble, shuffle, singleWords, swipeCards, type GameKind, type GameWord } from "@shared/games/logic";
import { fx } from "@/lib/fx";
import { speak } from "@/lib/speech";
import { Button, colors, fonts, radius, Text } from "@/ui";

/**
 * The vocabulary games, played with the unit's words (logic from shared/games). Each kind maps to one
 * of five play modes; when the student finishes, `onDone` is called (lesson activity or games hub).
 */
type Mode = "cards" | "meaning" | "listen" | "spell" | "swipe";
const MODE: Record<GameKind, Mode> = {
  flashcards: "cards",
  match: "meaning",
  memory: "meaning",
  speed: "meaning",
  listen: "listen",
  pronounce: "listen",
  dictation: "spell",
  spell: "spell",
  swipe: "swipe",
};
const ROUNDS = 6;

export function Game({ kind, words, title, solved, onDone }: { kind: GameKind; words: GameWord[]; title?: string; solved?: boolean; onDone: () => void }) {
  const mode = MODE[kind] ?? "meaning";
  const pool = useMemo(() => (mode === "spell" ? singleWords(words) : words), [mode, words]);
  const order = useMemo(() => shuffle(pool).slice(0, Math.min(ROUNDS, pool.length)), [pool]);
  const swipes = useMemo(() => (mode === "swipe" ? swipeCards(pool, Math.min(ROUNDS, pool.length)) : []), [mode, pool]);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(Boolean(solved));
  const info = GAME_TITLES[kind];
  const total = mode === "swipe" ? swipes.length : order.length;

  if (pool.length < 2) {
    return (
      <Shell title={title ?? info.title} hint="الكلمات غير كافية لهذه اللعبة بعد.">
        <Button title="تابع" onPress={onDone} />
      </Shell>
    );
  }

  const next = (ok: boolean) => {
    fx(ok ? "good" : "bad");
    const s = score + (ok ? 1 : 0);
    setScore(s);
    if (round + 1 >= total) {
      setFinished(true);
      fx("coin");
      onDone();
    } else setRound(round + 1);
  };

  if (finished) {
    return (
      <Shell title={title ?? info.title} hint={solved && round === 0 ? "لعبتها من قبل ✅" : `انتهت اللعبة! ${score} من ${total} 🎉`}>
        <Button
          title="العب مرة أخرى"
          variant="secondary"
          onPress={() => {
            setRound(0);
            setScore(0);
            setFinished(false);
          }}
        />
      </Shell>
    );
  }

  const target = order[round];
  return (
    <Shell title={`${info.icon} ${title ?? info.title}`} hint={info.hint} progress={`${round + 1} / ${total}`}>
      {mode === "cards" ? <Flashcard key={target.id} word={target} onNext={() => next(true)} /> : null}
      {mode === "meaning" || mode === "listen" ? <Choice key={target.id} target={target} pool={pool} listen={mode === "listen"} onAnswer={next} /> : null}
      {mode === "spell" ? <Spell key={target.id} target={target} typed={kind === "dictation"} onAnswer={next} /> : null}
      {mode === "swipe" ? <Swipe key={round} card={swipes[round]} onAnswer={next} /> : null}
    </Shell>
  );
}

function Shell({ title, hint, progress, children }: { title: string; hint: string; progress?: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.xl, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.border }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text variant="heading">{title}</Text>
        {progress ? <Text variant="small">{progress}</Text> : null}
      </View>
      <Text variant="muted">{hint}</Text>
      {children}
    </View>
  );
}

function Flashcard({ word, onNext }: { word: GameWord; onNext: () => void }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <View style={{ gap: 10 }}>
      <Pressable
        onPress={() => {
          setFlipped(!flipped);
          if (!flipped) speak(word.word);
        }}
        style={{
          minHeight: 150,
          borderRadius: radius.lg,
          backgroundColor: flipped ? colors.primaryTint : colors.primary,
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        {flipped ? (
          <>
            <Text variant="heading" style={{ textAlign: "center" }}>
              {word.meaning}
            </Text>
            {word.example ? (
              <Text variant="en" style={{ textAlign: "center", color: colors.muted }}>
                {word.example}
              </Text>
            ) : null}
          </>
        ) : (
          <Text variant="en" style={{ fontFamily: fonts.enBold, fontSize: 28, color: "#fff", textAlign: "center" }}>
            {word.word}
          </Text>
        )}
      </Pressable>
      <Button title={flipped ? "التالي" : "اقلب البطاقة"} variant={flipped ? "primary" : "secondary"} onPress={() => (flipped ? onNext() : setFlipped(true))} />
    </View>
  );
}

function Choice({ target, pool, listen, onAnswer }: { target: GameWord; pool: GameWord[]; listen: boolean; onAnswer: (ok: boolean) => void }) {
  const options = useMemo(() => choiceRound(target, pool, Math.min(4, pool.length)), [target, pool]);
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <View style={{ gap: 8 }}>
      {listen ? (
        <Button title="🔊 اسمع الكلمة" variant="secondary" onPress={() => speak(target.word)} />
      ) : (
        <Text variant="en" style={{ fontFamily: fonts.enBold, fontSize: 26, textAlign: "center" }}>
          {target.word}
        </Text>
      )}
      {options.map((o) => {
        const show = picked !== null && (o.id === target.id || o.id === picked);
        return (
          <Pressable
            key={o.id}
            disabled={picked !== null}
            onPress={() => {
              setPicked(o.id);
              setTimeout(() => onAnswer(o.id === target.id), 700);
            }}
            style={{
              minHeight: 48,
              justifyContent: "center",
              paddingHorizontal: 14,
              borderRadius: radius.md,
              borderWidth: 2,
              borderColor: show ? (o.id === target.id ? colors.success : colors.error) : colors.border,
              backgroundColor: show ? (o.id === target.id ? colors.successTint : colors.errorTint) : colors.card,
            }}
          >
            <Text>{o.meaning}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Spell({ target, typed, onAnswer }: { target: GameWord; typed: boolean; onAnswer: (ok: boolean) => void }) {
  const letters = useMemo(() => scramble(target.word.toLowerCase()), [target]);
  const [built, setBuilt] = useState<number[]>([]);
  const [text, setText] = useState("");
  const answer = typed ? text : built.map((i) => letters[i]).join("");
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ textAlign: "center" }}>{target.meaning}</Text>
      <Button title="🔊 اسمع" variant="secondary" onPress={() => speak(target.word)} />
      {typed ? (
        <TextInput
          value={text}
          onChangeText={setText}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="اكتب الكلمة"
          style={{
            minHeight: 48,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            paddingHorizontal: 12,
            fontFamily: fonts.en,
            fontSize: 18,
            textAlign: "left",
          }}
        />
      ) : (
        <>
          <Text variant="en" style={{ fontFamily: fonts.enBold, fontSize: 24, textAlign: "center", minHeight: 34 }}>
            {answer || " "}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center", direction: "ltr" }}>
            {letters.map((l, i) => (
              <Pressable
                key={i}
                disabled={built.includes(i)}
                onPress={() => setBuilt([...built, i])}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.primaryTint,
                  opacity: built.includes(i) ? 0.3 : 1,
                }}
              >
                <Text variant="en" style={{ fontFamily: fonts.enBold, textAlign: "center" }}>
                  {l}
                </Text>
              </Pressable>
            ))}
          </View>
          <Button title="امسح" variant="secondary" onPress={() => setBuilt([])} />
        </>
      )}
      <Button title="تحقق" disabled={!answer} onPress={() => onAnswer(sameText(answer, target.word))} />
    </View>
  );
}

function Swipe({ card, onAnswer }: { card: { word: GameWord; meaning: string; correct: boolean }; onAnswer: (ok: boolean) => void }) {
  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          minHeight: 130,
          borderRadius: radius.lg,
          backgroundColor: colors.primaryTint,
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          gap: 6,
        }}
      >
        <Text variant="en" style={{ fontFamily: fonts.enBold, fontSize: 24, textAlign: "center" }}>
          {card.word.word}
        </Text>
        <Text style={{ textAlign: "center" }}>= {card.meaning}</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button title="✅ صح" onPress={() => onAnswer(card.correct)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="❌ خطأ" variant="secondary" onPress={() => onAnswer(!card.correct)} />
        </View>
      </View>
    </View>
  );
}
