import React, { useEffect, useRef } from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Pressable,
  ScrollView,
} from 'react-native';
import { useTheme } from '../theme';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  fullScreen?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  visible, onClose, title, children, showCloseButton = true, fullScreen = false,
}) => {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 15 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  return (
    <RNModal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={[
            styles.container,
            fullScreen && styles.fullScreen,
            { backgroundColor: colors.card, opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {(title || showCloseButton) && (
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              {title && <Text style={[styles.title, { color: colors.text }]}>{title}</Text>}
              {showCloseButton && (
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Text style={{ fontSize: 20, color: colors.textSecondary }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {children}
          </ScrollView>
        </Animated.View>
      </Pressable>
    </RNModal>
  );
};

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible, title, message, confirmText = 'Confirm', cancelText = 'Cancel',
  confirmDestructive = false, onConfirm, onCancel,
}) => {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} onClose={onCancel} showCloseButton={false}>
      <View style={styles.confirmBody}>
        <Text style={[styles.confirmTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>{message}</Text>
        <View style={styles.confirmButtons}>
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: colors.border }]}
            onPress={onCancel}
          >
            <Text style={{ color: colors.text, fontWeight: '600' }}>{cancelText}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: confirmDestructive ? '#ef4444' : colors.primary }]}
            onPress={onConfirm}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>{confirmText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxHeight: '85%',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  fullScreen: { width: '100%', height: '100%', borderRadius: 0, maxHeight: '100%' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700', flex: 1 },
  closeBtn: { padding: 4 },
  confirmBody: { padding: 24 },
  confirmTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  confirmMessage: { fontSize: 14, lineHeight: 22, marginBottom: 24 },
  confirmButtons: { flexDirection: 'row', gap: 12 },
  confirmBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
});
