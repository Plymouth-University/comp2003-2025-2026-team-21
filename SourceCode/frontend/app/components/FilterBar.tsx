import React from "react";
import { View, TextInput, StyleSheet, Text } from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { Ionicons } from "@expo/vector-icons";
import { colours } from "../../lib/theme/colours";

type Item = { label: string; value: string };

interface FilterBarProps {
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  selectedValue: string;
  onSelectValue: (v: string) => void;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  items: Item[];
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
  placeholder?: string;
}

export default function FilterBar({
  searchQuery,
  setSearchQuery,
  selectedValue,
  onSelectValue,
  open,
  setOpen,
  items,
  setItems,
  placeholder = "Day",
}: FilterBarProps) {
  return (
    <View style={styles.topBar} accessibilityRole="search">
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor="rgba(255,255,255,0.55)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          returnKeyType="search"
        />
        <Text style={styles.searchIcon}>⌕</Text>
      </View>

      <View style={styles.dayWrap}>
       <DropDownPicker
  open={open}
  value={selectedValue}
  items={items}
  setOpen={setOpen}
  setValue={(val: any) => {
    if (typeof val === "function") {
      const resolved = val(selectedValue);
      onSelectValue(resolved);
    } else {
      onSelectValue(val as string);
    }
  }}
  setItems={setItems}
  placeholder={placeholder}
  style={[styles.dropdown, open && styles.dropdownOpen]}
  dropDownContainerStyle={[
    styles.dropdownContainer,
    open && styles.dropdownContainerOpen,
  ]}
  textStyle={styles.dropdownText}
  labelStyle={styles.dropdownLabel}
  placeholderStyle={styles.dropdownPlaceholder}
  listItemLabelStyle={styles.dropdownItemLabel}
  listItemContainerStyle={styles.dropdownItemContainer}
  ArrowUpIconComponent={() => (
    <Ionicons name="chevron-up" size={18} color={colours.textSecondary} />
  )}
  ArrowDownIconComponent={() => (
    <Ionicons name="chevron-down" size={18} color={colours.textSecondary} />
  )}
  TickIconComponent={() => (
    <Ionicons name="checkmark" size={18} color={colours.secondary} />
  )}
  listMode="SCROLLVIEW"
  zIndex={1000}
  zIndexInverse={1000}
/>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 12,
    paddingTop: 8,
    paddingBottom: 8,
    zIndex: 3000,
  },

  searchWrap: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    backgroundColor: colours.glass,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colours.border,
  },

  searchInput: {
    flex: 1,
    color: colours.textPrimary,
    fontSize: 15,
    paddingRight: 10,
  },

  searchIcon: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 18,
    marginLeft: 8,
  },

  dayWrap: {
    width: 132,
    height: 44,
    zIndex: 4000,
  },

   dropdown: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 28,
  },

  dropdownOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },

  dropdownContainer: {
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: 10,
    backgroundColor: colours.surfaceElevated,
    elevation: 8,
    zIndex: 2000,
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
  },

  dropdownContainerOpen: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },


  dropdownText: {
    color: colours.textPrimary,
    fontWeight: "800",
    fontSize: 13,
  },

  dropdownLabel: {
    color: colours.textPrimary,
  },

  dropdownPlaceholder: {
    color: "rgba(255,255,255,0.55)",
    fontWeight: "800",
    fontSize: 13,
  },

  dropdownItemContainer: {
    backgroundColor: "transparent",
  },

  dropdownItemLabel: {
    color: colours.textPrimary,
    fontWeight: "700",
  },
});