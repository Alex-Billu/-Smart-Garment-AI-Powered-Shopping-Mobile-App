import { useCartStore } from '../src/store/cartStore';
import { useSettingsStore } from '../src/store/settingsStore';

describe('Zustand Stores Unit Tests', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
  });

  test('cartStore initializes empty and sets cart correctly', () => {
    const store = useCartStore.getState();
    expect(store.items.length).toBe(0);
    expect(store.totalItems).toBe(0);

    const mockItems = [
      {
        cart_id: 1,
        user_id: 1,
        product_id: 101,
        product_name: 'Denim Jacket',
        price: 1899,
        size: 'L',
        quantity: 2
      }
    ];

    store.setCart(mockItems, 2, 3798);

    const updated = useCartStore.getState();
    expect(updated.items.length).toBe(1);
    expect(updated.totalItems).toBe(2);
    expect(updated.subtotal).toBe(3798);
  });

  test('settingsStore toggles theme mode correctly', () => {
    const settings = useSettingsStore.getState();
    expect(settings.themeMode).toBe('dark');

    settings.toggleTheme();
    expect(useSettingsStore.getState().themeMode).toBe('light');

    settings.toggleTheme();
    expect(useSettingsStore.getState().themeMode).toBe('dark');
  });
});
