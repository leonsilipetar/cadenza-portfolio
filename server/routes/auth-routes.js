const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

router.post('/refresh-token', async (req, res) => {
  try {
    // Check if user has a valid session
    if (!req.session.userId) {
      return res.status(401).json({ message: 'No valid session' });
    }

    // Generate new token
    const token = jwt.sign(
      { userId: req.session.userId },
      process.env.JWT_SECRET,
      { expiresIn: '1y' }
    );

    res.json({ token });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ message: 'Error refreshing token' });
  }
});

module.exports = router; 