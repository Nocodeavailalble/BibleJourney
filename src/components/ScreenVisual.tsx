import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

type ScreenVisualProps = {
  icon: "book-open-page-variant" | "calendar-check" | "tune-variant";
  color: string;
};

export default function ScreenVisual({ icon, color }: ScreenVisualProps) {
  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.outerCircle,
          {
            borderColor: color,
          },
        ]}
      >
        <View
          style={[
            styles.innerCircle,
            {
              backgroundColor: color,
            },
          ]}
        >
          <MaterialCommunityIcons name={icon} size={32} color="#FFFFFF" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "flex-start",
    marginBottom: 16,
  },

  outerCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    backgroundColor: "#FFFFFF",
  },

  innerCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
});
