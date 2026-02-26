const User = require('../models/User');

const allowedProfileFields = ['firstName', 'lastName', 'phoneNo', 'CWID', 'location'];

function toProfileResponse(user) {
  if (!user) return null;
  const u = user.toObject ? user.toObject() : user;
  const {
    passwordHash,
    emailVerificationCode,
    emailVerificationExpires,
    lastEmailCodeSentAt,
    passwordResetCode,
    passwordResetExpires,
    ...rest
  } = u;
  return rest;
}

async function getProfile(req, res) {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'not_found' });
    return res.json(toProfileResponse(user));
  } catch (e) {
    return res.status(500).json({ error: 'profile_fetch_failed' });
  }
}

async function updateProfile(req, res) {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'not_found' });
    for (const key of allowedProfileFields) {
      if (req.body[key] !== undefined) {
        user[key] = String(req.body[key]).trim();
      }
    }
    await user.save();
    return res.json(toProfileResponse(user));
  } catch (e) {
    return res.status(500).json({ error: 'profile_update_failed' });
  }
}

async function addMealPoints(req, res) {
  try {
    const raw = req.body.points;
    const points = Number(raw);
    if (typeof points !== 'number' || isNaN(points) || points <= 0) {
      return res.status(400).json({ error: 'invalid_points' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'not_found' });

    if (typeof user.mealPoints !== 'number' || isNaN(user.mealPoints)) {
      user.mealPoints = 0;
    }

    user.mealPoints += points;
    await user.save();

    return res.json({
      message: 'meal_points_added',
      mealPoints: user.mealPoints,
    });
  } catch (e) {
    return res.status(500).json({ error: 'add_meal_points_failed' });
  }
}

module.exports = { getProfile, updateProfile, addMealPoints };
