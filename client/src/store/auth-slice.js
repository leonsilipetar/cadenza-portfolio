const authSlice = createSlice({
  name: 'auth',
  initialState: {
    isLoggedIn: localStorage.getItem('isLoggedIn') === 'true',
    user: null
  },
  reducers: {
    login(state, action) {
      state.isLoggedIn = true;
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('token', action.payload);
    },
    logout(state) {
      state.isLoggedIn = false;
      state.user = null;
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('token');
    },
    setUser(state, action) {
      state.user = action.payload;
      state.isLoggedIn = true;
      localStorage.setItem('isLoggedIn', 'true');
    }
  }
}); 