const express = require('express');
const router = express.Router();
const Car = require('../models/Car');
const auth = require('../middleware/auth');

// Add a new car
router.post('/add', auth, async (req, res) => {
  const { title, description, tags, images } = req.body;
  try {
    const car = new Car({ user: req.userId, title, description, tags, images });
    await car.save();
    res.status(201).json(car);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all cars of the logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const cars = await Car.find({ user: req.userId });
    res.json(cars);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
 
