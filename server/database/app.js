/* jshint esversion: 8 */

const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 3030;

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

// Load JSON data
const reviews_data = JSON.parse(fs.readFileSync("reviews.json", 'utf8'));
const dealerships_data = JSON.parse(fs.readFileSync("dealerships.json", 'utf8'));

// Connect to MongoDB
mongoose.connect("mongodb://mongo_db:27017/", { dbName: 'dealershipsDB' });

// Import models
const Reviews = require('./review');
const Dealerships = require('./dealership');

// Populate the database (once at startup)
(async () => {
  try {
    await Reviews.deleteMany({});
    await Reviews.insertMany(reviews_data.reviews);

    await Dealerships.deleteMany({});
    await Dealerships.insertMany(dealerships_data.dealerships);
  } catch (error) {
    console.error("Database seeding error:", error);
  }
})();

// Routes

// Root route
app.get('/', (req, res) => {
  res.send("Welcome to the Mongoose API");
});

// Fetch all reviews
app.get('/fetchReviews', async (req, res) => {
  try {
    const documents = await Reviews.find();
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching reviews' });
  }
});

// Fetch reviews by dealer ID
app.get('/fetchReviews/dealer/:id', async (req, res) => {
  try {
    const documents = await Reviews.find({ dealership: parseInt(req.params.id) });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching dealer reviews' });
  }
});

// Fetch all dealerships
app.get('/fetchDealers', async (req, res) => {
  try {
    const dealers = await Dealerships.find();
    res.json(dealers);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching dealerships' });
  }
});

// Fetch dealers by state (case-insensitive)
app.get('/fetchDealers/:state', async (req, res) => {
  try {
    const stateParam = req.params.state;
    const dealers = await Dealerships.find({ state: { $regex: new RegExp(`^${stateParam}$`, 'i') } });
    res.json(dealers);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching dealers by state' });
  }
});

// Fetch single dealer by ID
app.get('/fetchDealer/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const dealer = await Dealerships.findOne({ id: id });
    if (dealer) {
      res.json(dealer);
    } else {
      res.status(404).json({ error: 'Dealer not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error fetching dealer by ID' });
  }
});

// Insert a new review
app.post('/insert_review', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    const data = JSON.parse(req.body);
    const documents = await Reviews.find().sort({ id: -1 });
    const new_id = documents.length > 0 ? documents[0].id + 1 : 1;

    const review = new Reviews({
      id: new_id,
      name: data.name,
      dealership: data.dealership,
      review: data.review,
      purchase: data.purchase,
      purchase_date: data.purchase_date,
      car_make: data.car_make,
      car_model: data.car_model,
      car_year: data.car_year
    });

    const savedReview = await review.save();
    res.json(savedReview);
  } catch (error) {
    console.error("Error inserting review:", error);
    res.status(500).json({ error: 'Error inserting review' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
