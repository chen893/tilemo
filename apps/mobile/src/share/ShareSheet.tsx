// @tilemo/mobile — 成就卡片分享浮层。
// Modal + ShareCardView 预览（react-native-view-shot 截图）+ expo-sharing 系统分享。
// 数据采集内联于此（避免与 Context 循环依赖）；theme 取 useTheme() 的当前 mode。
//
// ⚠ react-native-view-shot 需原生模块 → 必须用 development build（EAS / expo run），
//   Expo Go 不支持。见 docs/share-card-prd.md §7、§10。

import { useMemo, useRef, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
  type View as RNView,
} from "react-native";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { gatherCardData, type CardData, type CardType, type MilestoneCopy } from "@tilemo/share-card";
import { ShareCardView } from "./ShareCardView";
import { useDataStore } from "../data";
import { useTheme } from "../theme";
import { Button, IconButton, fs, rd, sp } from "../ui/primitives";

export interface ShareInit {
  type: CardType;
  milestone?: MilestoneCopy;
}

const PREVIEW_W = 340; // 预览宽度；view-shot 按设备像素出图（≈ @2x/@3x），分享清晰。

function titleFor(t?: CardType): string {
  return t === "milestone" ? "里程碑" : t === "review" ? "回顾" : "今日";
}

export function ShareSheet({ init, onClose }: { init: ShareInit | null; onClose: () => void }) {
  const { colors, mode } = useTheme();
  const store = useDataStore((s) => s.store);
  const settings = useDataStore((s) => s.settings);

  const [busy, setBusy] = useState(false);
  const shotRef = useRef<RNView>(null);

  const data = useMemo<CardData | null>(
    () =>
      init && store && settings
        ? gatherCardData(store, settings, { theme: mode, type: init.type, milestone: init.milestone })
        : null,
    [init, store, settings, mode],
  );

  const capture = async (): Promise<string | null> => {
    if (!shotRef.current) return null;
    try {
      return await captureRef(shotRef, { format: "png", quality: 1, result: "tmpfile" });
    } catch (e) {
      Alert.alert("生成图片失败", e instanceof Error ? e.message : String(e));
      return null;
    }
  };

  const onShare = async () => {
    setBusy(true);
    const uri = await capture();
    setBusy(false);
    if (!uri) return;
    const available = Sharing.isAvailableAsync ? await Sharing.isAvailableAsync() : false;
    if (!available) {
      Alert.alert("无法分享", "当前设备不支持系统分享面板。");
      return;
    }
    try {
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "今天，提了么" });
    } catch {
      /* 用户取消 */
    } finally {
      // captureRef 的 tmpfile 落在缓存目录；分享后清理，避免反复分享堆积 PNG。
      FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
    }
  };

  return (
    <Modal visible={!!init} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.panel, { backgroundColor: colors.paper }]}>
          <View style={styles.head}>
            <Text style={{ color: colors.text, fontSize: fs.base, fontWeight: "600" }}>
              {titleFor(init?.type)}
            </Text>
            <IconButton colors={colors} onPress={onClose}>
              <Text style={{ color: colors.text2, fontSize: 20, lineHeight: 20 }}>×</Text>
            </IconButton>
          </View>

          <ScrollView style={{ maxHeight: "68%" }} contentContainerStyle={{ paddingBottom: sp.s3 }}>
            {data ? (
              <View style={styles.preview}>
                <View ref={shotRef} style={{ backgroundColor: colors.paper }} collapsable={false}>
                  <ShareCardView data={data} width={PREVIEW_W} />
                </View>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            <Button colors={colors} variant="solid" full disabled={busy} onPress={onShare}>
              {busy ? "处理中…" : "保存 / 分享"}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(20,16,14,0.55)",
    padding: sp.s4,
  },
  panel: { width: "92%", maxWidth: 400, borderRadius: rd.md, padding: sp.s4 },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: sp.s3,
  },
  preview: { alignItems: "center" },
  actions: { flexDirection: "row", gap: sp.s2, marginTop: sp.s3 },
});
