const express = require('express');
const router = express.Router();
const { verifyToken } = require('../controllers/user-controller');
const {
  createPost,
  getPosts,
  getMyPosts,
  updatePost,
  deletePost
} = require('../controllers/post-controller');

// Add logging to debug route matching
router.use((req, res, next) => {
  console.log('Post route hit:', req.method, req.path);
  next();
});

// Use /api/Post instead of /api/posts to match the table name
router.post('/Post', verifyToken, createPost);
router.get('/Post', verifyToken, getPosts);
router.get('/my-Post', verifyToken, getMyPosts);
router.put('/Post/:id', verifyToken, updatePost);
router.delete('/Post/:id', verifyToken, deletePost);

module.exports = router;