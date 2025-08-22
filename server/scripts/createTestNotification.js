const { Mentor, Notification } = require('../models');

const createTestNotification = async () => {
  try {
    const mentor = await Mentor.findOne({ where: { isAdmin: true } });

    if (!mentor) {
      console.error('No admin mentor found');
      return;
    }

    const notification = await Notification.create({
      mentorId: mentor.id,  // Use mentorId instead of userId
      senderId: mentor.id,
      senderType: 'mentor', // Specify the sender type
      title: 'Test Notification',
      message: 'This is a test notification',
      type: 'test',
      read: false
    });

    console.log('Test notification created successfully:', notification.toJSON());
  } catch (error) {
    console.error('Error creating test notification:', error);
  } finally {
    process.exit();
  }
};

// Run the function
createTestNotification();