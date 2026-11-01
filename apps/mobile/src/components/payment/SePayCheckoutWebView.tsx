import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { spacing, typography } from "@/src/theme/tokens";

export type SePayReturnResult = "success" | "error" | "cancel" | "unknown";

type Props = {
  visible: boolean;
  checkoutUrl: string;
  title?: string;
  onClose: (result: SePayReturnResult) => void;
};

/** True when Core return/callback URL is hit (success, error, or cancel). */
export function isSePayReturnUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.pathname.includes("/payments/sepay/return");
  } catch {
    return /\/payments\/sepay\/return(?:\?|$)/i.test(url);
  }
}

export function parseSePayReturnResult(url: string): SePayReturnResult {
  try {
    const parsed = new URL(url);
    const result = String(parsed.searchParams.get("result") ?? "").toLowerCase();
    if (result === "error") return "error";
    if (result === "cancel") return "cancel";
    // success_url has no result= (or result=success)
    if (!result || result === "success") return "success";
    return "unknown";
  } catch {
    if (/[?&]result=error\b/i.test(url)) return "error";
    if (/[?&]result=cancel\b/i.test(url)) return "cancel";
    return "success";
  }
}

/**
 * In-app SePay hosted checkout (QR). Does not open Chrome / external browser.
 * Closes when Core `/payments/sepay/return` is navigated.
 */
export function SePayCheckoutWebView({ visible, checkoutUrl, title, onClose }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const handledRef = useRef(false);

  const finish = useCallback(
    (result: SePayReturnResult) => {
      if (handledRef.current) return;
      handledRef.current = true;
      onClose(result);
    },
    [onClose]
  );

  const onNav = useCallback(
    (nav: WebViewNavigation) => {
      const url = nav.url ?? "";
      if (!url || !isSePayReturnUrl(url)) return;
      finish(parseSePayReturnResult(url));
    },
    [finish]
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => finish("cancel")}
      onShow={() => {
        handledRef.current = false;
        setLoading(true);
      }}
    >
      <View
        testID="payment-sepay-webview"
        style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}
      >
        <View style={[styles.toolbar, { borderBottomColor: theme.colors.outline }]}>
          <Pressable
            testID="payment-webview-close"
            accessibilityRole="button"
            accessibilityLabel="Đóng cổng thanh toán"
            onPress={() => finish("cancel")}
            style={styles.closeBtn}
            hitSlop={8}
          >
            <Ionicons name="close" size={22} color={theme.colors.onSurface} />
          </Pressable>
          <Text numberOfLines={1} style={[typography.subtitle, styles.toolbarTitle, { color: theme.colors.onSurface }]}>
            {title ?? "SePay · Quét QR"}
          </Text>
          <View style={styles.closeBtn} />
        </View>

        <View style={styles.webWrap}>
          {loading ? (
            <View style={styles.loader} pointerEvents="none">
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant, marginTop: spacing.sm }]}>
                Đang mở cổng SePay trong ứng dụng…
              </Text>
            </View>
          ) : null}
          <WebView
            source={{ uri: checkoutUrl }}
            style={styles.webview}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onNavigationStateChange={onNav}
            onShouldStartLoadWithRequest={(req) => {
              const url = req.url ?? "";
              if (isSePayReturnUrl(url)) {
                finish(parseSePayReturnResult(url));
                return false;
              }
              return true;
            }}
            startInLoadingState
            javaScriptEnabled
            domStorageEnabled
            setSupportMultipleWindows={false}
            originWhitelist={["https://*", "http://*"]}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  toolbarTitle: {
    flex: 1,
    textAlign: "center",
    fontWeight: "700",
  },
  webWrap: { flex: 1 },
  webview: { flex: 1 },
  loader: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.85)",
  },
});
