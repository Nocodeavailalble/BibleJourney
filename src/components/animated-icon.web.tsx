import { StyleSheet, View } from "react-native";

type AnimatedIconProps = {
  size?: number;
  color?: string;
};

export default function AnimatedIcon({
  size = 24,
  color = "#000000",
}: AnimatedIconProps) {
  return (
    <View
      style={[
        styles.icon,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  icon: {
    opacity: 0.15,
  },
});
