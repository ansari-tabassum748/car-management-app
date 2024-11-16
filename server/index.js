const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/User');
const Car = require('./models/Car');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

// App initialization
const app = express();
app.use(express.json());  // To parse JSON requests
app.use(cors());  // Allow cross-origin requests

// Set up MongoDB
mongoose.connect('mongodb://localhost/car_management', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Image upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

// Middleware for checking authentication
const authenticateJWT = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.sendStatus(403);

  jwt.verify(token, 'your-secret-key', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// User registration route
app.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = new User({ username, email, password: hashedPassword });
  try {
    await user.save();
    const token = jwt.sign({ id: user._id }, 'your-secret-key', { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// User login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).send('User not found');

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).send('Invalid credentials');

  const token = jwt.sign({ id: user._id }, 'your-secret-key', { expiresIn: '1h' });
  res.json({ token });
});

// Create car route
app.post('/cars', authenticateJWT, upload.array('images', 10), async (req, res) => {
  const { title, description, tags } = req.body;
  const images = req.files.map(file => file.filename);
  const newCar = new Car({
    title,
    description,
    tags,
    images,
    userId: req.user.id,
  });

  try {
    await newCar.save();
    res.status(201).json({ car: newCar });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Get all cars for a user
app.get('/cars', authenticateJWT, async (req, res) => {
  try {
    const cars = await Car.find({ userId: req.user.id });
    res.json(cars);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Get a specific car
app.get('/cars/:id', authenticateJWT, async (req, res) => {
  try {
    const car = await Car.findOne({ _id: req.params.id, userId: req.user.id });
    if (!car) return res.status(404).send('Car not found');
    res.json(car);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Update a car
app.put('/cars/:id', authenticateJWT, upload.array('images', 10), async (req, res) => {
  const { title, description, tags } = req.body;
  const images = req.files ? req.files.map(file => file.filename) : [];

  try {
    const car = await Car.findOne({ _id: req.params.id, userId: req.user.id });
    if (!car) return res.status(404).send('Car not found');

    car.title = title || car.title;
    car.description = description || car.description;
    car.tags = tags || car.tags;
    car.images = images.length > 0 ? images : car.images;

    await car.save();
    res.json(car);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Delete a car
app.delete('/cars/:id', authenticateJWT, async (req, res) => {
  try {
    const car = await Car.findOne({ _id: req.params.id, userId: req.user.id });
    if (!car) return res.status(404).send('Car not found');

    await car.remove();
    res.status(200).send('Car deleted');
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Starting the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
