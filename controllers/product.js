const Product = require("../models/product");
const slugify = require("slugify");
const User = require("../models/user");
const product = require("../models/product");

exports.create = async (req, res) => {
  try {
    console.log(req.body);
    req.body.slug = slugify(req.body.title);
    const newProduct = await new Product(req.body).save();
    res.json(newProduct);
  } catch (err) {
    console.log(err);
    // res.send(400).send('Create product failed');
    res.status(400).json({ err: err.message });
  }
};

exports.listAll = async (req, res) => {
  let products = await Product.find({})
    .limit(parseInt(req.params.count))
    .populate("category")
    .populate("subs")
    .sort([["createdAt", "desc"]])
    .exec();
  res.json(products);
};

exports.remove = async (req, res) => {
  try {
    const deleted = await Product.findOneAndRemove({
      slug: req.params.slug,
    }).exec();
    res.json(deleted);
  } catch (err) {
    console.log(err);
    return res.status(400).send("Product delete failed");
  }
};

exports.read = async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug })
    .populate("category")
    .populate("subs")
    .exec();
  res.json(product);
};

exports.update = async (req, res) => {
  try {
    if (req.body.title) {
      req.body.slug = slugify(req.body.title);
    }
    const updated = await Product.findOneAndUpdate(
      { slug: req.params.slug },
      req.body,
      { new: true }
    ).exec();
    res.json(updated);
  } catch (err) {
    console.log("PRODUCT UPDATE ERROR", err);
    res.status(400).json({ err: err.message });
  }
};

//without pagination

// exports.list = async (req,res) => {
//     try{
//         //createdAt/updatedAt, desc/asc, 3
//         const {sort,order,limit} = req.body;
//         const products = await Product.find({})
//         .populate('category')
//         .populate('subs')
//         .sort([[sort, order]])
//         .limit(limit)
//         .exec()
//         res.json(products);
//     } catch(err) {
//         console.log(err);
//     }
// }

//with pagination

exports.list = async (req, res) => {
  try {
    //createdAt/updatedAt, desc/asc, 3
    const { sort, order, page } = req.body;
    const currentPage = page || 1;
    const perPage = 6;


    const products = await Product.find({})
    //skip that much amount of cards ... so lets suppose if user 
      .skip((currentPage - 1) * perPage)
      .populate("category")
      .populate("subs")
      .sort([[sort, order]])
      .limit(perPage)
      .exec();
    res.json(products );
  } catch (err) {
    console.log(err);
  }
};

exports.productsCount = async (req, res) => {
  let total = await Product.find({}).estimatedDocumentCount().exec();
  res.json(total);
};

exports.productStar = async (req, res) => {

  // first we need to find the product --->
  const product = await Product.findById(req.params.productId).exec();
  // then we need to find the user 
  const user = await User.findOne({ email: req.user.email }).exec();
  const { star } = req.body;
  //who is updating
  //check if currently logged in user have already added rating to this product
  let existingRatingObject = product.ratings.find(
    (ele) => ele.postedBy.toString() === user._id.toString()
  );
  //if user haven't left rating yet, push it
  if (existingRatingObject === undefined) {
    let ratingAdded = await Product.findByIdAndUpdate(
      product._id,
      {
        $push: { ratings: { star: star, postedBy: user._id } },
      },
      { new: true }
    ).exec();
    console.log("ratingsAdded ", ratingAdded);
    res.json(ratingAdded);
  } else {
    //if user have already left rating, update it
    const ratingUpdated = await Product.updateOne(
      { ratings: { $elemMatch: existingRatingObject } },
      { $set: { "ratings.$.star": star } },
      { new: true }
    ).exec();
    console.log("ratings updated", ratingUpdated);
    res.json(ratingUpdated);
  }
};

exports.listRelated = async (req, res) => {
  const product = await Product.findById(req.params.productId).exec();
  const related = await Product.find({
    _id: { $ne: product._id },
    category: product.category,
  })
    .limit(4)
    .populate("category")
    .populate("subs")
    .populate({
      path: "ratings",
      populate: {
        path: "postedBy",
        model: "User",
      },
    })
    .exec();
  res.json(related);
};

//SEARCH FILTER

const handleQuery = async (req, res, query) => {
  const products = await Product.find({ $text: { $search: query } })
    .populate("category", "_id name")
    .populate("subs", "_id name")
    .populate({
      path: "ratings",
      populate: {
        path: "postedBy",
        model: "User",
      },
    })
    .exec();

  res.json(products);
};

const handlePrice = async (req, res, price) => {
  try {
    let products = await Product.find({
      price: {
        $gte: price[0],
        $lte: price[1],
      },
    })
      .populate("category", "_id name")
      .populate("subs", "_id name")
      .populate({
        path: "ratings",
        populate: {
          path: "postedBy",
          model: "User",
        },
      })
      .exec();
    res.json(products);
  } catch (err) {
    console.log(err);
  }
};

const handleCategory = async (req, res, category) => {
  // console.log(category);  -->  just for checking purpose 

  try {
    let products = await Product.find({ category })
      .populate("category", "_id name")
      .populate("subs", "_id name")
      .populate({
        path: "ratings",
        populate: {
          path: "postedBy",
          model: "User",
        },
      }) 
      .exec();

    res.json(products);
  } catch (err) {
    console.log(err);
  }
};

const handleStar = async (req, res, stars) => {
  Product.aggregate([
    {
      $project: {
        title: '$title',
        description: '$description',
        document: "$$ROOT",
        floorAverage: {
          $floor: { $avg: "$ratings.star" },
        },
      },
    },
    { $match: { floorAverage: stars } },
  ])
    .limit(12)
    .exec((err, aggregates) => {
      if (err) console.log("aGGREGATES ERROR", err);
      Product.find({ _id: aggregates })
        .populate("category", "_id name")
        .populate("subs", "_id name")
        .populate({
          path: "ratings",
          populate: {
            path: "postedBy",
            model: "User",
          },
        })
        .exec((err, products) => {
          if (err) console.log("PRODUCT AGGREGATE ERROR", err);
          res.json(products);
        });
    });
};

const handleSub = async (req, res, sub) => {
  const products = await product
    .find({ subs: sub })
    .populate("category", "_id name")
    .populate("subs", "_id name")
    .populate({
      path: "ratings",
      populate: {
        path: "postedBy",
        model: "User",
      },
    })
    .exec();
  res.json(products);
};

const handleShipping = async (req, res, shipping) => {
  const products = await product
    .find({ shipping })
    .populate("category", "_id name")
    .populate("subs", "_id name")
    .populate({
      path: "ratings",
      populate: {
        path: "postedBy",
        model: "User",
      },
    })
    .exec();
  res.json(products);
};

const handleColor = async (req, res, color) => {
  const products = await product
    .find({ color })
    .populate("category", "_id name")
    .populate("subs", "_id name")
    .populate({
      path: "ratings",
      populate: {
        path: "postedBy",
        model: "User",
      },
    })
    .exec();
  res.json(products);
};

const handleBrand = async (req, res, brand) => {
  const products = await product
    .find({ brand })
    .populate("category", "_id name")
    .populate("subs", "_id name")
    .populate({
      path: "ratings",
      populate: {
        path: "postedBy",
        model: "User",
      },
    })
    .exec();
  res.json(products);
};

exports.searchFilters = async (req, res) => {
  const { query, price, category, stars, sub, shipping, color, brand } =
    req.body;
  
  if (query) {
    console.log("query ", query);
    await handleQuery(req, res, query);
  }
  // price [200,5000]
  if (price) {
    console.log("price ", price);
    await handlePrice(req, res, price);
  }

  if (category) {
    console.log("category ", category);
    await handleCategory(req, res, category);
  }

  if (stars) {
    console.log("stars ", stars);
    await handleStar(req, res, stars);
  }

  if (sub) {
    console.log("sub ", sub);
    await handleSub(req, res, sub);
  }

  if (shipping) {
    console.log("shipping ", shipping);
    await handleShipping(req, res, shipping);
  }

  if (color) {
    console.log("color ", color);
    await handleColor(req, res, color);
  }

  if (brand) {
    console.log("brand ", brand);
    await handleBrand(req, res, brand);
  }
};
