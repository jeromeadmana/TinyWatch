import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import type { ConnectionStatus } from "../store/useAppStore";

interface Props {
  status: ConnectionStatus;
}

function dotColor(status: ConnectionStatus): string {
  switch (status) {
    case "connected":
      return "#66aa66";
    case "signaling":
    case "connecting":
    case "discovering":
      return "#aaaa44";
    case "error":
      return "#aa4444";
    default:
      return "#555577";
  }
}

function shouldPulse(status: ConnectionStatus): boolean {
  return (
    status === "signaling" ||
    status === "connecting" ||
    status === "discovering"
  );
}

export default function StatusDot({ status }: Props) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (shouldPulse(status)) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
      return () => animation.stop();
    } else {
      opacity.setValue(1);
    }
  }, [status, opacity]);

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[
          styles.dot,
          { backgroundColor: dotColor(status), opacity },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    justifyContent: "center",
    marginRight: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
