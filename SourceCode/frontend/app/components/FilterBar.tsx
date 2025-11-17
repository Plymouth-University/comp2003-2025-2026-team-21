import React from 'react';
import { View, TextInput, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { Ionicons } from '@expo/vector-icons';

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
  placeholder = 'Select a day',
}: FilterBarProps) {
  return (
    <View style={styles.filterBar} accessible accessibilityRole="search">
      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={18} color="#fff" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search events..."
          placeholderTextColor="rgba(255,255,255,0.6)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessibilityLabel="Search events"
          accessibilityHint="Enter text to search events"
          returnKeyType="search"
        />
      </View>

      <View style={styles.dropdownWrapper}>
        <DropDownPicker
          open={open}
          value={selectedValue}
          items={items}
          setOpen={setOpen}
          setValue={(val: any) => {
            // DropDownPicker may pass a function or a value; normalize
            if (typeof val === 'function') {
              const resolved = val(selectedValue);
              onSelectValue(resolved);
            } else {
              onSelectValue(val as string);
            }
          }}
          setItems={setItems}
          placeholder={placeholder}
          style={styles.dropdown}
          dropDownContainerStyle={styles.dropdownContainer}
          textStyle={{ color: '#fff', fontWeight: '500' }}
          labelStyle={{ color: '#fff' }}
          listMode="SCROLLVIEW"
          zIndex={1000}
          zIndexInverse={1000}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
    position: 'relative',
    zIndex: 3000,
    overflow: 'visible', 
  },
  searchWrapper: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 10,
  },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingLeft: 36,
    paddingRight: 12,
    borderRadius: 10,
    height: 44,
    color: '#fff',
  },
  dropdownWrapper: {
    width: 150,
    marginLeft: 10,
    zIndex: 1000,
    elevation: 6,
    overflow: 'visible',
    position: 'relative',
  },
  dropdown: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 0,
    borderRadius: 10,
  },
  dropdownContainer: {
    borderWidth: 0,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    elevation: 8,
    zIndex: 2000,
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
  },
});
