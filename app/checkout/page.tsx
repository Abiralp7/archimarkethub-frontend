'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { ShoppingCart, X, Plus, Minus, ChevronLeft } from 'lucide-react';
import { createOrder, getMyOrders } from '@/lib/orderApi';
import api from '@/lib/apiClient';

interface CartItem {
  productId: string;
  quantity: number;
  product?: any;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Shipping details form
  const [shippingName, setShippingName] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingPostalCode, setShippingPostalCode] = useState('');
  const [shippingCountry, setShippingCountry] = useState('');
  const [notes, setNotes] = useState('');

  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [orderId, setOrderId] = useState('');

  // Load cart items with product details
  useEffect(() => {
    const loadProductDetails = async () => {
      if (cartItems.length === 0) return;
      setLoadingProducts(true);

      try {
        const updatedItems = await Promise.all(
          cartItems.map(async (item) => {
            try {
              const res = await api.get(`/products/${item.productId}`);
              return { ...item, product: res.data };
            } catch {
              return item;
            }
          }),
        );
        setCartItems(updatedItems);
      } catch {
        setErrorMsg('Failed to load product details');
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProductDetails();
  }, []);

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (cartItems.length === 0) {
        throw new Error('Cart is empty');
      }

      // Group by supplier (company) - for now, assume all items from same supplier
      const firstProduct = cartItems[0].product;
      if (!firstProduct || !firstProduct.companyId) {
        throw new Error('Invalid product information');
      }

      const payload = {
        items: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.product?.price || 0,
        })),
        shippingName,
        shippingPhone,
        shippingAddress,
        shippingCity: shippingCity || undefined,
        shippingPostalCode: shippingPostalCode || undefined,
        shippingCountry: shippingCountry || undefined,
        notes: notes || undefined,
      };

      const res = await createOrder(payload);
      if (res.data && res.data.id) {
        return res.data;
      }
      throw new Error(res.message || 'Failed to create order');
    },
    onSuccess: (data) => {
      setOrderId(data.id);
      setStep('success');
      setSuccessMsg(`Order placed successfully! Order ID: ${data.id}`);
      setCartItems([]);
    },
    onError: (error: any) => {
      setErrorMsg(
        error.response?.data?.message ||
        error.message ||
        'Failed to place order',
      );
    },
  });

  const handleAddToCart = (productId: string) => {
    const existing = cartItems.find((item) => item.productId === productId);
    if (existing) {
      setCartItems(
        cartItems.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    } else {
      setCartItems([...cartItems, { productId, quantity: 1 }]);
    }
  };

  const handleRemoveFromCart = (productId: string) => {
    setCartItems(cartItems.filter((item) => item.productId !== productId));
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productId);
    } else {
      setCartItems(
        cartItems.map((item) =>
          item.productId === productId ? { ...item, quantity } : item,
        ),
      );
    }
  };

  const totalPrice = cartItems.reduce(
    (sum, item) => sum + (item.product?.price || 0) * item.quantity,
    0,
  );

  // Cart step
  if (step === 'cart') {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                M
              </div>
              <span className="font-bold text-slate-900">MaterialHub</span>
            </Link>
            <div className="text-sm text-slate-600">Shopping Cart</div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-8">
          {cartItems.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                Your cart is empty
              </h2>
              <p className="text-slate-600 mb-6">
                Start by browsing products and adding them to your cart.
              </p>
              <Link
                href="/products"
                className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slate-900 mb-6">Cart</h1>

              {errorMsg && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                  {errorMsg}
                </div>
              )}

              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                {loadingProducts && (
                  <div className="text-center py-8 text-slate-600">
                    Loading product details...
                  </div>
                )}

                {!loadingProducts && (
                  <div className="space-y-4">
                    {cartItems.map((item) => (
                      <div
                        key={item.productId}
                        className="flex gap-4 pb-4 border-b border-slate-200 last:border-b-0"
                      >
                        {item.product?.images?.[0]?.url && (
                          <img
                            src={item.product.images[0].url}
                            alt={item.product.name}
                            className="h-20 w-20 object-cover rounded"
                          />
                        )}

                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900">
                            {item.product?.name || 'Loading...'}
                          </h3>
                          <p className="text-sm text-slate-600">
                            {item.product?.company?.name || 'Supplier'}
                          </p>
                          <p className="text-lg font-bold text-slate-900 mt-2">
                            Rs. {item.product?.price || 0}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-4">
                          <button
                            onClick={() => handleRemoveFromCart(item.productId)}
                            className="text-slate-600 hover:text-red-600"
                          >
                            <X className="h-5 w-5" />
                          </button>

                          <div className="flex items-center gap-2 border border-slate-200 rounded-lg">
                            <button
                              onClick={() =>
                                handleUpdateQuantity(
                                  item.productId,
                                  item.quantity - 1,
                                )
                              }
                              className="p-1 hover:bg-slate-100"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-8 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                handleUpdateQuantity(
                                  item.productId,
                                  item.quantity + 1,
                                )
                              }
                              className="p-1 hover:bg-slate-100"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>

                          <p className="font-semibold text-slate-900">
                            Rs. {((item.product?.price || 0) * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order summary */}
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span>Rs. {totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Shipping</span>
                    <span>TBD</span>
                  </div>
                  <div className="border-t border-slate-200 pt-3 flex justify-between text-lg font-bold text-slate-900">
                    <span>Total</span>
                    <span>Rs. {totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={() => setStep('checkout')}
                  disabled={cartItems.length === 0}
                  className="w-full mt-6 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-slate-400"
                >
                  Proceed to Checkout
                </button>
              </div>

              <button
                onClick={() => router.push('/products')}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
              >
                <ChevronLeft className="h-5 w-5" />
                Continue Shopping
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Checkout step
  if (step === 'checkout') {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                M
              </div>
              <span className="font-bold text-slate-900">MaterialHub</span>
            </Link>
            <div className="text-sm text-slate-600">Shipping Information</div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">
            Shipping Address
          </h1>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createOrderMutation.mutate();
                }}
                className="space-y-6"
              >
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={shippingName}
                    onChange={(e) => setShippingName(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John Doe"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={shippingPhone}
                    onChange={(e) => setShippingPhone(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+977 98......."
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123 Main Street"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={shippingCity}
                    onChange={(e) => setShippingCity(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Kathmandu"
                  />
                </div>

                {/* Postal Code */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={shippingPostalCode}
                    onChange={(e) => setShippingPostalCode(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="12345"
                  />
                </div>

                {/* Country */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={shippingCountry}
                    onChange={(e) => setShippingCountry(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nepal"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Order Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Any special instructions..."
                    rows={3}
                  />
                </div>

                {/* Payment Method - COD only */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      checked
                      readOnly
                      className="h-4 w-4"
                    />
                    <span className="font-medium text-slate-900">
                      Cash on Delivery (COD)
                    </span>
                  </label>
                  <p className="text-sm text-slate-600 ml-7 mt-2">
                    Pay when you receive your order
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-4 pt-6 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setStep('cart')}
                    className="flex-1 px-4 py-3 border border-slate-300 text-slate-900 rounded-lg font-semibold hover:bg-slate-50 transition"
                  >
                    Back to Cart
                  </button>
                  <button
                    type="submit"
                    disabled={
                      createOrderMutation.isPending ||
                      !shippingName ||
                      !shippingPhone ||
                      !shippingAddress
                    }
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-slate-400"
                  >
                    {createOrderMutation.isPending
                      ? 'Placing Order...'
                      : 'Place Order'}
                  </button>
                </div>
              </form>
            </div>

            {/* Order Summary Sidebar */}
            <div className="bg-white rounded-lg shadow-sm p-6 h-fit">
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                Order Summary
              </h2>

              <div className="space-y-3 mb-6 pb-6 border-b border-slate-200">
                {cartItems.map((item) => (
                  <div key={item.productId} className="text-sm">
                    <div className="flex justify-between text-slate-600 mb-1">
                      <span className="truncate pr-2">
                        {item.product?.name || 'Product'}
                      </span>
                      <span className="flex-shrink-0">
                        ×{item.quantity}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold text-slate-900">
                      <span></span>
                      <span>
                        Rs. {((item.product?.price || 0) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>Rs. {totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Shipping</span>
                  <span>TBD</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between text-lg font-bold text-slate-900">
                  <span>Total</span>
                  <span>Rs. {totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success step
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Order Placed Successfully!
          </h1>

          <p className="text-slate-600 mb-6">
            {successMsg}
          </p>

          <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-slate-600 mb-1">Order ID</p>
            <p className="font-mono font-semibold text-slate-900">{orderId}</p>
          </div>

          <div className="space-y-3">
            <Link
              href="/orders"
              className="block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              View My Orders
            </Link>
            <Link
              href="/products"
              className="block px-6 py-3 border border-slate-300 text-slate-900 rounded-lg font-semibold hover:bg-slate-50 transition"
            >
              Continue Shopping
            </Link>
          </div>

          <p className="text-xs text-slate-500 mt-6">
            You will receive a confirmation email shortly with order details.
          </p>
        </div>
      </div>
    );
  }
}
