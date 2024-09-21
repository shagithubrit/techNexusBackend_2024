const User = require("../models/user");

exports.createOrUpdateUser = async (req, res) => {
  const { name, picture, email } = req.user;

  // here here we need decide whether we need to create or update
  //if user alreadyt there in database then we are going to update otherwise crete the new user
  // new true -->  helps to return the updated information not the all users information
  //user -->  it contains the updated user information

  const user = await User.findOneAndUpdate(
    { email: email },
    { name: email.split("@")[0], picture: picture },
    { new: true }
  );

  if (user) {
    console.log("USER UPDATED", user);
    res.json(user);
  } else {
    // what if the user didn't exist before..
    const newUser = await new User({
      email,
      name: email.split("@")[0],
      picture,
    }).save();
    console.log("USER CREATED", newUser);
    res.json(newUser);
  }
};

exports.currentUser = async (req, res) => {
  // from the firebase we'll check users email
  User.findOne({ email: req.user.email }).exec((err, user) => {
    if (err) throw new Error(err);
    //  send the user as a response
    res.json(user);
  });
};
