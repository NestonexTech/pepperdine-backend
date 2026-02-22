const express = require('express');
const { signup, verifyEmail, resendCode, login, forgotPassword, resetPassword } = require('../controllers/authController');
const { getProfile, updateProfile } = require('../controllers/profileController');
const { decodeToken } = require('../middleware/auth');
const router = express.Router();
router.post('/signup', signup);
router.post('/verify', verifyEmail);
router.post('/resend-code', resendCode);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/profile', decodeToken, getProfile);
router.patch('/profile', decodeToken, updateProfile);
router.get('/protected', decodeToken, (req, res) => {
  res.json({ userId: req.userId });
});
module.exports = router;
