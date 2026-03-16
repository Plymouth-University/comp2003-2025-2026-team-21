import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Animated,
  Pressable,
} from "react-native";
import { colours } from "../../lib/theme/colours";

interface ThemedInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  error?: string;
  showPasswordToggle?: boolean;
}

export default React.memo(function ThemedInput({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
  error,
  showPasswordToggle = true,
}: ThemedInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(secureTextEntry);

  const handleFocusIn = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleFocusOut = useCallback(() => {
    setIsFocused(false);
  }, []);

  const togglePassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const inputContainerStyle = useMemo(() => [
    styles.inputContainer,
    isFocused && styles.inputContainerFocused,
    error && styles.inputContainerError,
  ], [isFocused, error]);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={inputContainerStyle}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colours.textMuted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={handleFocusIn}
          onBlur={handleFocusOut}
          selectionColor={colours.primary}
        />
        {secureTextEntry && showPasswordToggle && (
          <Pressable
            style={styles.toggleButton}
            onPress={togglePassword}
          >
            <Text style={styles.toggleText}>{showPassword ? "👁" : "👁‍🗨"}</Text>
          </Pressable>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    marginBottom: 16,
  },
  label: {
    alignSelf: "flex-start",
    marginLeft: 5,
    marginBottom: 8,
    fontSize: 15,
    fontWeight: "600",
    color: colours.textPrimary,
  },
  inputContainer: {
    width: "100%",
    height: 56,
    backgroundColor: colours.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colours.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  inputContainerFocused: {
    borderColor: colours.primary,
    backgroundColor: colours.surfaceElevated,
  },
  inputContainerError: {
    borderColor: colours.warning,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colours.textPrimary,
    fontWeight: "500",
  },
  toggleButton: {
    padding: 8,
    marginRight: -8,
  },
  toggleText: {
    fontSize: 16,
  },
  errorText: {
    marginTop: 6,
    marginLeft: 5,
    fontSize: 13,
    color: colours.warning,
    fontWeight: "600",
  },
});