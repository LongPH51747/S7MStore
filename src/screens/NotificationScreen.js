import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  FlatList,
  Alert,
  Animated,
  PanGestureHandler,
  State,
  Image,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import {useNotification} from '../contexts/NotificationContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NotificationScreen = () => {
  const navigation = useNavigation();
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  } = useNotification();
  const [longPressedItem, setLongPressedItem] = useState(null);

  // Debug: Log notifications data
  console.log(
    '🔔 NotificationScreen - Total notifications:',
    notifications.length,
  );
  console.log(
    '🔔 NotificationScreen - Notifications data:',
    notifications.map(n => ({
      id: n.id,
      title: n.title,
      type: n.type,
      productName: n.productName,
      orderId: n.orderId,
    })),
  );

  const handleNotificationPress = notification => {
    // Reset long press state
    setLongPressedItem(null);
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.type === 'new_order' && notification.orderId) {
      navigation.navigate('OrderDetailScreen', {
        orderId: notification.orderId,
      });
    } else if (notification.productId) {
      if (notification.productId.startsWith('test_')) {
        Alert.alert(
          'Test Notification',
          `Đây là thông báo test cho sản phẩm: ${notification.productName}`,
          [{text: 'OK'}],
        );
      } else {
        navigation.navigate('ProductDetailScreen', {
          productId: notification.productId,
        });
      }
    }
  };

  const handleLongPress = notificationId => {
    setLongPressedItem(notificationId);
    // Auto hide sau 3 giây
    setTimeout(() => {
      setLongPressedItem(null);
    }, 3000);
  };

  const handleDeletePress = notification => {
    Alert.alert(
      'Xóa thông báo',
      `Bạn có chắc chắn muốn xóa thông báo "${notification.title}"?`,
      [
        {
          text: 'Hủy',
          style: 'cancel',
          onPress: () => setLongPressedItem(null),
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            deleteNotification(notification.id);
            setLongPressedItem(null);
          },
        },
      ],
    );
  };

  const handleCleanDuplicates = async () => {
    const duplicateCount =
      notifications.length -
      [
        ...new Set(
          notifications.map(n =>
            n.type === 'new_order' ? n.orderId : n.productId,
          ),
        ),
      ].length;

    if (duplicateCount === 0) {
      Alert.alert('Thông báo', 'Không có thông báo trùng lặp nào.');
      return;
    }

    Alert.alert(
      'Dọn dẹp thông báo trùng lặp',
      `Tìm thấy ${duplicateCount} thông báo trùng lặp. Bạn có muốn xóa chúng?`,
      [
        {text: 'Hủy', style: 'cancel'},
        {
          text: 'Dọn dẹp',
          onPress: async () => {
            // Manual cleanup logic inline
            const cleanedNotifications = [];
            const seenOrderIds = new Set();
            const seenProductIds = new Set();

            notifications.forEach(notification => {
              let isDuplicate = false;

              if (notification.type === 'new_order' && notification.orderId) {
                if (seenOrderIds.has(notification.orderId)) {
                  isDuplicate = true;
                } else {
                  seenOrderIds.add(notification.orderId);
                }
              } else if (
                notification.type === 'new_product' &&
                notification.productId
              ) {
                if (seenProductIds.has(notification.productId)) {
                  isDuplicate = true;
                } else {
                  seenProductIds.add(notification.productId);
                }
              }

              if (!isDuplicate) {
                cleanedNotifications.push(notification);
              }
            });

            const removed = notifications.length - cleanedNotifications.length;
            console.log('🧹 Manual cleanup: removed', removed, 'duplicates');

            // Actually update the notifications through deleteAll then re-add cleaned ones
            deleteAllNotifications();

            // Save cleaned notifications to AsyncStorage
            setTimeout(async () => {
              try {
                await AsyncStorage.setItem(
                  'notifications',
                  JSON.stringify(cleanedNotifications),
                );
                // Force reload by navigating back and forth (simple solution)
                Alert.alert(
                  'Hoàn thành',
                  `Đã xóa ${removed} thông báo trùng lặp! Vui lòng reload app.`,
                );
              } catch (error) {
                console.error('Error saving cleaned notifications:', error);
              }
            }, 100);
          },
        },
      ],
    );
  };

  const handleDeleteAll = () => {
    if (notifications.length === 0) {
      Alert.alert('Thông báo', 'Không có thông báo nào để xóa.');
      return;
    }

    Alert.alert(
      'Xóa tất cả thông báo',
      `Bạn có chắc chắn muốn xóa tất cả ${notifications.length} thông báo?`,
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xóa tất cả',
          style: 'destructive',
          onPress: () => {
            deleteAllNotifications();
            setLongPressedItem(null);
          },
        },
      ],
    );
  };

  const renderNotificationItem = ({item}) => {
    const isLongPressed = longPressedItem === item.id;

    return (
      <View style={styles.notificationWrapper}>
        <TouchableOpacity
          style={[
            styles.notificationItem,
            !item.isRead && styles.unreadNotification,
            isLongPressed && styles.longPressedItem,
          ]}
          onPress={() => handleNotificationPress(item)}
          onLongPress={() => handleLongPress(item.id)}
          activeOpacity={0.7}>
          {/* Icon/Image Container */}
          <View style={styles.notificationImageContainer}>
            {item.type === 'new_order' ? (
              <View style={styles.notificationIconPlaceholder}>
                <Feather name="shopping-bag" size={20} color="#28a745" />
              </View>
            ) : item.productImage ? (
              <Image
                source={{uri: item.productImage}}
                style={styles.notificationImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.notificationIconPlaceholder}>
                <Feather name="package" size={20} color="#007bff" />
              </View>
            )}
          </View>

          <View style={styles.notificationContent}>
            <Text
              style={[
                styles.notificationTitle,
                !item.isRead && styles.unreadText,
              ]}>
              {item.title}
            </Text>

            {/* Conditional rendering based on notification type */}
            {item.type === 'new_order' ? (
              // Order notification content
              <>
                <Text style={styles.orderIdInList}>
                  Mã đơn: ****{item.orderId ? item.orderId.slice(-4) : 'N/A'}
                </Text>
                <Text style={styles.orderStatusInList}>
                  Trạng thái: {item.orderStatus || 'Chờ xác nhận'}
                </Text>
                {item.orderTotal > 0 && (
                  <Text style={styles.priceInList}>
                    Tổng tiền: {item.orderTotal.toLocaleString('vi-VN')} ₫
                  </Text>
                )}
                {item.orderItems > 0 && (
                  <Text style={styles.orderItemsInList}>
                    {item.orderItems} sản phẩm
                  </Text>
                )}
              </>
            ) : (
              // Product notification content
              <>
                <Text style={styles.productNameInList}>{item.productName}</Text>
                <Text style={styles.notificationMessage}>{item.message}</Text>
                {item.productPrice > 0 && (
                  <Text style={styles.priceInList}>
                    {item.productPrice.toLocaleString('vi-VN')} ₫
                  </Text>
                )}
              </>
            )}

            <Text style={styles.notificationTime}>{item.timestamp}</Text>
          </View>
          {!item.isRead && <View style={styles.unreadDot} />}

          {/* Delete button - hiện khi long press */}
          {isLongPressed && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeletePress(item)}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Feather name="x" size={18} color="#ff4444" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Swipe indicator khi long press */}
        {isLongPressed && (
          <View style={styles.swipeIndicator}>
            <Text style={styles.swipeText}>
              Nhấn X để xóa hoặc vuốt sang phải
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="white" barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Ionicons name="chevron-back-outline" size={26} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông Báo</Text>
        <TouchableOpacity
          style={[styles.deleteAllButton, {marginRight: 10}]}
          onPress={handleCleanDuplicates}>
          <Feather name="refresh-cw" size={16} color="#007bff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteAllButton}
          onPress={handleDeleteAll}>
          <Feather name="trash-2" size={16} color="#ff4444" />
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      {notifications.length > 0 && (
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            💡 Nhấn giữ để xóa thông báo
          </Text>
        </View>
      )}

      {/* Notifications List */}
      {notifications.length > 0 ? (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={item => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          extraData={longPressedItem} // Re-render when longPressedItem changes
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Feather name="bell-off" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Chưa có thông báo nào</Text>
          <Text style={styles.emptySubText}>
            Các thông báo về sản phẩm mới và đơn hàng sẽ hiển thị tại đây
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'black',
    flex: 1,
    textAlign: 'center',
  },
  deleteAllButton: {
    padding: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffe0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionContainer: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  instructionText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  listContainer: {
    paddingVertical: 10,
  },
  notificationWrapper: {
    position: 'relative',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    backgroundColor: '#fff',
    position: 'relative',
  },
  longPressedItem: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#856404',
  },
  unreadNotification: {
    backgroundColor: '#f8f9ff',
  },
  notificationImageContainer: {
    marginRight: 12,
  },
  notificationImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  notificationIconPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  unreadText: {
    fontWeight: '600',
    color: '#000',
  },
  productNameInList: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 3,
  },
  notificationMessage: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 4,
  },
  priceInList: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007bff',
    marginBottom: 4,
  },
  orderIdInList: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
    marginBottom: 3,
  },
  orderStatusInList: {
    fontSize: 13,
    fontWeight: '600',
    color: '#28a745',
    marginBottom: 3,
  },
  orderItemsInList: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007bff',
    marginTop: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffe0e0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  swipeIndicator: {
    backgroundColor: '#fff3cd',
    paddingVertical: 4,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  swipeText: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default NotificationScreen;
