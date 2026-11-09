import { ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { GAME_INFO, isArenaGame } from "@shared/arena/games";
import { ArenaMatch } from "@/features/arena/match";
import { colors, Header, LoadError } from "@/ui";

export default function ArenaGameScreen() {
  const { game } = useLocalSearchParams<{ game: string }>();
  if (!game || !isArenaGame(game)) return <LoadError onRetry={() => undefined} />;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      <Header title={GAME_INFO[game].name} subtitle={GAME_INFO[game].tagline} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <ArenaMatch game={game} />
      </ScrollView>
    </SafeAreaView>
  );
}
