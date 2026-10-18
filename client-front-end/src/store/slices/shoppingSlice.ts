import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import shoppingService from '../../services/shoppingService';
import { logout, setCredentials } from './authSlice';
import { getSavedAccessToken } from '../../utils/authStorage';
import { getErrorMessage } from '../../utils/errorMessage';
import type { RootState } from '..';
import type { CartItem, ShoppingError, ShoppingMutation } from '../../types/shopping';
import type { ProductListItem } from '../../types/product';

interface ShoppingState {
  cart: CartItem[];
  wishlist: ProductListItem[];
  sessionToken: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  errorMessage: string;
  loadRequestId: string | null;
  pendingRequests: string[];
  cartVersion: number;
  wishlistVersion: number;
}

const emptyState: ShoppingState = {
  cart: [], wishlist: [], sessionToken: null, status: 'idle', errorMessage: '', loadRequestId: null,
  pendingRequests: [], cartVersion: 0, wishlistVersion: 0,
};

// Xếp các lần tải / sửa giỏ theo thứ tự để response cũ không ghi đè thao tác mới
let requestQueue: Promise<unknown> = Promise.resolve();
const enqueue = <T,>(operation: () => Promise<T>): Promise<T> => {
  const result = requestQueue.then(operation);
  requestQueue = result.catch(() => undefined);
  return result;
};

const shoppingError = (error: unknown): ShoppingError => ({
  message: getErrorMessage(error),
  unauthorized: axios.isAxiosError(error) && error.response?.status === 401,
  sessionChanged: error instanceof Error && error.message === 'SESSION_CHANGED',
});

type ThunkConfig = { state: RootState; rejectValue: ShoppingError };

export const fetchShopping = createAsyncThunk<
  { sessionToken: string | null; cart: CartItem[]; wishlist: ProductListItem[] }, void, ThunkConfig
>('shopping/fetch', async (_, { getState, rejectWithValue }) => {
  const sessionToken = getState().auth.accessToken;
  try {
    return await enqueue(async () => {
      if (!sessionToken || getState().auth.accessToken !== sessionToken) throw new Error('SESSION_CHANGED');
      const [cart, wishlist] = await Promise.all([shoppingService.getCart(), shoppingService.getWishlist()]);
      return { sessionToken, cart, wishlist };
    });
  } catch (error) { return rejectWithValue(shoppingError(error)); }
}, { condition: (_, { getState }) => !!getState().auth.accessToken && getState().shopping.status !== 'loading' });

export const mutateShopping = createAsyncThunk<
  { sessionToken: string; cart?: CartItem[]; wishlist?: ProductListItem[] }, ShoppingMutation, ThunkConfig
>('shopping/mutate', async (action, { getState, rejectWithValue }) => {
  const sessionToken = getState().auth.accessToken;
  try {
    return await enqueue(async () => {
      if (!sessionToken || getState().auth.accessToken !== sessionToken) throw new Error('SESSION_CHANGED');
      const isWishlist = action.kind === 'addWishlist' || action.kind === 'removeWishlist';
      if (isWishlist) return { sessionToken, wishlist: await shoppingService.changeWishlist(action) };
      return { sessionToken, cart: await shoppingService.changeCart(action) };
    });
  } catch (error) { return rejectWithValue(shoppingError(error)); }
});

const shoppingSlice = createSlice({
  name: 'shopping',
  initialState: { ...emptyState, sessionToken: getSavedAccessToken() },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(setCredentials, (_, action) => ({ ...emptyState, sessionToken: action.payload.accessToken }))
      .addCase(logout, () => ({ ...emptyState }))
      .addCase(fetchShopping.pending, (state, action) => { state.status = 'loading'; state.errorMessage = ''; state.loadRequestId = action.meta.requestId; })
      .addCase(fetchShopping.fulfilled, (state, action) => {
        if (state.sessionToken !== action.payload.sessionToken || state.loadRequestId !== action.meta.requestId) return;
        state.cart = action.payload.cart;
        state.wishlist = action.payload.wishlist;
        state.status = 'succeeded';
      })
      .addCase(fetchShopping.rejected, (state, action) => {
        if (state.loadRequestId !== action.meta.requestId) return;
        state.status = 'failed';
        state.errorMessage = action.payload?.message || 'Không thể tải giỏ hàng và yêu thích';
      })
      .addCase(mutateShopping.pending, (state, action) => { state.pendingRequests.push(action.meta.requestId); })
      .addCase(mutateShopping.fulfilled, (state, action) => {
        state.pendingRequests = state.pendingRequests.filter((id) => id !== action.meta.requestId);
        if (state.sessionToken !== action.payload.sessionToken) return;
        if (action.payload.cart) { state.cart = action.payload.cart; state.cartVersion += 1; }
        if (action.payload.wishlist) { state.wishlist = action.payload.wishlist; state.wishlistVersion += 1; }
      })
      .addCase(mutateShopping.rejected, (state, action) => {
        state.pendingRequests = state.pendingRequests.filter((id) => id !== action.meta.requestId);
      });
  },
});

export default shoppingSlice.reducer;
