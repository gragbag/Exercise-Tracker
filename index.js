const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const querystring = require('node:querystring'); 

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
app.use(bodyParser.urlencoded({extended: false}))

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  }
})

const exerciseSchema = new mongoose.Schema({
  description: {
    type: String
  },
  duration: {
    type: Number
  },
  date: {
    type: Date
  },
  user_id: {
    type: String,
    required: true
  }
})

let User = mongoose.model('User', userSchema);
let Exercise = mongoose.model('Exercise', exerciseSchema);

app.post('/api/users', (req, res) => {

  User.findOne({username: req.body.username}, async (err, data) => {
    if (!data) {
      const newData = await createAndSaveUser(req.body.username);
      res.send({
        username: newData.username,
        _id: newData._id
      })
    } else {
      res.send({
        username: data.username,
        _id: data._id
      });
    }
  })
})

app.get('/api/users', (req, res) => {
  User.find({}, {__v: 0}, (err, data) => {
    res.send(data);
  })
})

app.post('/api/users/:_id/exercises', async (req, res) => {
  const id = req.params._id;
  const description = req.body.description;
  const duration = req.body.duration;
  const date = (req.body.date) ? new Date(req.body.date) : new Date();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.send({
      "error": "invalid id type"
    });
    return;
  }

  const user = await User.findById(id, (err, data) => {
    if (err) {
      res.send(err);
      return;
    }
    return data;
  });

  if (!user) {
    res.send({
      "error": "id does not exist"
    })
  } else {
    const exercise = await createAndSaveExercise(description, duration, date, id);
    res.send({
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
      _id: exercise.user_id
    })
  }

})

app.get('/api/users/:_id/logs', async (req, res) => {
  const id = req.params._id;
  const fromDate = (req.query.from) ? new Date(req.query.from) : 0;
  const toDate = (req.query.to) ? new Date(req.query.to) : new Date();
  const numLimit = Number.parseInt(req.query.limit);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.send({
      "error": "invalid id type"
    });
    return;
  }

  const user = await User.findById(id, (err, data) => data);
  let exercises = await Exercise.find({user_id: user._id, date: { $gte : fromDate}, date: {$lte : toDate}},{_id: 0, user_id: 0, __v: 0} , (err, data) => data).limit(numLimit);

  exercises = exercises.map(obj => {
    obj = obj.toObject();
    obj.date = obj.date.toDateString();
    return obj;
  })
  
  res.send({
    username: user.username,
    count: exercises.length,
    _id: user._id,
    log: exercises
  })

})

const createAndSaveUser = async (newUsername, done) => {
  const newUser = new User({
    username: newUsername
  });

  const returnedResult = await newUser.save();
  return returnedResult;
}

const createAndSaveExercise = async (desc, dur, _date, id, done) => {
  const newExercise = new Exercise({
    description: desc,
    duration: dur,
    date: _date,
    user_id: id
  })

  const returnedExercise = newExercise.save();
  return returnedExercise;
}
