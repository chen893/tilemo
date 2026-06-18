// @tilemo/mobile — 成就卡片分享浮层。
// Modal + ShareCardView 预览（react-native-view-shot 截图）+ expo-sharing 系统分享。
// 数据采集内联于此（避免与 Context 循环依赖）；theme 取 useTheme() 的当前 mode。
//
// ⚠ react-native-view-shot 需原生模块 → 必须用 development build（EAS / expo run），
//   Expo Go 不支持。见 docs/share-card-prd.md §7、§10。

import { useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
  type View as RNView,
} from "react-native";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { gatherCardData, type CardData, type CardType, type MilestoneCopy } from "@tilemo/share-card";
import { ShareCardView } from "./ShareCardView";
import { useDataStore } from "../data";
import { useTheme } from "../theme";
import { fs, sp } from "../ui/primitives";

export interface ShareInit {
  type: CardType;
  milestone?: MilestoneCopy;
}

const PREVIEW_W = 340; // 预览宽度；view-shot 按设备像素出图（≈ @2x/@3x），分享清晰。

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
    }
  };

  return (
    <Modal visible={!!init} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.panel, { backgroundColor: colors.paper }]}>
          <View style={[styles.head, { justifyContent: "flex-end" }]}>
            <Pressable
              onPress={onClose}
              style={[styles.close, { borderColor: colors.ruleStrong }]}
              hitSlop={8}
            >
              <Text style={{ color: colors.text2, fontSize: 20, lineHeight: 20 }}>×</Text>
            </Pressable>
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
            <Pressable
              style={[styles.btn, { backgroundColor: colors.accent }]}
              onPress={onShare}
              disabled={busy}
            >
              <Text style={{ color: "#FFFFFF", fontSize: fs.base, fontWeight: "600" }}>
                {busy ? "处理中…" : "保存 / 分享"}
              </Text>
            </Pressable>
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
  panel: { width: "92%", maxWidth: 400, borderRadius: 24, padding: sp.s4 },
  head: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: sp.s3,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  preview: { alignItems: "center" },
  actions: { flexDirection: "row", gap: sp.s2, marginTop: sp.s3 },
  btn: { flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
