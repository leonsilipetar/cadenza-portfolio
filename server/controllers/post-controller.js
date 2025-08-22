const { Post, Mentor, User, School, sequelize } = require('../models'); // Import necessary models and sequelize
const asyncWrapper = require('../middleware/asyncWrapper');
const { Op } = require('sequelize');
const { createPostNotification } = require('./notification-controller');

exports.createPost = asyncWrapper(async (req, res) => {
  const { title, content, visibility, showAllSchools } = req.body;

  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  const authorId = req.user.id; // Use sequelize 'id' instead of MongoDB '_id'
  const mentor = await Mentor.findOne({ where: { id: authorId } });

  if (!mentor) {
    return res.status(403).json({ message: 'Only mentors can create posts' });
  }

  const post = await Post.create({
    title,
    content,
    mentorId: authorId, // Use mentorId instead of author
    visibility,
    schoolId: mentor.schoolId, // Assuming mentor has a schoolId
    showAllSchools
  });

  // Fetch the created post with author details
  const postWithAuthor = await Post.findByPk(post.id, {
    include: [{
      model: Mentor,
      as: 'author',  // Use 'author' instead of 'mentor'
      attributes: ['id', 'korisnickoIme', 'ime', 'prezime']
    }]
  });

  // Pass the complete post object to ensure proper notification targeting
  await createPostNotification(postWithAuthor, mentor);

  res.status(201).json(postWithAuthor);
});

exports.getPosts = asyncWrapper(async (req, res, next) => {
  // First check if user exists
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  // Destructure with defaults to prevent undefined errors
  const {
    isAdmin = false,
    isMentor = false,
    schoolId = null
  } = req.user;

  let whereClause = {
    active: true
  };

  // Handle visibility permissions
  let visibilityOptions = ['public'];
  if (isAdmin) visibilityOptions.push('admin');
  if (isMentor) visibilityOptions.push('mentor');

  whereClause.visibility = { [Op.in]: visibilityOptions };

  // Handle school-specific posts
  if (!isAdmin && schoolId) {
    whereClause[Op.or] = [
      { schoolId },
      { showAllSchools: true }
    ];
  }

  const posts = await Post.findAll({
    where: whereClause,
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: Mentor,
        as: 'author',
        attributes: ['id', 'korisnickoIme', 'ime', 'prezime']
      },
      {
        model: School,
        as: 'school',
        attributes: ['id', 'name']
      }
    ]
  });

  return res.json({ posts });
});

exports.getMyPosts = asyncWrapper(async (req, res) => {
  const posts = await Post.findAll({
    where: { mentorId: req.user.id },
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: Mentor,
        as: 'author',  // Use 'author' instead of 'mentor'
        attributes: ['id', 'korisnickoIme', 'ime', 'prezime']
      },
      {
        model: School,
        as: 'school',
        attributes: ['name']
      }
    ]
  });

  res.json({ posts: posts || [] });
});

exports.updatePost = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const { title, content, visibility, showAllSchools } = req.body;

  console.log('Updating post with ID:', id);
  console.log('Request body:', req.body);

  // Find the post by ID
  const post = await Post.findByPk(id);

  if (!post) {
    console.log('Post not found with ID:', id);
    return res.status(404).json({ message: 'Post not found' });
  }

  // Check if the user is authorized to update this post
  if (post.mentorId !== req.user.id) {
    console.log('Unauthorized update attempt. Post mentorId:', post.mentorId, 'User id:', req.user.id);
    return res.status(403).json({ message: 'You are not authorized to update this post' });
  }

  // Update the post
  await post.update({
    title,
    content,
    visibility,
    showAllSchools,
    updatedAt: new Date()
  });

  // Fetch the updated post with associations
  const updatedPost = await Post.findByPk(post.id, {
    include: [
      {
        model: Mentor,
        as: 'author',
        attributes: ['id', 'korisnickoIme', 'ime', 'prezime']
      },
      {
        model: School,
        as: 'school',
        attributes: ['id', 'name']
      }
    ]
  });

  console.log('Post updated successfully');

  const creator = req.user.role === 'mentor' 
    ? await Mentor.findByPk(req.user.id)
    : await User.findByPk(req.user.id);
  
  await createPostNotification(updatedPost, creator);

  res.json(updatedPost);
});

exports.deletePost = asyncWrapper(async (req, res) => {
  const { id } = req.params;

  const post = await Post.findOne({
    where: { id, mentorId: req.user.id }
  });

  if (!post) {
    return res.status(404).json({ message: 'Post not found or unauthorized' });
  }

  await post.destroy();

  res.json({ message: 'Post deleted successfully' });
});