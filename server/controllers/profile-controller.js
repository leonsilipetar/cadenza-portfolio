const { User, Mentor } = require('../models');
const multer = require('multer');
const sharp = require('sharp');

// Configure multer for memory storage
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit (we'll resize to stay under 2MB)
  }
}).single('profilePicture');

// Helper function to process image
async function processImage(buffer) {
  // Resize and compress image to ensure it's under 2MB
  const processedImage = await sharp(buffer)
    .resize(400, 400, { // Reasonable size for profile pictures
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 80 }) // Good balance of quality and size
    .toBuffer();

  return processedImage.toString('base64');
}

// Upload profile picture
const uploadProfilePicture = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ 
      success: false, 
      message: 'No file uploaded' 
    });
  }

  try {
    const base64Image = await processImage(req.file.buffer);
    const Model = req.user.isMentor ? Mentor : User;
    
    await Model.update({
      profilePicture: {
        data: base64Image,
        contentType: 'image/jpeg',
        originalName: req.file.originalname
      }
    }, {
      where: { id: req.user.id }
    });

    res.json({ 
      success: true, 
      message: 'Profile picture updated successfully' 
    });
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing image' 
    });
  }
};

// Get profile picture
const getProfilePicture = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Try User model first
    let user = await User.findByPk(userId, {
      attributes: ['profilePicture']
    });

    // If not found in User, try Mentor
    if (!user) {
      user = await Mentor.findByPk(userId, {
        attributes: ['profilePicture']
      });
    }

    if (!user || !user.profilePicture) {
      return res.status(404).json({ 
        success: false, 
        message: 'Profile picture not found' 
      });
    }

    res.json({ 
      success: true, 
      profilePicture: user.profilePicture 
    });
  } catch (error) {
    console.error('Error fetching profile picture:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching profile picture' 
    });
  }
};

// Delete profile picture
const deleteProfilePicture = async (req, res) => {
  try {
    const Model = req.user.isMentor ? Mentor : User;
    
    await Model.update({
      profilePicture: null
    }, {
      where: { id: req.user.id }
    });

    res.json({ 
      success: true, 
      message: 'Profile picture deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting profile picture:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting profile picture' 
    });
  }
};

module.exports = {
  uploadProfilePicture,
  getProfilePicture,
  deleteProfilePicture
}; 