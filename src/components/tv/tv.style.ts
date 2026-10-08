import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  // A transparent border keeps the focus ring from shifting layout.
  base: { borderColor: 'transparent', borderWidth: 2 },
  // A light ring reads on both the dark kid and parent surfaces.
  focused: { borderColor: '#F1F1F1', elevation: 6, shadowColor: '#000000', shadowOpacity: 0.5, shadowRadius: 10, transform: [{ scale: 1.03 }] },
  pressed: { opacity: 0.82 },
});

export default styles;
