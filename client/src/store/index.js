import { configureStore, createSlice } from "@reduxjs/toolkit";
import ApiConfig from '../components/apiConfig';

// Helper to check if token is valid
const isTokenValid = (token) => {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const isValid = payload.exp > Date.now() / 1000;
    console.log('Token validation:', { isValid, exp: new Date(payload.exp * 1000) });
    return isValid;
  } catch (e) {
    console.error('Token validation error:', e);
    return false;
  }
};

const initialState = {
  isLoggedIn: localStorage.getItem("isLoggedIn") === "true",
  token: localStorage.getItem('token'),
  user: null,
  isLoading: false
};

// If initial token is invalid, clear it
if (localStorage.getItem("token") && !isTokenValid(localStorage.getItem("token"))) {
  localStorage.removeItem('token');
  localStorage.removeItem('isLoggedIn');
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess(state, action) {
      const { token, user } = action.payload;
      state.isLoggedIn = true;
      state.token = token;
      state.user = user;
      state.isLoading = false;
      localStorage.setItem("token", token);
      localStorage.setItem("isLoggedIn", "true");
      ApiConfig.setAuthToken(token);
    },
    logout(state) {
      state.isLoggedIn = false;
      state.token = null;
      state.user = null;
      state.isLoading = false;
      localStorage.removeItem("token");
      localStorage.removeItem("isLoggedIn");
      ApiConfig.setAuthToken(null);
    },
    updateUser(state, action) {
      state.user = action.payload;
      state.isLoading = false;
    },
    setLoading(state, action) {
      state.isLoading = action.payload;
    }
  }
});

export const authActions = authSlice.actions;

export const store = configureStore({
    reducer: authSlice.reducer
});

// Remove redundant localStorage subscription since we handle it in reducers