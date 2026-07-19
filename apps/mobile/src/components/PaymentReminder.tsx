import { View, Text, StyleSheet, TouchableOpacity, Animated, Linking } from 'react-native';
import { useEffect, useRef } from 'react';
import { CreditCard, ChevronRight, AlertCircle, MessageCircle, CheckCircle, Clock, Users } from 'lucide-react-native';
import { theme } from '../lib/theme';

interface PaymentStatus {
  name: string;
  phone?: string;
  status: 'paid' | 'pending' | 'partial' | 'overdue';
  amount: number;
  dueDate: string;
}

interface PaymentReminderProps {
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
  totalCount: number;
  totalExpected: number;
  totalCollected: number;
  dueDate: string;
  pendingResidents?: PaymentStatus[];
  onTotalPress?: () => void;
  onPaidPress?: () => void;
  onPendingPress?: () => void;
  onSendReminder?: (phone?: string, name?: string, amount?: number) => void;
}

export function PaymentReminder({
  paidCount,
  pendingCount,
  overdueCount,
  totalCount,
  totalExpected,
  totalCollected,
  dueDate,
  pendingResidents = [],
  onTotalPress,
  onPaidPress,
  onPendingPress,
  onSendReminder,
}: PaymentReminderProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
  
  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleWhatsAppReminder = (phone?: string, name?: string, amount?: number) => {
    const residentName = name || 'Resident';
    const paymentAmount = amount || 0;
    const message = `Dear ${residentName},\n\nThis is a reminder that your rent payment of ₹${paymentAmount.toLocaleString('en-IN')} for ${currentMonth} is pending.\n\nDue Date: ${dueDate}\n\nPlease make the payment at your earliest convenience.\n\n Regards,\nOpsora Team`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `whatsapp://send?text=${encodedMessage}`;
    
    if (phone) {
      const phoneUrl = `whatsapp://send?phone=${phone.replace(/[^0-9]/g, '')}&text=${encodedMessage}`;
      Linking.openURL(phoneUrl).catch(() => {
        Linking.openURL(whatsappUrl).catch(() => {
          Linking.openURL(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodedMessage}`);
        });
      });
    } else {
      Linking.openURL(whatsappUrl).catch(() => {
        Linking.openURL(`https://wa.me/?text=${encodedMessage}`);
      });
    }
    
    onSendReminder?.(phone, name, amount);
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, overdueCount > 0 && styles.iconContainerAlert]}>
            <CreditCard size={20} color={overdueCount > 0 ? '#FFFFFF' : theme.colors.primary} />
          </View>
          <View>
            <Text style={styles.title}>Payment Status</Text>
            <Text style={styles.month}>{currentMonth}</Text>
          </View>
        </View>
        {pendingCount + overdueCount > 0 && (
          <TouchableOpacity
            style={styles.reminderButton}
            onPress={() => handleWhatsAppReminder()}
          >
            <MessageCircle size={14} color="#FFFFFF" />
            <Text style={styles.reminderButtonText}>Remind All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        {/* Total Residents */}
        <TouchableOpacity style={styles.statCard} onPress={onTotalPress}>
          <View style={[styles.statIcon, { backgroundColor: theme.colors.infoSurface }]}>
            <Users size={18} color={theme.colors.info} />
          </View>
          <Text style={styles.statValue}>{totalCount}</Text>
          <Text style={styles.statLabel}>Total</Text>
          <ChevronRight size={12} color={theme.colors.textMuted} style={styles.statArrow} />
        </TouchableOpacity>

        {/* Paid */}
        <TouchableOpacity style={styles.statCard} onPress={onPaidPress}>
          <View style={[styles.statIcon, { backgroundColor: theme.colors.successSurface }]}>
            <CheckCircle size={18} color={theme.colors.success} />
          </View>
          <Text style={[styles.statValue, { color: theme.colors.success }]}>{paidCount}</Text>
          <Text style={styles.statLabel}>Paid</Text>
          <ChevronRight size={12} color={theme.colors.textMuted} style={styles.statArrow} />
        </TouchableOpacity>

        {/* Not Paid */}
        <TouchableOpacity style={styles.statCard} onPress={onPendingPress}>
          <View style={[styles.statIcon, {
            backgroundColor: (pendingCount + overdueCount) > 0 ? theme.colors.dangerSurface : theme.colors.warningSurface
          }]}>
            <Clock size={18} color={(pendingCount + overdueCount) > 0 ? theme.colors.danger : theme.colors.warning} />
          </View>
          <Text style={[styles.statValue, {
            color: (pendingCount + overdueCount) > 0 ? theme.colors.danger : theme.colors.warning
          }]}>{pendingCount + overdueCount}</Text>
          <Text style={styles.statLabel}>Not Paid</Text>
          <ChevronRight size={12} color={theme.colors.textMuted} style={styles.statArrow} />
        </TouchableOpacity>
      </View>

      {/* Collection Rate */}
      <View style={styles.collectionRow}>
        <View style={styles.collectionInfo}>
          <Text style={styles.collectionLabel}>Collection Rate</Text>
          <Text style={[styles.collectionValue, {
            color: collectionRate >= 80 ? theme.colors.success :
              collectionRate >= 50 ? theme.colors.warning : theme.colors.danger
          }]}>{collectionRate}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, {
            width: `${collectionRate}%`,
            backgroundColor: collectionRate >= 80 ? theme.colors.success :
              collectionRate >= 50 ? theme.colors.warning : theme.colors.danger
          }]} />
        </View>
      </View>

      {/* Pending Residents List */}
      {pendingResidents.length > 0 && (
        <View style={styles.pendingList}>
          <View style={styles.pendingHeader}>
            <Text style={styles.pendingListTitle}>Pending Payments</Text>
            <Text style={styles.pendingCount}>{pendingResidents.length} residents</Text>
          </View>
          {pendingResidents.slice(0, 4).map((resident, index) => (
            <View key={index} style={styles.pendingItem}>
              <View style={styles.pendingItemLeft}>
                <View style={[styles.statusDot, {
                  backgroundColor: resident.status === 'overdue' ? theme.colors.danger :
                    resident.status === 'partial' ? theme.colors.warning : theme.colors.danger
                }]} />
                <View>
                  <Text style={styles.pendingName} numberOfLines={1}>{resident.name}</Text>
                  <Text style={styles.pendingDue}>Due: {resident.dueDate}</Text>
                </View>
              </View>
              <View style={styles.pendingItemRight}>
                <Text style={styles.pendingAmount}>₹{resident.amount.toLocaleString('en-IN')}</Text>
                <TouchableOpacity
                  style={styles.whatsappButton}
                  onPress={() => handleWhatsAppReminder(resident.phone, resident.name, resident.amount)}
                >
                  <MessageCircle size={12} color="#FFFFFF" />
                  <Text style={styles.whatsappButtonText}>Remind</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* View All Link */}
      <TouchableOpacity style={styles.viewAllButton} onPress={onTotalPress}>
        <Text style={styles.viewAllText}>View All Payments</Text>
        <ChevronRight size={16} color={theme.colors.primary} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadow.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerAlert: {
    backgroundColor: theme.colors.danger,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  month: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: 2,
  },
  reminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
  },
  reminderButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    alignItems: 'center',
    position: 'relative',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  statArrow: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  collectionRow: {
    marginBottom: theme.spacing.md,
  },
  collectionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  collectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  collectionValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  pendingList: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  pendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pendingListTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  pendingCount: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  pendingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  pendingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pendingName: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text,
  },
  pendingDue: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  pendingItemRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  pendingAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#25D366',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  whatsappButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    backgroundColor: theme.colors.primarySurface,
    borderRadius: theme.borderRadius.md,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});
